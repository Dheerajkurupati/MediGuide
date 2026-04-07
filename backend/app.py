# MediGuide Hospital — Flask Backend
# Handles: Gmail SMTP emails + Supabase operations + MediGuide chatbot
#
# Routes:
#   POST /api/send-otp           → Generate OTP, save to reset_password, email it
#   POST /api/send-status-email  → Update appointment status, email patient, log to appointment_emails
#   POST /chat                   → MediGuide chatbot triage endpoint
#   GET  /api/health             → Health check

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import smtplib
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import os

from chatbot_engine import TriageBot

# ── Indian Standard Time (IST = UTC+5:30) ─────────────────────
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Returns current datetime in IST timezone."""
    return datetime.now(IST)

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:4173"])

FLASK_PORT = 5050

# ── MediGuide Chatbot ─────────────────────────────────────────
SESSION_MAX  = 500   # max concurrent sessions kept in RAM
CHATBOT_NAME = "MediGuide"
DISCLAIMER   = (
    "ℹ️ **Disclaimer:** This guidance is for informational purposes only and does not replace "
    "professional medical consultation. Always consult with a qualified healthcare provider for medical advice."
)

bot      = TriageBot()
sessions = {}

# ── Supabase ──────────────────────────────────────────────────
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# ── Gmail SMTP ────────────────────────────────────────────────
GMAIL_USER     = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
HOSPITAL_NAME  = "CityCare Hospital"


# ═══════════════════════════════════════════════════════════════
# EMAIL SENDER
# ═══════════════════════════════════════════════════════════════

def send_email(to_email, subject, html_body):
    """Send HTML email via Gmail SMTP SSL."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{HOSPITAL_NAME} <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# EMAIL TEMPLATES
# ═══════════════════════════════════════════════════════════════

