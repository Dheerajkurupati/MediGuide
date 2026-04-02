import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginDoctor } from '../utils/supabaseDatabase';
import { CrossIcon, ArrowLeftIcon } from '../components/Icons';
import './AuthPages.css';

const DoctorLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await loginDoctor(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            navigate('/doctor/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page" style={{ background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #4338ca 100%)' }}>
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #c026d3)' }}>
                        <CrossIcon size={24} color="#fff" />
                    </div>
                    <h1>Doctor Portal</h1>
                    <h2>Access Your Schedule</h2>
                    <p>Login to manage your patient appointments</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Registered Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="your.email@citycare.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-wrap">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                placeholder="Enter your password"
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

                    <button
                        type="submit"
                        className="auth-button"
                        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #c026d3 100%)' }}
                        disabled={loading}
                    >
                        {loading ? 'Authenticating...' : 'Enter Portal'}
                    </button>
                </form>

                <button onClick={() => navigate('/')} className="back-button">
                    <ArrowLeftIcon size={16} /> Back to Home
                </button>
            </div>
        </div>
    );
};

export default DoctorLogin;
