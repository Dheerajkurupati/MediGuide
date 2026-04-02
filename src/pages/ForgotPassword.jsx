import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP } from '../utils/supabaseDatabase';
import { CrossIcon, ArrowLeftIcon } from '../components/Icons';
import './AuthPages.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await sendOTP(email);
        setLoading(false);

        if (result.success) {
            setOtpSent(true);
            sessionStorage.setItem('reset_email', email);
        } else {
            setError(result.message);
        }
    };

    const goToVerify = () => {
        navigate('/verify-otp');
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo-icon"><CrossIcon size={24} color="#fff" /></div>
                    <h1>CityCare Hospital</h1>
                    <h2>Forgot Password</h2>
                    <p>Enter your email to receive an OTP</p>
                </div>

                {!otpSent ? (
                    <form className="auth-form" onSubmit={handleSendOTP}>
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label>Registered Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <div className="otp-display-box">
                        <div className="otp-icon">📬</div>
                        <p>OTP sent to <strong>{email}</strong></p>
                        <p className="otp-note">Check your inbox (and spam folder). The code expires in 10 minutes.</p>
                        <button className="auth-button" onClick={goToVerify}>
                            Enter OTP →
                        </button>
                    </div>
                )}

                <div className="auth-footer">
                    Remember your password?{' '}
                    <button onClick={() => navigate('/login')} className="link-button">
                        Login
                    </button>
                </div>

                <button onClick={() => navigate('/login')} className="back-button">
                    <ArrowLeftIcon size={16} /> Back to Login
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;
