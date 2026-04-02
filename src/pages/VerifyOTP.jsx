import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP } from '../utils/supabaseDatabase';
import { CrossIcon } from '../components/Icons';
import './AuthPages.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const email = sessionStorage.getItem('reset_email') || '';
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle individual OTP digit input
    const handleDigit = (value, index) => {
        if (!/^\d?$/.test(value)) return; // only digits
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next box
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }

        setError('');
        setLoading(true);
        const result = await verifyOTP(email, fullOtp);
        setLoading(false);

        if (result.success) {
            navigate('/reset-password');
        } else {
            setError(result.message);
        }
    };

    if (!email) {
        navigate('/forgot-password');
        return null;
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo-icon"><CrossIcon size={24} color="#fff" /></div>
                    <h1>CityCare Hospital</h1>
                    <h2>Enter OTP</h2>
                    <p>Enter the 6-digit code for <strong>{email}</strong></p>
                </div>

                <form className="auth-form" onSubmit={handleVerify}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="otp-boxes">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                id={`otp-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                className="otp-box"
                                onChange={(e) => handleDigit(e.target.value, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                            />
                        ))}
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                </form>

                <div className="auth-footer">
                    Wrong email?{' '}
                    <button onClick={() => navigate('/forgot-password')} className="link-button">
                        Go back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
