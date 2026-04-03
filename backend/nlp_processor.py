"""
NLP Processor for MediGuide Chatbot
Handles natural language understanding for symptom extraction and severity classification
"""

import re
from textblob import TextBlob
import json
import os

class NLPProcessor:
    def __init__(self):
        """Initialize NLP processor with sentiment analysis and pattern matching"""
        # Load symptoms data for keyword matching
        _base = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(_base, 'data', 'symptoms.json')
        with open(data_path, 'r') as f:
            self.symptoms_data = json.load(f)
        
        # Greeting patterns
        self.greeting_patterns = [
            r'\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b',
            r'\b(what\'s up|sup|howdy)\b'
        ]
        
        # Severity mapping patterns
        self.severity_patterns = {
            'severe': [
                'severe', 'terrible', 'unbearable', 'excruciating', 'worst', 'extreme',
                'intense', 'awful', 'horrible', 'agonizing', 'killing me', 'can\'t stand',
                'very bad', 'really bad', 'so much pain', 'too much pain', 'hurts badly',
                'hurts a lot', 'very painful', 'extremely painful'
            ],
            'moderate': [
                'moderate', 'medium', 'uncomfortable', 'significant', 'noticeable',
                'quite bad', 'fairly bad', 'somewhat painful', 'hurts', 'painful',
                'bad', 'annoying', 'bothersome', 'troublesome'
            ],
            'mild': [
                'mild', 'slight', 'light', 'little', 'minor', 'tolerable', 'bearable',
                'not too bad', 'not very bad', 'manageable', 'small', 'less pain',
                'little pain', 'doesn\'t hurt much', 'barely hurts', 'slight discomfort',
                'tiny bit', 'bit of pain', 'little uncomfortable'
            ]
        }
        
        # Duration patterns (enhanced with NLP)
        self.duration_patterns = [
            (r'(\d+)\s*(hour|hours|hr|hrs)', 'hours'),
            (r'(\d+)\s*(day|days)', 'days'),
            (r'(\d+)\s*(week|weeks)', 'weeks'),
            (r'(\d+)\s*(month|months)', 'months'),
            (r'(just now|just started|started today|today|this morning)', 'today'),
            (r'(yesterday|last night)', 'yesterday'),
            (r'(since yesterday|from yesterday)', 'yesterday'),
            (r'(few days|couple days|couple of days)', 'few_days'),
            (r'(few hours|couple hours)', 'few_hours'),
            (r'(long time|while now|quite some time)', 'long_time')
        ]
    
    def detect_greeting(self, text):
        """Detect if the input is a greeting"""
        text = text.lower().strip()
        for pattern in self.greeting_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                # Check if it's ONLY a greeting (not mixed with symptom description)
                # Simple check: if text is short and matches greeting, return True
                if len(text.split()) <= 3:
                    return True
        return False
    
    def extract_symptoms_nlp(self, text):
        """
        Extract symptoms using NLP-enhanced keyword matching
        Returns list of symptom keys found
        """
        text = text.lower().strip()
        found_symptoms = []
        
        # Score-based matching for better accuracy
        symptom_scores = {}
        
        for symptom_key, symptom_data in self.symptoms_data.items():
            score = 0
            keywords = symptom_data.get('keywords', [])
            
            for keyword in keywords:
                if keyword.lower() in text:
                    # Exact match gets higher score
                    if keyword.lower() == text:
                        score += 10
                    # Multi-word match
                    elif ' ' in keyword:
                        score += 5
                    # Single word match
                    else:
                        score += 3
            
            if score > 0:
                symptom_scores[symptom_key] = score
        
        # Return symptoms sorted by score (highest first)
        if symptom_scores:
            sorted_symptoms = sorted(symptom_scores.items(), key=lambda x: x[1], reverse=True)
            found_symptoms = [s[0] for s in sorted_symptoms]
        
        return found_symptoms
    
    def classify_severity_nlp(self, text):
        """
        Classify severity from natural language using NLP
        Returns: 'mild', 'moderate', 'severe', or None
        Also returns a numeric score 1-10
        """
        text = text.lower().strip()
        
        # Check for numeric ratings (1-10)
        number_match = re.search(r'\b(\d+)\b', text)
        if number_match:
            num = int(number_match.group(1))
            if 1 <= num <= 10:
                if num <= 3:
                    return 'mild', num
                elif num <= 6:
                    return 'moderate', num
                else:
                    return 'severe', num
        
        # Check severity patterns
        for severity, patterns in self.severity_patterns.items():
            for pattern in patterns:
                if pattern in text:
                    # Map to numeric score
                    if severity == 'mild':
                        return 'mild', 2
                    elif severity == 'moderate':
                        return 'moderate', 5
                    elif severity == 'severe':
                        return 'severe', 9
        
        # No recognisable severity found — caller will re-ask the user
        return None
    
    def extract_duration_nlp(self, text):
        """
        Extract duration using enhanced NLP patterns
        Returns: (duration_value, duration_unit) or (None, None)
        """
        text = text.lower().strip()
        
        for pattern, unit in self.duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if unit in ['today', 'yesterday']:
                    return (unit, unit)
                elif unit == 'few_days':
                    return (3, 'days')
                elif unit == 'few_hours':
                    return (3, 'hours')
                elif unit == 'long_time':
                    return (4, 'weeks')
                else:
                    try:
                        value = int(match.group(1))
                        return (value, unit)
                    except:
                        continue
        
        return (None, None)
    
    def analyze_text_intensity(self, text):
        """
        Analyze text intensity using sentiment analysis
        Returns a score from 0-10 indicating urgency/severity
        """
        blob = TextBlob(text)
        
        # Sentiment polarity (-1 to 1)
        polarity = blob.sentiment.polarity
        
        # Subjectivity (0 to 1) - how emotional the text is
        subjectivity = blob.sentiment.subjectivity
        
        # Convert to urgency score
        # More negative polarity + higher subjectivity = higher urgency
        urgency_score = (abs(polarity) * 5) + (subjectivity * 5)
        
        return min(10, urgency_score)
    
    def extract_yes_no(self, text):
        """Extract yes/no from natural language"""
        text = text.lower().strip()
        
        yes_patterns = ['yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'right', 'affirmative', 'definitely', 'absolutely']
        no_patterns = ['no', 'nope', 'nah', 'negative', 'don\'t', 'doesn\'t', 'haven\'t', 'hasn\'t']
        
        for pattern in yes_patterns:
            if pattern in text:
                return 'yes'
        
        for pattern in no_patterns:
            if pattern in text:
                return 'no'
        
        return None
