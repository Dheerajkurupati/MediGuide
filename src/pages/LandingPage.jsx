import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrossIcon } from '../components/Icons';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const [supportForm, setSupportForm] = useState({ name: '', email: '', message: '' });

    const handleSupportChange = (e) => {
        setSupportForm({ ...supportForm, [e.target.name]: e.target.value });
    };

    const handleSupportSubmit = (e) => {
        e.preventDefault();
        const subject = `Support Request from ${supportForm.name}`;
        const body = `Name: ${supportForm.name}%0AEmail: ${supportForm.email}%0A%0AMessage:%0A${encodeURIComponent(supportForm.message)}`;
        window.location.href = `mailto:support@mediguide.com?subject=${encodeURIComponent(subject)}&body=${body}`;
    };

    return (
        <div className="landing-page">
            {/* ── Navbar ── */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="logo">
                        <span className="logo-icon"><CrossIcon size={20} color="#fff" /></span>
                        <span className="logo-text">CityCare Hospital</span>
                    </div>
                    <button className="admin-link" onClick={() => navigate('/admin-login')}>
                        Staff / Admin Login
                    </button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section
                className="hero-section"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1800&auto=format&fit=crop&q=80')"
                }}
            >
                <div className="hero-overlay" />
                <div className="hero-content">
                    <h1 className="main-tagline">Your Health,<br />Guided Before You Visit</h1>
                    <p className="hero-description">
                        Chat with our Health Assistant, understand your symptoms, find the
                        right specialist — all before stepping into the hospital.
                    </p>
                    <div className="cta-buttons">
                        <button className="btn btn-primary" onClick={() => navigate('/register')}>
                            Get Started Free
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/login')}>
                            Login to Dashboard
                        </button>
                    </div>
                    <div className="hero-stats">
                        <div className="stat"><strong>8+</strong><span>Specialists</span></div>
                        <div className="stat-divider" />
                        <div className="stat"><strong>7 Days</strong><span>Available</span></div>
                        <div className="stat-divider" />
                        <div className="stat"><strong>24/7</strong><span> Guidance</span></div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="how-section">
                <h2 className="section-title">How CityCare Works</h2>
                <p className="section-sub">From symptoms to appointment in 3 easy steps</p>
                <div className="steps-row">
                    {[
                        { icon: '💬', step: '01', title: 'Describe Symptoms', desc: 'Chat with our Health Assistant. Tell it how you feel — it listens, asks follow-ups, and analyses severity.' },
                        { icon: '🎯', step: '02', title: 'Get Matched', desc: 'Our system recommends the right specialist based on your symptoms and urgency level.' },
                        { icon: '📅', step: '03', title: 'Book & Confirm', desc: 'Pick a date and time that suits you. Get an instant confirmation or waitlist position.' }
                    ].map(item => (
                        <div className="step-card" key={item.step}>
                            <div className="step-badge">{item.step}</div>
                            <div className="step-icon">{item.icon}</div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Feature Highlight (Photo Cards) ── */}
            <section className="features-section">
                <div
                    className="feature-photo-card"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80')" }}
                >
                    <div className="photo-overlay">
                        <div className="photo-icon">🤖</div>
                        <h3>Smart Symptom Checker</h3>
                        <p>Intelligent conversations that understand context, severity, and duration — giving you personalised advice before you even leave home.</p>
                    </div>
                </div>

                <div
                    className="feature-photo-card"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&auto=format&fit=crop&q=80')" }}
                >
                    <div className="photo-overlay">
                        <div className="photo-icon">👨‍⚕️</div>
                        <h3>Expert Specialists</h3>
                        <p>Cardiology, Neurology, Dermatology, Orthopedics, Gastroenterology, Pediatrics, ENT, and General Medicine — all under one roof.</p>
                    </div>
                </div>

                <div
                    className="feature-photo-card"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80')" }}
                >
                    <div className="photo-overlay">
                        <div className="photo-icon">⚡</div>
                        <h3>Instant Booking</h3>
                        <p>Real-time slot availability. Book, cancel, or join the waitlist — your schedule, your control, any device.</p>
                    </div>
                </div>
            </section>

            {/* ── Quote Banner ── */}
            <section
                className="quote-section"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1530026405186-ed1f139313f3?w=1800&auto=format&fit=crop&q=80')"
                }}
            >
                <div className="quote-overlay" />
                <blockquote>
                    <span className="quote-mark">"</span>
                    The greatest wealth is health. Let us guide you on your journey to wellness.
                    <span className="quote-mark">"</span>
                    <cite>— CityCare Hospital</cite>
                </blockquote>
            </section>

            {/* ── Support Section ── */}
            <section className="support-section">
                <h2 className="section-title">Need Help? Contact Support</h2>
                <p className="section-sub">Have a question or need assistance? Fill out the form and we'll get back to you.</p>
                <form className="support-form" onSubmit={handleSupportSubmit}>
                    <div className="support-form-row">
                        <div className="support-field">
                            <label htmlFor="support-name">Your Name</label>
                            <input
                                id="support-name"
                                type="text"
                                name="name"
                                placeholder="Enter your full name"
                                value={supportForm.name}
                                onChange={handleSupportChange}
                                required
                            />
                        </div>
                        <div className="support-field">
                            <label htmlFor="support-email">Your Email</label>
                            <input
                                id="support-email"
                                type="email"
                                name="email"
                                placeholder="Enter your email address"
                                value={supportForm.email}
                                onChange={handleSupportChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="support-field">
                        <label htmlFor="support-message">Description</label>
                        <textarea
                            id="support-message"
                            name="message"
                            placeholder="Describe your query or issue in detail..."
                            rows="5"
                            value={supportForm.message}
                            onChange={handleSupportChange}
                            required
                        />
                    </div>
                    <button type="submit" className="support-submit-btn">
                        ✉️ Send to Support
                    </button>
                </form>
            </section>

            {/* ── Contact / Find Us ── */}
            <section className="contact-section">
                <h2 className="section-title">Find Us</h2>
                <p className="section-sub">Reach out to us anytime — we're here to help</p>
                <div className="contact-grid">
                    <div className="contact-card">
                        <div className="contact-icon-box">📍</div>
                        <div>
                            <strong>Address</strong>
                            <p>123 Healthcare Avenue, Medical District</p>
                            <p>Hyderabad, Telangana 500081</p>
                        </div>
                    </div>

                    <div className="contact-card">
                        <div className="contact-icon-box">📞</div>
                        <div>
                            <strong>Phone</strong>
                            <p><a href="tel:+919876543210" className="contact-link">+91 98765 43210</a></p>
                            <p><a href="tel:+914012345678" className="contact-link">+91 40-1234 5678</a></p>
                        </div>
                    </div>

                    <div className="contact-card">
                        <div className="contact-icon-box">✉️</div>
                        <div>
                            <strong>Email</strong>
                            <p><a href="mailto:info@mediguide.com" className="contact-link">info@mediguide.com</a></p>
                            <p><a href="mailto:appointments@mediguide.com" className="contact-link">appointments@mediguide.com</a></p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-logo"><CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> CityCare Hospital</div>
                    <p>Providing compassionate care with cutting-edge technology.</p>
                    <div className="footer-portal-links">
                        <button className="footer-portal-btn" onClick={() => navigate('/doctor-login')}>
                            🩺 Doctor Portal
                        </button>
                        <span className="footer-sep">·</span>
                        <button className="footer-portal-btn" onClick={() => navigate('/admin-login')}>
                            🛠️ Admin Portal
                        </button>
                    </div>
                    <p className="footer-copy">&copy; 2026 CityCare Hospital. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