def otp_template(otp_code):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }}
        .wrapper {{ max-width: 520px; margin: 0 auto; background: white; border-radius: 16px;
                    overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #020617, #1e1b4b, #4338ca);
                   padding: 32px 24px; text-align: center; color: white; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
        .header p  {{ margin: 6px 0 0; opacity: 0.8; font-size: 13px; }}
        .body {{ padding: 36px 32px; }}
        .body h2 {{ font-size: 18px; color: #1e293b; margin: 0 0 12px; }}
        .body p  {{ color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }}
        .otp-box {{ background: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 12px;
                    padding: 20px; text-align: center; margin: 24px 0; }}
        .otp-code {{ font-size: 40px; font-weight: 800; color: #4338ca; letter-spacing: 10px;
                     font-family: monospace; }}
        .otp-note {{ font-size: 12px; color: #94a3b8; margin-top: 8px; }}
        .warning {{ background: #fef9c3; border-left: 4px solid #f59e0b; border-radius: 8px;
                    padding: 12px 16px; color: #78350f; font-size: 13px; margin-top: 8px; }}
        .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;
                   text-align: center; color: #94a3b8; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🏥 {HOSPITAL_NAME}</h1>
          <p>Patient Portal — Password Reset</p>
        </div>
        <div class="body">
          <h2>Your Password Reset Code</h2>
          <p>We received a request to reset your password. Use the code below to proceed.</p>
          <div class="otp-box">
            <div class="otp-code">{otp_code}</div>
            <div class="otp-note">⏱ Expires in 10 minutes</div>
          </div>
          <div class="warning">
            ⚠️ Do not share this code with anyone. {HOSPITAL_NAME} staff will never ask for your OTP.
          </div>
          <p style="margin-top:20px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          © 2025 {HOSPITAL_NAME} &nbsp;|&nbsp; This is an automated email, please do not reply.
        </div>
      </div>
    </body>
    </html>
    """


def appointment_status_template(patient_name, doctor_name, date, time_slot, booking_id, status, doctor_note=""):
    is_accepted  = status == "accepted"
    is_cancelled = status == "cancelled"
    is_rejected  = status == "rejected"

    # Colours per status
    if is_accepted:
        status_color, status_bg, status_border = "#065f46", "#d1fae5", "#6ee7b7"
        status_text = "✅ Confirmed"
        heading     = "Your Appointment is Confirmed!"
        message     = f"Great news! {doctor_name} has accepted your appointment request. Please arrive 10 minutes early."
    elif is_cancelled:
        status_color, status_bg, status_border = "#92400e", "#fef3c7", "#fde68a"
        status_text = "⚠️ Cancelled"
        heading     = "Your Appointment has been Cancelled"
        message     = f"We're sorry to inform you that your appointment has been cancelled."
    else:  # rejected
        status_color, status_bg, status_border = "#991b1b", "#fee2e2", "#fca5a5"
        status_text = "❌ Declined"
        heading     = "Your Appointment was Declined"
        message     = f"We're sorry, {doctor_name} has declined your appointment request."

    note_section = ""
    if doctor_note and not is_accepted:
        note_section = f"""
        <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:8px;
                    padding:12px 16px;margin:16px 0;color:#78350f;font-size:13px;">
          <strong>Note:</strong> {doctor_note}
        </div>"""

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }}
        .wrapper {{ max-width: 560px; margin: 0 auto; background: white; border-radius: 16px;
                    overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #020617, #1e1b4b, #4338ca);
                   padding: 32px 24px; text-align: center; color: white; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
        .header p  {{ margin: 6px 0 0; opacity: 0.8; font-size: 13px; }}
        .body {{ padding: 36px 32px; }}
        .body h2 {{ font-size: 20px; color: #1e293b; margin: 0 0 10px; }}
        .body p  {{ color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 20px; }}
        .status-badge {{ display:inline-block; padding: 8px 20px; border-radius: 20px; font-weight: 700;
                         font-size: 14px; background: {status_bg}; color: {status_color};
                         border: 1px solid {status_border}; margin-bottom: 24px; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .details-table td {{ padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }}
        .details-table td:first-child {{ color: #64748b; font-weight: 500; width: 40%; }}
        .details-table td:last-child {{ color: #1e293b; font-weight: 600; }}
        .booking-id {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                       padding: 10px 16px; font-family: monospace; font-size: 13px;
                       color: #64748b; margin-top: 8px; }}
        .footer {{ background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;
                   text-align: center; color: #94a3b8; font-size: 12px; }}
        .footer a {{ color: #4338ca; text-decoration: none; }}
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🏥 {HOSPITAL_NAME}</h1>
          <p>Appointment Update</p>
        </div>
        <div class="body">
          <div class="status-badge">{status_text}</div>
          <h2>{heading}</h2>
          <p>Dear {patient_name},<br>{message}</p>
          {note_section}
          <table class="details-table">
            <tr><td>Doctor</td><td> {doctor_name}</td></tr>
            <tr><td>Date</td><td>{date}</td></tr>
            <tr><td>Time</td><td>{time_slot}</td></tr>
            <tr><td>Status</td><td>{status_text}</td></tr>
          </table>
          <div class="booking-id">Booking ID: {booking_id}</div>
          {"<p style='margin-top:20px;color:#64748b;font-size:13px;'>You can book a new appointment anytime through our patient portal.</p>" if not is_accepted else ""}
        </div>
        <div class="footer">
          © 2025 {HOSPITAL_NAME} &nbsp;|&nbsp; This is an automated email, please do not reply.
        </div>
      </div>
    </body>
    </html>
    """


# ═══════════════════════════════════════════════════════════════
# ROUTE 1 — SEND OTP
# ═══════════════════════════════════════════════════════════════

@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    data  = request.json or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    # 1. Check email exists in login table
    result = supabase.table("login").select("id").eq("email", email).maybe_single().execute()
    if not result.data:
        return jsonify({"success": False, "message": "No account found with this email address."}), 404

    # 2. Generate 6-digit OTP
    otp        = str(random.randint(100000, 999999))
    expires_at = (get_ist_now() + timedelta(minutes=10)).isoformat()

    # 3. Delete any existing OTPs for this email
    supabase.table("reset_password").delete().eq("email", email).execute()

    # 4. Save new OTP to reset_password table
    insert_result = supabase.table("reset_password").insert({
        "email": email, "otp": otp, "expires_at": expires_at
    }).execute()

    if not insert_result.data:
        return jsonify({"success": False, "message": "Failed to generate OTP. Please try again."}), 500

    # 5. Get patient name for email personalisation
    patient = supabase.table("sign_in").select("name").eq("email", email).maybe_single().execute()
    patient_name = patient.data.get("name", "Patient") if patient.data else "Patient"

    # 6. Send OTP email
    sent = send_email(
        to_email  = email,
        subject   = f"Your {HOSPITAL_NAME} Password Reset Code",
        html_body = otp_template(otp)
    )

    if not sent:
        return jsonify({"success": False, "message": "Failed to send OTP email. Please try again."}), 500

    return jsonify({"success": True, "message": "OTP sent to your email address."})


# ═══════════════════════════════════════════════════════════════
# ROUTE 2 — SEND APPOINTMENT STATUS EMAIL
# ═══════════════════════════════════════════════════════════════

@app.route("/api/send-status-email", methods=["POST"])
def send_status_email():
    data          = request.json or {}
    appointment_id = data.get("appointmentId")
    action         = data.get("action")       # "accepted" | "rejected"
    doctor_note    = data.get("doctorNote", "")
    doctor_name    = data.get("doctorName", "")

    if not appointment_id or action not in ("accepted", "rejected", "cancelled"):
        return jsonify({"success": False, "message": "Invalid request. Action must be accepted, rejected, or cancelled."}), 400

    # 1. Fetch appointment from Supabase
    appt_res = supabase.table("appointments").select("*").eq("id", appointment_id).maybe_single().execute()
    if not appt_res.data:
        return jsonify({"success": False, "message": "Appointment not found."}), 404

    appt = appt_res.data

    # 2. Validate — block terminal states only
    current_status = appt.get("status")
    TERMINAL = ("completed", "cancelled", "rejected", "expired")
    if current_status in TERMINAL:
        return jsonify({
            "success": False,
            "message": f"Cannot change a '{current_status}' appointment."
        }), 400

    # 3. Update appointment status in Supabase
    patch = {"status": action, "updated_at": get_ist_now().isoformat()}
    if doctor_note:
        patch["cancel_reason"] = doctor_note
    if action == "cancelled":
        patch["cancelled_at"] = get_ist_now().isoformat()
        if not doctor_note:
            patch["cancel_reason"] = "Cancelled by admin"
    supabase.table("appointments").update(patch).eq("id", appointment_id).execute()

    # 4. Get patient email — use stored patient_email first, fallback to sign_in lookup
    patient_email = appt.get("patient_email", "").strip()
    patient_name  = appt.get("patient_name", "Patient")

    if not patient_email:
        patient_res = supabase.table("sign_in").select("name, email").eq("id", appt["user_id"]).maybe_single().execute()
        if not patient_res.data:
            return jsonify({"success": False, "message": "Patient not found."}), 404
        patient_email = patient_res.data.get("email", "")
        patient_name  = patient_res.data.get("name", "Patient")

    # 4b. Get exactly the right doctor name from DB (bulletproof fix)
    doctor_res = supabase.table("doctors").select("name").eq("id", appt.get("doctor_id")).maybe_single().execute()
    final_doctor_name = doctor_res.data.get("name", doctor_name) if doctor_res.data else doctor_name
    if not final_doctor_name:
        final_doctor_name = "Your Doctor"

    # 5. Save record to appointment_emails table
    supabase.table("appointment_emails").insert({
        "patient_name":     patient_name,
        "patient_email":    patient_email,
        "doctor_name":      final_doctor_name,
        "appointment_date": appt.get("date", ""),
        "time_slot":        appt.get("time_slot", ""),
        "booking_id":       appt.get("id", ""),
        "status":           action,
    }).execute()

    # 6. Send email to patient
    subject = (
        f"Appointment Confirmed — {HOSPITAL_NAME}"
        if action == "accepted"
        else f"Appointment Update — {HOSPITAL_NAME}"
    )
    sent = send_email(
        to_email  = patient_email,
        subject   = subject,
        html_body = appointment_status_template(
            patient_name = patient_name,
            doctor_name  = final_doctor_name,
            date         = appt.get("date", ""),
            time_slot    = appt.get("time_slot", ""),
            booking_id   = appt.get("id", ""),
            status       = action,
            doctor_note  = doctor_note
        )
    )

    if not sent:
        # Status was updated but email failed — still return success for DB, warn about email
        return jsonify({
            "success": True,
            "emailSent": False,
            "message": "Status updated but email could not be sent."
        })

    return jsonify({"success": True, "emailSent": True})


# ═══════════════════════════════════════════════════════════════
# ROUTE 3 — MEDIGUIDE CHATBOT
# ═══════════════════════════════════════════════════════════════

@app.route("/chat", methods=["POST"])
def chat():
    data    = request.json or {}
    user_id = data.get("user_id", "default_user")
    message = (data.get("message") or "").strip()

    # --- Session cleanup: remove sessions idle > 30 min ---
    cutoff  = time.time() - 1800
    expired = [k for k, v in sessions.items() if v.get("last_active", 0) < cutoff]
    for k in expired:
        del sessions[k]

    # --- Session cap: evict oldest if limit exceeded ---
    if len(sessions) > SESSION_MAX:
        oldest = sorted(sessions.items(), key=lambda x: x[1].get("last_active", 0))
        for k, _ in oldest[:len(sessions) - SESSION_MAX]:
            del sessions[k]

    # Initialise session for new user
    if user_id not in sessions:
        sessions[user_id] = {
            "step": "START",
            "symptom": None,
            "duration": None,
            "severity": None,
            "severity_score": None,
            "answers": [],
            "disclaimer_shown": False,
            "last_active": time.time()
        }

    sessions[user_id]["last_active"] = time.time()
    state = sessions[user_id]

    # === EMERGENCY CHECK (highest priority) ===
    if state["step"] == "START":
        is_emergency, emergency_msg = bot.detect_emergency(message)
    else:
        is_emergency, emergency_msg = bot.detect_emergency_critical(message)

    if is_emergency:
        sessions[user_id] = {
            "step": "COMPLETED",
            "symptom": None, "duration": None, "severity": None,
            "severity_score": None, "answers": [],
            "disclaimer_shown": True, "last_active": time.time()
        }
        return jsonify({"reply": emergency_msg, "decision": "EMERGENCY", "options": ["Start Over"]})

    # === GREETING DETECTION ===
    if bot.detect_greeting(message) and state["step"] == "START":
        return jsonify({
            "reply": (
                f"Hello! I'm **{CHATBOT_NAME}**, your Hospital Guidance Assistant. 🏥\n\n"
                "I'm here to help guide you based on your symptoms. "
                "Please describe the main problem or symptom you are experiencing."
            ),
            "options": []
        })

    # === RESTART AFTER COMPLETION ===
    if state["step"] == "COMPLETED":
        if any(word in message.lower() for word in ["start", "new", "hi", "hello", "restart"]):
            sessions[user_id] = {
                "step": "START",
                "symptom": None, "duration": None, "severity": None,
                "severity_score": None, "answers": [], "disclaimer_shown": False,
                "last_active": time.time()
            }
            return jsonify({
                "reply": (
                    f"Hello! I'm **{CHATBOT_NAME}**, your Hospital Guidance Assistant. 🏥\n\n"
                    "How can I help you today? Please describe your symptoms."
                ),
                "options": []
            })
        return jsonify({
            "reply": "I'm here if you need anything else. You can say 'Start Over' to begin a new assessment.",
            "options": ["Start Over"]
        })

    # === STEP 1: SYMPTOM COLLECTION ===
    if state["step"] == "START":
        symptoms_found = bot.extract_symptoms(message)
        if symptoms_found:
            symptom = symptoms_found[0]
            state["symptom"] = symptom
            state["step"]    = "DURATION"
            symptom_display  = symptom.replace("_", " ").title()
            return jsonify({
                "reply": (
                    f"I understand you're experiencing **{symptom_display}**. "
                    f"How long have you been experiencing this symptom?"
                ),
                "options": []
            })
        return jsonify({
            "reply": (
                "I'm sorry, I didn't quite catch that. Could you describe your symptom more specifically?\n\n"
                "*(For example: 'I have a headache', 'My stomach hurts', or 'I have a cough')*"
            ),
            "options": []
        })

    # === STEP 2: DURATION ===
    if state["step"] == "DURATION":
        duration_info = bot.extract_duration(message)
        if duration_info == (None, None):
            return jsonify({
                "reply": "I couldn't quite catch that. Could you tell me how long you've been experiencing this symptom? For example, the number of hours or days.",
                "options": []
            })
        state["duration"] = duration_info
        state["step"]     = "SEVERITY"
        return jsonify({"reply": "Thank you. How would you describe the severity of your symptom?", "options": []})

    # === STEP 3: SEVERITY ===
    if state["step"] == "SEVERITY":
        severity_data = bot.extract_severity(message)
        if severity_data is None:
            return jsonify({
                "reply": "I didn't quite catch that. Could you describe how severe it is? You can use words like mild, moderate, or severe, or give a number from 1 to 10.",
                "options": []
            })
        severity_label, severity_score = severity_data
        state["severity"]       = severity_label
        state["severity_score"] = severity_score
        state["step"]           = "FOLLOW_UP_Q1"
        questions = bot.symptoms_data[state["symptom"]]["questions"]
        return jsonify({
            "reply": f"Understood, thank you. Now, I have a few more questions to better assess your situation.\n\n{questions[0]}",
            "options": [], "question_num": 1, "question_total": len(questions)
        })

    # === STEP 4-N: FOLLOW-UP QUESTIONS ===
    symptom   = state["symptom"]
    questions = bot.symptoms_data[symptom]["questions"]

    if state["step"].startswith("FOLLOW_UP_Q"):
        current_q_index   = len(state["answers"])
        current_question  = questions[current_q_index]
        YES_NO_TRIGGERS   = ["are you", "do you", "can you", "have you", "did you", "is there", "is it"]
        is_yes_no_q       = "?" in current_question and any(
            t in current_question.lower() for t in YES_NO_TRIGGERS
        )
        if is_yes_no_q:
            yes_no = bot.nlp.extract_yes_no(message.lower())
            if yes_no is None:
                return jsonify({
                    "reply": f"Could you please answer with Yes or No?\n\n{current_question}",
                    "options": []
                })
        state["answers"].append(message)
        current_q_num = len(state["answers"])

        if current_q_num < len(questions):
            state["step"] = f"FOLLOW_UP_Q{current_q_num + 1}"
            return jsonify({
                "reply": questions[current_q_num], "options": [],
                "question_num": current_q_num + 1, "question_total": len(questions)
            })

        # === FINAL ML CLASSIFICATION ===
        yes_no_answers = [
            state["answers"][i]
            for i, q in enumerate(questions)
            if i < len(state["answers"]) and "?" in q
            and any(t in q.lower() for t in YES_NO_TRIGGERS)
        ]
        result = bot.classify_issue_ml(
            symptom          = symptom,
            duration_info    = state["duration"],
            severity_data    = (state["severity"], state["severity_score"]),
            follow_up_answers = yes_no_answers
        )
        state["step"] = "COMPLETED"

        final_msg = result["message"]
        if result["decision"] == "MINOR":
            final_msg += f"\n\n**📋 Home Care Recommendations:**\n{result['home_care']}"
            final_msg += f"\n\n**⚠️ Warning Signs - Seek Care If:**\n{result['warning_signs']}"
        if not state["disclaimer_shown"]:
            final_msg += f"\n\n{DISCLAIMER}"
            state["disclaimer_shown"] = True
        final_msg += "\n\n**I hope you feel better soon!** 🌟"

        response = {
            "reply": final_msg,
            "decision": result["decision"],
            "dept": result.get("dept"),
            "options": ["Start Over"]
        }
        if result["decision"] == "CONSULTATION":
            try:
                dept_name = result.get("dept", "")
                doc_res = supabase.table("doctors") \
                    .select("name, designation") \
                    .eq("specialization", dept_name) \
                    .eq("is_active", True) \
                    .limit(2) \
                    .execute()
                response["doctors"] = [
                    {"name": d["name"], "specialization": d.get("designation", dept_name)}
                    for d in (doc_res.data or [])
                ]
            except Exception as e:
                print(f"[CHATBOT] Supabase doctor fetch error: {e}")
                response["doctors"] = []
        return jsonify(response)

    return jsonify({"reply": "Something went wrong. Please say 'Start Over' to begin again.", "options": ["Start Over"]})


# ═══════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": f"{HOSPITAL_NAME} Email API", "chatbot": CHATBOT_NAME})


if __name__ == "__main__":
    print(f"Starting {HOSPITAL_NAME} Email Backend on port {FLASK_PORT}...")
    app.run(debug=True, port=FLASK_PORT)
