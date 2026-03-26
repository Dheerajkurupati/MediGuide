import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updateUser, changePassword, deleteAccount, getUserAppointments, logoutUser } from '../../utils/supabaseDatabase';
import { CrossIcon, UserIcon, LockIcon, TrashIcon, EditIcon } from '../../components/Icons';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState({ text: '', type: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.isAdmin) { navigate('/login'); return; }
        setUser(currentUser);
        setEditForm({ name: currentUser.name, phone: currentUser.phone || '', age: currentUser.age || '', gender: currentUser.gender || '' });

        const loadStats = async () => {
            const appts = await getUserAppointments(currentUser.id);
            setStats({
                total: appts.length,
                confirmed: appts.filter(a => a.status === 'Confirmed').length,
                completed: appts.filter(a => a.status === 'Completed').length,
                cancelled: appts.filter(a => a.status === 'Cancelled').length
            });
        };
        loadStats();
    }, [navigate]);

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleEditSave = async () => {
        if (!editForm.name.trim()) { showMsg('Name cannot be empty.', 'error'); return; }
        setSaving(true);
        const result = await updateUser(user.id, editForm);
        setSaving(false);
        if (result.success) {
            setUser(result.user);
            setIsEditing(false);
            showMsg('Profile updated successfully!');
        } else {
            showMsg(result.message, 'error');
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordForm.oldPassword || !passwordForm.newPassword) {
            showMsg('Please fill in all password fields.', 'error'); return;
        }
        if (passwordForm.newPassword.length < 6) {
            showMsg('New password must be at least 6 characters.', 'error'); return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showMsg('New passwords do not match.', 'error'); return;
        }
        setSaving(true);
        const result = await changePassword(user.id, passwordForm.oldPassword, passwordForm.newPassword);
        setSaving(false);
        if (result.success) {
            setShowPasswordForm(false);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            showMsg(result.message);
        } else {
            showMsg(result.message, 'error');
        }
    };

    const handleDeleteAccount = async () => {
        await deleteAccount(user.id);
        navigate('/');
    };

    if (!user) return null;

    const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

    return (
        <div className="profile-page">
            <nav className="patient-nav">
                <div className="nav-inner">
                    <span className="nav-logo" onClick={() => navigate('/dashboard')}><CrossIcon size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />CityCare</span>
                    <div className="nav-links">
                        <span onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <span onClick={() => navigate('/doctors')}>Doctors</span>
                        <span onClick={() => navigate('/my-bookings')}>My Bookings</span>
                        <span className="active">Profile</span>
                    </div>
                    <button className="logout-btn" onClick={() => { logoutUser(); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="profile-container">
                {/* Toast Message */}
                {message.text && (
                    <div className={`profile-toast ${message.type}`}>
                        {message.type === 'success' ? '✅' : '❌'} {message.text}
                    </div>
                )}

                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-avatar">{initials}</div>
                    <div className="profile-header-info">
                        <h1>{user.name}</h1>
                        <p>{user.email}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="profile-stats">
                    <div className="p-stat"><strong>{stats.total}</strong><span>Total</span></div>
                    <div className="p-stat confirmed"><strong>{stats.confirmed}</strong><span>Upcoming</span></div>
                    <div className="p-stat completed"><strong>{stats.completed}</strong><span>Completed</span></div>
                    <div className="p-stat cancelled"><strong>{stats.cancelled}</strong><span>Cancelled</span></div>
                </div>

                {/* Profile Details */}
                <div className="profile-card">
                    <div className="card-header">
                        <h2><UserIcon size={18} /> Personal Information</h2>
                        {!isEditing ? (
                            <button className="edit-btn" onClick={() => setIsEditing(true)}><EditIcon size={14} /> Edit</button>
                        ) : (
                            <div className="edit-actions">
                                <button className="save-btn" onClick={handleEditSave}>Save</button>
                                <button className="cancel-btn" onClick={() => { setIsEditing(false); setEditForm({ name: user.name, phone: user.phone || '', age: user.age || '', gender: user.gender || '' }); }}>Cancel</button>
                            </div>
                        )}
                    </div>

                    <div className="profile-fields">
                        <div className="field-row">
                            <label>Full Name</label>
                            {isEditing ? (
                                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            ) : (
                                <span>{user.name}</span>
                            )}
                        </div>
                        <div className="field-row">
                            <label>Email</label>
                            <span className="email-locked">
                                {user.email}
                                <small>🔒 Cannot be changed</small>
                            </span>
                        </div>
                        <div className="field-row">
                            <label>Phone</label>
                            {isEditing ? (
                                <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Enter phone number" />
                            ) : (
                                <span>{user.phone || '—'}</span>
                            )}
                        </div>
                        <div className="field-row">
                            <label>Age</label>
                            {isEditing ? (
                                <input type="number" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} placeholder="Enter age" min="1" max="120" />
                            ) : (
                                <span>{user.age || '—'}</span>
                            )}
                        </div>
                        <div className="field-row">
                            <label>Gender</label>
                            {isEditing ? (
                                <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            ) : (
                                <span>{user.gender || '—'}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="profile-card">
                    <div className="card-header">
                        <h2><LockIcon size={18} /> Password & Security</h2>
                        {!showPasswordForm && (
                            <button className="edit-btn" onClick={() => setShowPasswordForm(true)}>Change Password</button>
                        )}
                    </div>

                    {showPasswordForm ? (
                        <div className="password-form">
                            <div className="field-row">
                                <label>Current Password</label>
                                <input type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} placeholder="Enter current password" />
                            </div>
                            <div className="field-row">
                                <label>New Password</label>
                                <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Enter new password (min 6 chars)" />
                            </div>
                            <div className="field-row">
                                <label>Confirm New Password</label>
                                <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Confirm new password" />
                            </div>
                            <div className="edit-actions">
                                <button className="save-btn" onClick={handlePasswordChange}>Update Password</button>
                                <button className="cancel-btn" onClick={() => { setShowPasswordForm(false); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <p className="security-note">Your password was last set when you created your account. We recommend changing it periodically.</p>
                    )}
                </div>

                {/* Delete Account */}
                <div className="profile-card">
                    <div className="card-header">
                        <h2><TrashIcon size={18} /> Delete Account</h2>
                    </div>

                    {!showDeleteConfirm ? (
                        <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            Delete My Account
                        </button>
                    ) : (
                        <div className="delete-confirm">
                            <p>Are you sure? You will <strong>lose all your data</strong> including {stats.total} appointment(s). This cannot be undone.</p>
                            <div className="edit-actions">
                                <button className="delete-confirm-btn" onClick={handleDeleteAccount}>Yes, Delete</button>
                                <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
