import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chatbot.css';

const FLASK_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

// ── Markdown-lite renderer ──────────────────────────────────────
// Handles **bold**, *italic*, bullet lines starting with • / - / *
const renderText = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, lineIdx) => {
        // Convert **text** → <strong> and *text* → <em>
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={partIdx}>{part.slice(1, -1)}</em>;
            }
            return part;
        });

        return (
            <span key={lineIdx} className="chat-line">
                {parts}
                {lineIdx < text.split('\n').length - 1 && <br />}
            </span>
        );
    });
};

// ── Typing indicator ────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="message bot typing-msg">
        <div className="bot-avatar">🤖</div>
        <div className="message-bubble">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </div>
    </div>
);

// ── Main component ──────────────────────────────────────────────
const Chatbot = () => {
    const [isOpen,    setIsOpen]    = useState(false);
    const [messages,  setMessages]  = useState([]);
    const [input,     setInput]     = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const navigate       = useNavigate();

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    // Auto-focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Send welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            addBotMessage(
                "Hello! I'm **MediGuide**, your Hospital Guidance Assistant. 🏥\n\n" +
                "I'm here to help guide you based on your symptoms. Please describe the main problem or symptom you are experiencing.",
                { options: [] }
            );
        }
    }, [isOpen]);

    const addBotMessage = (text, extra = {}) => {
        setMessages(prev => [...prev, {
            id:        Date.now() + Math.random(),
            type:      'bot',
            text,
            timestamp: new Date(),
            ...extra,
        }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, {
            id:        Date.now() + Math.random(),
            type:      'user',
            text,
            timestamp: new Date(),
        }]);
    };

    const sendMessage = useCallback(async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        addUserMessage(trimmed);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${FLASK_URL}/chat`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ user_id: sessionId, message: trimmed }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            addBotMessage(data.reply, {
                decision: data.decision || null,
                dept:     data.dept     || null,
                options:  data.options  || [],
                doctors:  data.doctors  || [],
            });
        } catch (err) {
            addBotMessage(
                '⚠️ Sorry, I couldn\'t reach the MediGuide service. Please ensure the backend is running and try again.',
                { options: [] }
            );
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, sessionId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const isFinalDecision = (decision) =>
        decision === 'CONSULTATION' || decision === 'MINOR' || decision === 'EMERGENCY';

    return (
        <>
            {/* Floating bubble */}
            <button
                id="chatbot-toggle-btn"
                className={`chatbot-fab ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(o => !o)}
                aria-label="Toggle MediGuide chatbot"
            >
                <span className="fab-icon">{isOpen ? '✕' : '💬'}</span>
                {!isOpen && <span className="fab-label">MediGuide</span>}
            </button>

            {/* Chat window */}
            {isOpen && (
                <div className="chatbot-window" role="dialog" aria-label="MediGuide Health Assistant">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="header-info">
                            <div className="header-avatar">🤖</div>
                            <div>
                                <div className="header-name">MediGuide</div>
                                <div className="header-status">
                                    <span className="status-dot" />
                                    Hospital Guidance Assistant
                                </div>
                            </div>
                        </div>
                        <button
                            className="header-close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chatbot"
                        >✕</button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages" role="log" aria-live="polite">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.type}`}>
                                {msg.type === 'bot' && <div className="bot-avatar">🤖</div>}

                                <div className="message-bubble">
                                    <div className="bubble-text">{renderText(msg.text)}</div>

                                    {/* Quick-reply chips (e.g. "Start Over") */}
                                    {msg.type === 'bot' && msg.options && msg.options.length > 0 && (
                                        <div className="quick-replies">
                                            {msg.options.map((opt) => (
                                                <button
                                                    key={opt}
                                                    className="chip"
                                                    onClick={() => sendMessage(opt)}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Doctor suggestions — CONSULTATION only */}
                                    {msg.type === 'bot' && msg.decision === 'CONSULTATION' && (
                                        msg.doctors && msg.doctors.length > 0 ? (
                                            <div className="suggested-doctors">
                                                <p className="suggested-doctors-label">👨‍⚕️ Suggested Specialists</p>
                                                {msg.doctors.map((doc, i) => (
                                                    <div key={i} className="doc-card">
                                                        <div className="doc-card-avatar">🩺</div>
                                                        <div className="doc-card-info">
                                                            <span className="doc-card-name">{doc.name}</span>
                                                            <span className="doc-card-spec">{doc.specialization}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-doctors-note">🔍 Visit our doctors page to find a specialist in <strong>{msg.dept}</strong>.</p>
                                        )
                                    )}

                                    {/* Book Appointment CTA — shown after any final recommendation */}
                                    {msg.type === 'bot' && isFinalDecision(msg.decision) && (
                                        <button
                                            className="book-appt-btn"
                                            onClick={() => {
                                                setIsOpen(false);
                                                navigate(msg.decision === 'CONSULTATION' && msg.dept
                                                    ? `/doctors?dept=${encodeURIComponent(msg.dept)}`
                                                    : '/doctors'
                                                );
                                            }}
                                        >
                                            📅 Book an Appointment →
                                        </button>
                                    )}

                                    <div className="bubble-time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chatbot-input-bar">
                        <input
                            ref={inputRef}
                            id="chatbot-input"
                            type="text"
                            placeholder="Describe your symptoms…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <button
                            id="chatbot-send-btn"
                            className="send-btn"
                            onClick={() => sendMessage(input)}
                            disabled={isLoading || !input.trim()}
                            aria-label="Send message"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
