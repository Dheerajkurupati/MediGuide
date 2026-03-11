import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../utils/database';
import './AuthPages.css';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const result = loginAdmin(formData.email, formData.password);

        if (result.success) {
            navigate('/admin/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page admin-auth">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>🏥 CityCare Hospital</h1>
                    <h2>Admin Portal</h2>
                    <p>Staff login only</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="info-box">
                        <strong>Demo Credentials:</strong><br />
                        Email: admin@citycare.com<br />
                        Password: admin123
                    </div>

                    <div className="form-group">
                        <label>Admin Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="admin@citycare.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="Enter admin password"
                        />
                    </div>

                    <button type="submit" className="auth-button admin-button">Admin Login</button>
                </form>

                <button onClick={() => navigate('/')} className="back-button">← Back to Home</button>
            </div>
        </div>
    );
};

export default AdminLogin;
