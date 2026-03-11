import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* ── Navbar ── */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="logo">
                        <span className="logo-icon">🏥</span>
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
                        { icon: '💬', step: '01', title: 'Describe Symptoms', desc: 'Chat with our AI. Tell it how you feel — it listens, asks follow-ups, and analyses severity.' },
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
                        <h3>AI Symptom Checker</h3>
                        <p>Smart conversations that understand context, severity, and duration — giving you personalised advice before you even leave home.</p>
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

            {/* ── Specializations ── */}
            <section className="spec-section">
                <h2 className="section-title">Our Specializations</h2>
                <p className="section-sub">Available 7 days a week, including Sundays</p>
                <div className="spec-grid">
                    {[
                        { icon: '❤️', name: 'Cardiology' },
                        { icon: '🧠', name: 'Neurology' },
                        { icon: '🩺', name: 'Dermatology' },
                        { icon: '🦴', name: 'Orthopedics' },
                        { icon: '🏥', name: 'General Medicine' },
                        { icon: '🫁', name: 'Gastroenterology' },
                        { icon: '👶', name: 'Pediatrics' },
                        { icon: '👂', name: 'ENT' }
                    ].map(s => (
                        <div className="spec-chip" key={s.name}>
                            <span>{s.icon}</span> {s.name}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Contact ── */}
            <section className="contact-section">
                <h2 className="section-title">Find Us</h2>
                <div className="contact-grid">
                    {[
                        { icon: '📍', label: 'Address', lines: ['123 Healthcare Avenue, Medical District', 'City Center, State 560001'] },
                        { icon: '📞', label: 'Phone', lines: ['+1 (555) 123-4567', 'Emergency: +1 (555) 911-0000'] },
                        { icon: '✉️', label: 'Email', lines: ['info@citycarehospital.com', 'appointments@citycarehospital.com'] },
                        { icon: '🕐', label: 'Hours', lines: ['Mon – Sun: 8:00 AM – 8:00 PM', 'Emergency: 24 / 7'] }
                    ].map(c => (
                        <div className="contact-card" key={c.label}>
                            <div className="contact-icon-box">{c.icon}</div>
                            <div>
                                <strong>{c.label}</strong>
                                {c.lines.map(l => <p key={l}>{l}</p>)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-logo">🏥 CityCare Hospital</div>
                    <p>Providing compassionate care with cutting-edge technology.</p>
                    <p className="footer-copy">&copy; 2026 CityCare Hospital. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
