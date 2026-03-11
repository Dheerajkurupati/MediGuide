import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatbotSession } from '../utils/chatbotEngine';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [session] = useState(() => new ChatbotSession());
    const [messages, setMessages] = useState(session.getMessages());
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!message.trim()) return;

        const result = session.processMessage(message);
        setMessages([...result.messages]);
        setMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleViewDoctors = (specialization) => {
        setIsOpen(false);
        navigate(`/doctors?specialization=${specialization}`);
    };

    return (
        <>
            <button
                className="chatbot-button"
                onClick={() => setIsOpen(!isOpen)}
                title="Chat with Health Assistant"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>🤖 Health Assistant</h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.type}`}>
                                <div className="message-content">
                                    {msg.text.split('\n').map((line, i) => (
                                        <span key={i}>
                                            {line}
                                            {i < msg.text.split('\n').length - 1 && <br />}
                                        </span>
                                    ))}
                                    {msg.showDoctorButton && (
                                        <button
                                            className="view-doctors-btn"
                                            onClick={() => handleViewDoctors(msg.specialization)}
                                        >
                                            View Available {msg.specialization} Doctors →
                                        </button>
                                    )}
                                </div>
                                <div className="message-time">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input">
                        <button className="mic-btn" title="Speech to text (coming soon)" disabled>
                            🎤
                        </button>
                        <input
                            type="text"
                            placeholder="Describe your symptoms..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button className="send-btn" onClick={handleSend}>
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
