// Chatbot Engine with NLP-like symptom analysis
// This uses rule-based pattern matching and keyword extraction

const symptomDatabase = {
    // Cardiac symptoms
    'chest pain': { severity: 'high', specialization: 'Cardiology', keywords: ['chest', 'pain', 'pressure', 'tight'] },
    'palpitations': { severity: 'medium', specialization: 'Cardiology', keywords: ['palpitations', 'racing heart', 'irregular heartbeat'] },
    'shortness of breath': { severity: 'high', specialization: 'Cardiology', keywords: ['breathless', 'breathing', 'breath', 'dyspnea'] },

    // Neurological symptoms
    'headache': { severity: 'low', specialization: 'Neurology', keywords: ['headache', 'head pain', 'migraine'] },
    'severe headache': { severity: 'high', specialization: 'Neurology', keywords: ['severe headache', 'worst headache', 'sudden headache'] },
    'dizziness': { severity: 'medium', specialization: 'Neurology', keywords: ['dizzy', 'vertigo', 'lightheaded'] },
    'numbness': { severity: 'high', specialization: 'Neurology', keywords: ['numb', 'tingling', 'loss of feeling'] },
    'seizure': { severity: 'high', specialization: 'Neurology', keywords: ['seizure', 'convulsion', 'fit'] },

    // Skin conditions
    'rash': { severity: 'low', specialization: 'Dermatology', keywords: ['rash', 'skin', 'itchy', 'red spots'] },
    'acne': { severity: 'low', specialization: 'Dermatology', keywords: ['acne', 'pimples', 'breakout'] },
    'skin infection': { severity: 'medium', specialization: 'Dermatology', keywords: ['infected', 'pus', 'swollen skin'] },

    // Orthopedic symptoms
    'joint pain': { severity: 'low', specialization: 'Orthopedics', keywords: ['joint', 'knee', 'ankle', 'elbow', 'pain'] },
    'back pain': { severity: 'low', specialization: 'Orthopedics', keywords: ['back pain', 'spine', 'lower back'] },
    'fracture': { severity: 'high', specialization: 'Orthopedics', keywords: ['fracture', 'broken', 'bone'] },

    // General symptoms
    'fever': { severity: 'low', specialization: 'General Medicine', keywords: ['fever', 'temperature', 'hot'] },
    'high fever': { severity: 'medium', specialization: 'General Medicine', keywords: ['high fever', 'very hot', '103', '104'] },
    'cough': { severity: 'low', specialization: 'General Medicine', keywords: ['cough', 'coughing'] },
    'cold': { severity: 'low', specialization: 'General Medicine', keywords: ['cold', 'runny nose', 'sneezing'] },

    // Gastrointestinal symptoms
    'stomach pain': { severity: 'medium', specialization: 'Gastroenterology', keywords: ['stomach', 'abdomen', 'belly', 'pain'] },
    'nausea': { severity: 'low', specialization: 'Gastroenterology', keywords: ['nausea', 'vomiting', 'sick'] },
    'diarrhea': { severity: 'medium', specialization: 'Gastroenterology', keywords: ['diarrhea', 'loose stool', 'upset stomach'] },

    // Pediatric (general)
    'child fever': { severity: 'medium', specialization: 'Pediatrics', keywords: ['child', 'baby', 'infant', 'fever'] },
    'child cough': { severity: 'low', specialization: 'Pediatrics', keywords: ['child', 'baby', 'cough'] },

    // ENT symptoms
    'ear pain': { severity: 'medium', specialization: 'ENT', keywords: ['ear', 'earache', 'hearing'] },
    'sore throat': { severity: 'low', specialization: 'ENT', keywords: ['throat', 'sore', 'swallowing'] },
    'nose bleeding': { severity: 'medium', specialization: 'ENT', keywords: ['nose', 'bleeding', 'nosebleed'] }
};

const severityModifiers = {
    'severe': 2,
    'extreme': 2,
    'unbearable': 2,
    'worst': 2,
    'intense': 1.5,
    'sharp': 1.5,
    'chronic': 1.2,
    'mild': 0.5,
    'slight': 0.5,
    'little': 0.5
};

