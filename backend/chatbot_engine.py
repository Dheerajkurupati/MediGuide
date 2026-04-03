"""
MediGuide Chatbot Engine
Enhanced with NLP and ML for intelligent patient triage
"""

import json
import os
import re
from nlp_processor import NLPProcessor
from ml_classifier import MLClassifier

class TriageBot:
    def __init__(self):
        """Initialize MediGuide chatbot with NLP and ML capabilities"""
        _base = os.path.dirname(os.path.abspath(__file__))

        # Load symptom data
        data_path = os.path.join(_base, 'data', 'symptoms.json')
        with open(data_path, 'r') as f:
            self.symptoms_data = json.load(f)

        # Load doctor data
        doc_path = os.path.join(_base, 'data', 'doctors.json')
        with open(doc_path, 'r') as f:
            self.doctors_data = json.load(f)

        # Load precautions data
        precaution_path = os.path.join(_base, 'data', 'precautions.json')
        with open(precaution_path, 'r') as f:
            self.precautions_data = json.load(f)
        
        # Initialize NLP processor
        self.nlp = NLPProcessor()
        
        # Initialize ML classifier
        self.ml_classifier = MLClassifier()
        
        print("✅ MediGuide initialized with NLP and ML capabilities!")
    
    def detect_greeting(self, text):
        """Detect if user input is a greeting"""
        return self.nlp.detect_greeting(text)
    
    def detect_emergency(self, text):
        """
        Scans text for emergency keywords across all symptom categories.
        Returns (True, emergency_message) if emergency detected, else (False, None)
        """
        text = text.lower().strip()
        
        # Check all symptoms for emergency keywords
        for symptom, data in self.symptoms_data.items():
            if "emergency_keywords" in data:
                for keyword in data["emergency_keywords"]:
                    if keyword.lower() in text:
                        return (True, 
                               "⚠️ **This may be a medical emergency.**\n\n"
                               "Based on what you've described, I strongly recommend you **visit the Emergency Department immediately** "
                               "or call emergency services.\n\n"
                               "Please do not delay seeking immediate medical attention.")
        
        # Additional generic emergency patterns
        emergency_patterns = [
            "can't breathe", "cannot breathe", "unable to breathe",
            "chest pain", "heart attack",
            "unconscious", "passed out", "fainted",
            "severe bleeding", "heavy bleeding", "bleeding won't stop",
            "suicidal", "want to die", "end my life"
        ]
        
        for pattern in emergency_patterns:
            if pattern in text:
                return (True, 
                       "⚠️ **This may be a medical emergency.**\n\n"
                       "Based on what you've described, I strongly recommend you **visit the Emergency Department immediately** "
                       "or call emergency services(108).\n\n"
                       "Please do not delay seeking immediate medical attention.")
        
        return (False, None)

    def detect_emergency_critical(self, text):
        """
        Lightweight emergency check used during follow-up questions.
        Only triggers on unmistakable, high-confidence life-threatening phrases
        to avoid false positives from normal follow-up answers.
        """
        CRITICAL_PHRASES = [
            "can't breathe", "cannot breathe", "chest pain", "heart attack",
            "unconscious", "passed out", "not breathing", "severe bleeding",
            "bleeding won't stop", "suicidal", "want to die", "end my life",
            "choking", "blue lips", "paralysis", "seizure"
        ]
        text = text.lower().strip()
        for phrase in CRITICAL_PHRASES:
            if phrase in text:
                return (True,
                        "⚠️ **This may be a medical emergency.**\n\n"
                        "Based on what you've just described, I strongly recommend you "
                        "**visit the Emergency Department immediately** or call emergency services (108).\n\n"
                        "Please do not delay seeking immediate medical attention.")
        return (False, None)

    def extract_symptoms(self, text):
        """Extract symptoms using NLP-enhanced matching"""
        return self.nlp.extract_symptoms_nlp(text)
    
    def extract_duration(self, text):
        """Extract duration using NLP"""
        return self.nlp.extract_duration_nlp(text)
    
    def extract_severity(self, text):
        """
        Extract severity using NLP from natural language
        Returns: ('mild'/'moderate'/'severe', numeric_score)
        """
        return self.nlp.classify_severity_nlp(text)
    
    def classify_issue_ml(self, symptom, duration_info, severity_data, follow_up_answers):
        """
        Classify issue using ML model for intelligent decision making
        Returns dict with decision, message, dept, and optional fields
        """
        severity_label, severity_score = severity_data
        duration_value, duration_unit = duration_info
        dept = self.symptoms_data[symptom]["dept"]
        
        # Convert duration to hours for ML model
        duration_hours = self.ml_classifier.convert_duration_to_hours(duration_value, duration_unit)
        
        # Check for red flags — only look for genuinely concerning keywords in the answer text.
        # We do NOT check yes/no alone because context matters:
        #   "Can you move normally?" → "yes" = GOOD, not a red flag
        #   "Are you coughing blood?" → "no" = fine
        # Keyword evidence is unambiguous regardless of question phrasing.
        CONCERN_KEYWORDS = [
            'blood', 'bleeding', 'severe', 'unbearable', 'worse', 'worsening',
            'can\'t', 'cannot', 'unable', 'paralys', 'collapsed', 'fainted',
            'spreading', 'getting worse', 'much worse', 'really bad'
        ]
        has_red_flags = 0
        for answer in follow_up_answers:
            answer_lower = answer.lower()
            if any(kw in answer_lower for kw in CONCERN_KEYWORDS):
                has_red_flags = 1
                break

        # Use ML model to predict classification
        prediction, probabilities, confidence = self.ml_classifier.predict(
            severity_score=severity_score,
            duration_hours=duration_hours,
            has_red_flags=has_red_flags,
            symptom_key=symptom
        )

        classification = self.ml_classifier.get_classification_name(prediction)

        # Safety override: mild severity (score ≤ 3) should never be EMERGENCY.
        # The ML model is trained on synthetic data and can produce noisy boundaries.
        if severity_score <= 3 and classification == "EMERGENCY":
            classification = "CONSULTATION"

        # Build response based on ML prediction
        if classification == "EMERGENCY":
            return {
                "decision": "EMERGENCY",
                "message": "⚠️ **This requires immediate medical attention.**\n\n"
                          f"Based on your symptoms and my assessment, "
                          "I recommend visiting the **Emergency Department immediately**.",
                "dept": dept,
                "ml_confidence": confidence
            }

        elif classification == "CONSULTATION":
            return {
                "decision": "CONSULTATION",
                "message": f"Based on your responses, "
                          f"I recommend **consulting a specialist** in our **{dept}** department.\n\n"
                          f"You can **book an appointment** through our website's homepage.",
                "dept": dept,
                "ml_confidence": confidence
            }

        else:  # MINOR
            precautions = self.precautions_data.get(symptom, {})
            return {
                "decision": "MINOR",
                "message": f"Based on your responses, "
                          "this appears to be a **minor issue** that can be managed at home for now.",
                "dept": dept,
                "home_care": precautions.get("home_care", "Rest and stay hydrated."),
                "warning_signs": precautions.get("warning_signs", "Monitor your symptoms and seek care if they worsen."),
                "ml_confidence": confidence
            }


    def get_doctors_for_dept(self, dept_name):
        """Returns a list of doctors with details for a department"""
        return self.doctors_data.get(dept_name, [])

    def get_precautions(self, symptom):
        """Returns home care precautions for a symptom"""
        return self.precautions_data.get(symptom, {})