# MediGuide Hospital — Flask Email Backend
# Handles: Gmail SMTP emails + Supabase operations for email flows
#
# Routes:
#   POST /api/send-otp           → Generate OTP, save to reset_password, email it
#   POST /api/send-status-email  → Update appointment status, email patient, log to appointment_emails

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import os

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:4173"])

FLASK_PORT = 5050

# ── Supabase ──────────────────────────────────────────────────
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# ── Gmail SMTP ────────────────────────────────────────────────
GMAIL_USER     = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
HOSPITAL_NAME  = "MediGuide Hospital"


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
    is_accepted = status == "accepted"
    status_color  = "#065f46" if is_accepted else "#991b1b"
    status_bg     = "#d1fae5" if is_accepted else "#fee2e2"
    status_border = "#6ee7b7" if is_accepted else "#fca5a5"
    status_text   = "✅ Confirmed" if is_accepted else "❌ Declined"
    heading       = "Your Appointment is Confirmed!" if is_accepted else "Your Appointment was Declined"
    message       = (
        f"Great news! Dr. {doctor_name} has accepted your appointment request. Please arrive 10 minutes early."
        if is_accepted else
        f"We're sorry, Dr. {doctor_name} has declined your appointment request."
    )

    note_section = ""
    if doctor_note and not is_accepted:
        note_section = f"""
        <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:8px;
                    padding:12px 16px;margin:16px 0;color:#78350f;font-size:13px;">
          <strong>Doctor's Note:</strong> {doctor_note}
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
            <tr><td>Doctor</td><td>Dr. {doctor_name}</td></tr>
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
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

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

    if not appointment_id or action not in ("accepted", "rejected"):
        return jsonify({"success": False, "message": "Invalid request."}), 400

    # 1. Fetch appointment from Supabase
    appt_res = supabase.table("appointments").select("*").eq("id", appointment_id).maybe_single().execute()
    if not appt_res.data:
        return jsonify({"success": False, "message": "Appointment not found."}), 404

    appt = appt_res.data

    # 2. Validate transition: only pending → accepted/rejected
    if appt.get("status") != "pending":
        return jsonify({
            "success": False,
            "message": f"Cannot change a '{appt.get('status')}' appointment to '{action}'."
        }), 400

    # 3. Update appointment status in Supabase
    patch = {"status": action, "updated_at": datetime.now(timezone.utc).isoformat()}
    if doctor_note:
        patch["cancel_reason"] = doctor_note
    supabase.table("appointments").update(patch).eq("id", appointment_id).execute()

    # 4. Get patient email + name from sign_in table
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
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": f"{HOSPITAL_NAME} Email API"})


if __name__ == "__main__":
    print(f"Starting {HOSPITAL_NAME} Email Backend on port {FLASK_PORT}...")
    app.run(debug=True, port=FLASK_PORT)