const durationModifiers = {
    'days': 1,
    'week': 1.2,
    'weeks': 1.3,
    'month': 1.5,
    'months': 1.5,
    'hours': 0.8,
    'sudden': 1.3,
    'recent': 0.9
};

// Extract symptoms from user input
export const analyzeSymptoms = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    const detectedSymptoms = [];
    let severityScore = 0;

    // Check for symptom matches
    Object.entries(symptomDatabase).forEach(([symptomName, symptomData]) => {
        const matched = symptomData.keywords.some(keyword =>
            lowerInput.includes(keyword.toLowerCase())
        );

        if (matched) {
            let score = symptomData.severity === 'high' ? 3 : symptomData.severity === 'medium' ? 2 : 1;

            // Apply severity modifiers
            Object.entries(severityModifiers).forEach(([modifier, multiplier]) => {
                if (lowerInput.includes(modifier)) {
                    score *= multiplier;
                }
            });

            // Apply duration modifiers
            Object.entries(durationModifiers).forEach(([duration, multiplier]) => {
                if (lowerInput.includes(duration)) {
                    score *= multiplier;
                }
            });

            severityScore += score;
            detectedSymptoms.push({
                name: symptomName,
                specialization: symptomData.specialization,
                severity: symptomData.severity,
                score: score
            });
        }
    });

    return {
        symptoms: detectedSymptoms,
        totalSeverity: severityScore,
        needsImmediate: severityScore > 5,
        recommendedSpecialization: detectedSymptoms.length > 0
            ? detectedSymptoms.sort((a, b) => b.score - a.score)[0].specialization
            : 'General Medicine'
    };
};

// Generate appropriate response based on analysis
export const generateResponse = (analysis, conversationState) => {
    if (!conversationState.symptomsCollected) {
        return {
            message: "I understand. Can you tell me more about your symptoms? For example:\n• When did this start?\n• How severe is it (mild, moderate, or severe)?\n• Any other symptoms you're experiencing?",
            needsMoreInfo: true,
            nextStep: 'duration'
        };
    }

    if (!conversationState.durationCollected) {
        return {
            message: "Thank you for that information. How long have you been experiencing these symptoms?",
            needsMoreInfo: true,
            nextStep: 'severity'
        };
    }

    if (!conversationState.severityCollected) {
        return {
            message: "I see. On a scale of 1 to 10, how would you rate the severity? Also, is there anything that makes it better or worse?",
            needsMoreInfo: true,
            nextStep: 'recommendation'
        };
    }

    // Generate final recommendation
    if (analysis.totalSeverity < 3) {
        return {
            message: generateMildCareAdvice(analysis),
            recommendation: 'home_care',
            needsMoreInfo: false
        };
    } else {
        return {
            message: generateDoctorRecommendation(analysis),
            recommendation: 'see_doctor',
            specialization: analysis.recommendedSpecialization,
            needsMoreInfo: false
        };
    }
};

const generateMildCareAdvice = (analysis) => {
    const symptomType = analysis.symptoms[0]?.name || 'general discomfort';

    let advice = `Based on your symptoms, this appears to be a mild case. Here are some suggestions:\n\n`;

    // Specific advice based on symptom
    if (symptomType.includes('headache')) {
        advice += `🏠 **Home Care Tips:**\n`;
        advice += `• Rest in a quiet, dark room\n`;
        advice += `• Stay hydrated\n`;
        advice += `• Apply a cold compress to your forehead\n`;
        advice += `• Avoid screens and bright lights\n\n`;
        advice += `💊 **Over-the-Counter Options:**\n`;
        advice += `• Paracetamol (500mg) - follow package instructions\n`;
        advice += `• Ibuprofen (200mg) - if no contraindications\n`;
    } else if (symptomType.includes('cold') || symptomType.includes('cough')) {
        advice += `🏠 **Home Care Tips:**\n`;
        advice += `• Get plenty of rest\n`;
        advice += `• Drink warm fluids (tea, soup)\n`;
        advice += `• Use a humidifier\n`;
        advice += `• Gargle with warm salt water\n\n`;
        advice += `💊 **Over-the-Counter Options:**\n`;
        advice += `• Cough syrup (follow package instructions)\n`;
        advice += `• Throat lozenges\n`;
        advice += `• Steam inhalation\n`;
    } else if (symptomType.includes('fever')) {
        advice += `🏠 **Home Care Tips:**\n`;
        advice += `• Rest and stay hydrated\n`;
        advice += `• Use light clothing\n`;
        advice += `• Take a lukewarm bath\n`;
        advice += `• Monitor temperature regularly\n\n`;
        advice += `💊 **Over-the-Counter Options:**\n`;
        advice += `• Paracetamol - as directed\n`;
    } else {
        advice += `🏠 **Home Care Tips:**\n`;
        advice += `• Rest and avoid strenuous activity\n`;
        advice += `• Stay well hydrated\n`;
        advice += `• Monitor your symptoms\n`;
        advice += `• Maintain good nutrition\n`;
    }

    advice += `\n⚠️ **Important Disclaimer:**\n`;
    advice += `This is general advice only and not a substitute for professional medical opinion. If symptoms worsen or persist for more than 2-3 days, please consult a doctor.\n\n`;
    advice += `Would you like to book an appointment with a doctor anyway?`;

    return advice;
};

