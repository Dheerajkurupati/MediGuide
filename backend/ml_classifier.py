"""
ML Classifier for MediGuide Chatbot
Uses Machine Learning to classify patient issues into: Minor, Consultation Required, or Emergency
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pickle
import os
import json

class MLClassifier:
    def __init__(self):
        """Initialize ML classifier"""
        self.model = None
        self.scaler = None
        _base = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(_base, 'models', 'triage_model.pkl')
        self.scaler_path = os.path.join(_base, 'models', 'scaler.pkl')

        # Load symptoms data for criticality scores
        data_path = os.path.join(_base, 'data', 'symptoms.json')
        with open(data_path, 'r') as f:
            self.symptoms_data = json.load(f)

        # Create models directory if it doesn't exist
        models_dir = os.path.join(_base, 'models')
        if not os.path.exists(models_dir):
            os.makedirs(models_dir)
        
        # Load or train model
        if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
            self.load_model()
        else:
            self.train_model()
        
    def create_training_data(self):
        """
        Create synthetic training data based on a weighted urgency_score.
        urgency_score = severity(40%) + red_flags(30%) + duration(20%) + criticality(10%)
        Score range 0-10:
            < 3.5  -> MINOR (0)
            3.5-6.5 -> CONSULTATION (1)
            > 6.5  -> EMERGENCY (2)
        """
        X = []
        y = []

        # --- MINOR (Label 0): urgency_score 0 – 3.4 ---
        for _ in range(350):
            severity     = np.random.uniform(1, 4)      # mild (1-4)
            red_flags    = 0
            duration_sc  = np.random.uniform(0, 4)      # short duration
            criticality  = np.random.uniform(1, 6)
            score = severity*0.40 + red_flags*10*0.30 + duration_sc*0.20 + criticality*0.10
            X.append([score])
            y.append(0)

        # --- CONSULTATION (Label 1): urgency_score 3.5 – 6.5 ---
        for _ in range(270):
            severity     = np.random.uniform(3, 7)      # mild-moderate
            red_flags    = np.random.choice([0, 1], p=[0.6, 0.4])
            duration_sc  = np.random.uniform(2, 8)
            criticality  = np.random.uniform(3, 8)
            score = severity*0.40 + red_flags*10*0.30 + duration_sc*0.20 + criticality*0.10
            X.append([score])
            y.append(1)

        # --- EMERGENCY (Label 2): urgency_score > 6.5 ---
        for _ in range(250):
            severity     = np.random.uniform(6, 10)     # severe
            red_flags    = np.random.choice([0, 1], p=[0.2, 0.8])
            duration_sc  = np.random.uniform(3, 10)
            criticality  = np.random.uniform(6, 10)
            score = severity*0.40 + red_flags*10*0.30 + duration_sc*0.20 + criticality*0.10
            X.append([score])
            y.append(2)

        return np.array(X), np.array(y)

    def train_model(self):
        """Train the Random Forest classifier"""
        print("Training ML model...")
        
        # Create training data
        X, y = self.create_training_data()
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Random Forest
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        self.model.fit(X_scaled, y)
        
        # Save model and scaler
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        print(f"Model trained and saved! Accuracy on training data: {self.model.score(X_scaled, y):.2%}")
    
    def load_model(self):
        """Load pre-trained model and scaler"""
        with open(self.model_path, 'rb') as f:
            self.model = pickle.load(f)
        with open(self.scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        print("ML model loaded successfully!")
    
    def predict(self, severity_score, duration_hours, has_red_flags, symptom_key):
        """
        Predict classification using a weighted urgency formula fed into the ML model.

        Weights (clinically motivated):
            severity (patient-reported)  40%
            red flags (follow-up answers) 30%
            duration                     20%
            symptom base criticality     10%

        Returns:
            prediction: 0 (Minor), 1 (Consultation), 2 (Emergency)
            probabilities: Array of probabilities for each class
            confidence: Confidence score (0-1)
        """
        # Get symptom base criticality (now only 10% weight)
        criticality = self.symptoms_data.get(symptom_key, {}).get('criticality', 5)

        # Normalise duration to a 0-10 scale (capped at 2 weeks = 336 hours)
        duration_score = min(10.0, (duration_hours / 336.0) * 10.0)

        # Compute single weighted urgency score
        urgency_score = (
            severity_score        * 0.40 +
            (has_red_flags * 10)  * 0.30 +
            duration_score        * 0.20 +
            criticality           * 0.10
        )

        # Build feature vector (single feature: urgency_score)
        features = np.array([[urgency_score]])
        features_scaled = self.scaler.transform(features)

        # Predict
        prediction    = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        confidence    = float(np.max(probabilities))

        return prediction, probabilities, confidence
    
    def get_classification_name(self, prediction):
        """Convert numeric prediction to classification name"""
        classifications = {
            0: "MINOR",
            1: "CONSULTATION",
            2: "EMERGENCY"
        }
        return classifications.get(prediction, "CONSULTATION")
    
    def convert_duration_to_hours(self, duration_value, duration_unit):
        """Convert duration to hours for ML model"""
        if duration_unit in ['today', 'yesterday']:
            return 12  # Approximate
        
        unit_multipliers = {
            'hours': 1,
            'days': 24,
            'weeks': 168,
            'months': 720
        }
        
        multiplier = unit_multipliers.get(duration_unit, 24)
        return duration_value * multiplier if duration_value else 12
