# CityCare Hospital & MediGuide Chatbot

![CityCare Banner](https://img.shields.io/badge/Status-Active-success) ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue) ![Python](https://img.shields.io/badge/Backend-Python%20Flask-yellow) ![Supabase](https://img.shields.io/badge/Database-Supabase-green)

## Overview

CityCare is a modern, fully responsive web application designed for comprehensive hospital management and patient booking. 

Seamlessly integrated into the patient portal is **MediGuide**, an advanced AI-powered healthcare chatbot. MediGuide performs initial patient triage using Natural Language Processing (NLP) and Machine Learning (ML) to recommend appropriate medical departments based on symptoms, and immediately deep-links patients to book an appointment with the correct available specialists.

## Key Features

- 🤖 **MediGuide ML Chatbot:** A Python/Flask backend utilizing a scikit-learn Naive Bayes model to classify natural language text symptoms into precise medical departments.
- 📆 **Smart Booking & Day Navigator:** Patients can filter doctors dynamically by available days of the week using a custom-built, timezone-aware interactive calendar interface.
- 🧑‍⚕️ **Tri-Portal Architecture:** Dedicated dashboards with specific capabilities for **Patients** (booking/history), **Doctors** (accept/reject appointments, schedule management), and **Admins** (staffing and overarching analytics).
- ☁️ **Supabase Integration:** Powered by a live PostgreSQL database for real-time appointment states, patient data, and doctor profiles.
- 🔒 **Secure Authentication:** Complete registration/login system with hashed passwords and OTP-based password resets functionality.

## Tech Stack

### Frontend
- **Framework:** React.js powered by Vite for lightning-fast HMR and building.
- **Styling:** Hand-written, modern Vanilla CSS tailored for dynamic states (dimmed cards, responsive grids, custom modals).
- **Icons:** Inline SVG components.

### Backend (MediGuide & OTP Server)
- **Framework:** Python, Flask, Flask-CORS
- **Machine Learning:** `scikit-learn` (MultinomialNB), `pandas`, `numpy`
- **NLP:** `nltk` (Tokenization, Lemmatization, Stop-word removal)
- **Utilities:** `smtplib` for Email OTP delivery.

### Database
- **Provider:** Supabase (Remote PostgreSQL)
- **Client:** `@supabase/supabase-js`

---

## Installation & Local Setup

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.10+ recommended)

### 1. Environment Variables
You will need to configure environment variables for both the frontend and the backend.

**Frontend (`/.env`)**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (`/backend/.env`)**
Create a `.env` file in the `backend/` directory for the Email OTP feature:
```env
SMTP_EMAIL=your_hospital_sender_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

### 2. Start the Backend Server (Flask)
The Python server runs the Machine Learning model and handles OTP requests.

```bash
cd backend
python -m venv venv

# Activate venv (Windows)
venv\Scripts\activate
# Activate venv (Mac/Linux)
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
> The backend server will start on `http://localhost:5050`. It will output confirmation that the NLTK corpuses and the ML model are trained and ready.

### 3. Start the Frontend (React)
Open a new terminal window to run the UI.

```bash
# From the root directory (where package.json lives)
npm install
npm run dev
```
> The frontend will usually run on `http://localhost:5173` or `5174`.

---

## Chatbot Triage Flow

When a patient interacts with the MediGuide chatbot, the system executes the following flow:
1. **Input Parsing:** Natural language input is cleaned, tokenized, and lemmatized using NLTK to extract core symptoms.
2. **Prediction:** The cleaned data runs through the loaded Naive Bayes classification model.
3. **Decision Tree:**
   - **`EMERGENCY`**: User is instructed to seek immediate care.
   - **`HOME_CARE`**: Minor symptoms receive standard care advice.
   - **`CONSULTATION`**: Calculates the precise medical discipline needed (e.g., *Orthopedics*), deeply integrates with Supabase to actively verify if doctors in that discipline are available, and presents direct booking links matching those criteria inside the chat framework.

## License
CityCare & MediGuide - Developed for Educational & Portfolio Purposes.
