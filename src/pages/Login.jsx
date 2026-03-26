import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/supabaseDatabase';
import { CrossIcon, ArrowLeftIcon } from '../components/Icons';
import './AuthPages.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await loginUser(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            navigate('/dashboard');
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
                    <h2>Welcome Back</h2>
                    <p>Login to access your health dashboard</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="your.email@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <button onClick={() => navigate('/register')} className="link-button">Register here</button>
                </div>

                <button onClick={() => navigate('/')} className="back-button">
                    <ArrowLeftIcon size={16} /> Back to Home
                </button>
            </div>
        </div>
    );
};

export default Login;
