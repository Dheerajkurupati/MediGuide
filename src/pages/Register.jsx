import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/supabaseDatabase';
import { CrossIcon, ArrowLeftIcon } from '../components/Icons';
import './AuthPages.css';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        age: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const result = await registerUser({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            age: formData.age,
            password: formData.password
        });
        setLoading(false);

        if (result.success) {
            setSuccess('✅ Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
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
                    <h2>Create Your Account</h2>
                    <p>Join us for better healthcare guidance</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error   && <div className="error-message">{error}</div>}
                    {success && <div className="success-banner">{success}</div>}

                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Enter your full name"
                        />
                    </div>

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
                        <label>Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            placeholder="+91 98765 43210"
                        />
                    </div>

                    <div className="form-group">
                        <label>Age</label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            required
                            min="1"
                            max="120"
                            placeholder="Your age"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            placeholder="Re-enter your password"
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
                </form>

                <div className="auth-footer">
                    Already have an account? <button onClick={() => navigate('/login')} className="link-button">Login here</button>
                </div>

                <button onClick={() => navigate('/')} className="back-button">
                    <ArrowLeftIcon size={16} /> Back to Home
                </button>
            </div>
        </div>
    );
};

export default Register;