const generateDoctorRecommendation = (analysis) => {
    const specialization = analysis.recommendedSpecialization;
    const urgency = analysis.needsImmediate ? '**immediate**' : 'prompt';

    let message = `Based on your symptoms, I recommend ${urgency} consultation with a **${specialization}** specialist.\n\n`;

    if (analysis.needsImmediate) {
        message += `⚠️ **Important:** Your symptoms suggest you should seek medical attention soon.\n\n`;
    }

    message += `**Why ${specialization}?**\n`;
    message += `This specialization is best suited to evaluate and treat your symptoms.\n\n`;
    message += `Our ${specialization} specialists can:\n`;
    message += `• Conduct a thorough examination\n`;
    message += `• Order necessary tests if needed\n`;
    message += `• Provide an accurate diagnosis\n`;
    message += `• Recommend appropriate treatment\n\n`;
    message += `Would you like to see available ${specialization} doctors?`;

    return message;
};

// Chatbot conversation manager
export class ChatbotSession {
    constructor() {
        this.conversationState = {
            symptomsCollected: false,
            durationCollected: false,
            severityCollected: false,
            currentAnalysis: null,
            messageCount: 0
        };
        this.messages = [
            {
                type: 'bot',
                text: "👋 Hello! I'm your CityCare Health Assistant. I'm here to help guide you before your visit.\n\nHow are you feeling today? Please describe any symptoms or health concerns you have.",
                timestamp: new Date()
            }
        ];
    }

    processMessage(userMessage) {
        // Add user message
        this.messages.push({
            type: 'user',
            text: userMessage,
            timestamp: new Date()
        });

        this.conversationState.messageCount++;

        // Analyze symptoms
        const analysis = analyzeSymptoms(userMessage);

        // Update conversation state
        if (analysis.symptoms.length > 0) {
            this.conversationState.symptomsCollected = true;
            this.conversationState.currentAnalysis = analysis;
        }

        // Check for duration mentions
        if (this.conversationState.symptomsCollected &&
            (userMessage.includes('day') || userMessage.includes('week') || userMessage.includes('hour') ||
                userMessage.includes('since') || userMessage.includes('ago'))) {
            this.conversationState.durationCollected = true;
        }

        // Check for severity mentions
        if (this.conversationState.durationCollected &&
            (userMessage.match(/\d/) || userMessage.includes('severe') ||
                userMessage.includes('mild') || userMessage.includes('moderate'))) {
            this.conversationState.severityCollected = true;
        }

        // Generate response
        const response = generateResponse(
            this.conversationState.currentAnalysis || analysis,
            this.conversationState
        );

        // Add bot response
        this.messages.push({
            type: 'bot',
            text: response.message,
            timestamp: new Date(),
            showDoctorButton: response.recommendation === 'see_doctor',
            specialization: response.specialization
        });

        return {
            messages: this.messages,
            response: response
        };
    }

    getMessages() {
        return this.messages;
    }
}
