import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/supabaseDatabase';
import { CrossIcon } from '../components/Icons';
import './AuthPages.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const email = sessionStorage.getItem('reset_email') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!email) {
        navigate('/forgot-password');
        return null;
    }

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const result = await resetPassword(email, password);
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            sessionStorage.removeItem('reset_email');
            setTimeout(() => navigate('/login'), 2500);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo-icon"><CrossIcon size={24} color="#fff" /></div>
                    <h1>CityCare Hospital</h1>
                    <h2>Set New Password</h2>
                    <p>Create a strong password for your account</p>
                </div>

                {success ? (
                    <div className="success-banner">
                        ✅ Password reset successfully! Redirecting to login...
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleReset}>
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label>New Password</label>
                            <div className="password-wrap">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="At least 6 characters"
                                />
                                <button
                                    type="button"
                                    className="toggle-pass"
                                    onClick={() => setShowPass(p => !p)}
                                    tabIndex={-1}
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter new password"
                            />
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Updating...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
