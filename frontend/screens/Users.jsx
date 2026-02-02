import React, { useState, useEffect } from "react";

export default function Users({ user }) {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'CASHIER' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    function loadUsers() {
        fetch("http://localhost:4000/api/users")
            .then(r => r.json())
            .then(data => setUsers(data))
            .catch(err => setError("Failed to load users"));
    }

    function openAddModal() {
        setEditingUser(null);
        setFormData({ username: '', password: '', role: 'CASHIER' });
        setError('');
        setSuccess('');
        setShowModal(true);
    }

    function openEditModal(u) {
        setEditingUser(u);
        setFormData({ username: u.username, password: '', role: u.role });
        setError('');
        setSuccess('');
        setShowModal(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.username || !formData.role) {
            setError("Username and role are required");
            return;
        }

        if (!editingUser && !formData.password) {
            setError("Password is required for new users");
            return;
        }

        const url = editingUser
            ? `http://localhost:4000/api/users/${editingUser.id}`
            : "http://localhost:4000/api/users";

        const method = editingUser ? "PUT" : "POST";
        const body = {
            ...formData,
            currentUser: user.username
        };

        // Don't send empty password on edit
        if (editingUser && !formData.password) {
            delete body.password;
        }

        fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setSuccess(editingUser ? "User updated successfully" : "User created successfully");
                    loadUsers();
                    setTimeout(() => {
                        setShowModal(false);
                        setSuccess('');
                    }, 1500);
                }
            })
            .catch(err => setError("Operation failed"));
    }

    function handleDelete(u) {
        if (!confirm(`Are you sure you want to delete user "${u.username}"?`)) return;

        fetch(`http://localhost:4000/api/users/${u.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentUser: user.username })
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    loadUsers();
                }
            })
            .catch(err => alert("Failed to delete user"));
    }

    function getRoleBadgeColor(role) {
        switch (role) {
            case 'SUPER_ADMIN': return { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', text: '#fca5a5' };
            case 'ADMIN': return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.5)', text: '#93c5fd' };
            default: return { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', text: '#86efac' };
        }
    }

    return (
        <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>User Management</h2>
                <button className="btn-bubble" onClick={openAddModal}>
                    <span style={{ marginRight: '8px' }}>+</span> Add User
                </button>
            </div>

            {/* Users Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Role</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const badgeColor = getRoleBadgeColor(u.role);
                            return (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px', fontSize: '14px' }}>{u.id}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{u.username}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: badgeColor.bg,
                                            color: badgeColor.text,
                                            border: `1px solid ${badgeColor.border}`
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => openEditModal(u)}
                                            style={{ marginRight: '8px', fontSize: '12px', padding: '6px 12px' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn-danger"
                                            onClick={() => handleDelete(u)}
                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No users found
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="glass-card" style={{ width: '90%', maxWidth: '500px', position: 'relative' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
                            {editingUser ? 'Edit User' : 'Add New User'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    style={{ width: '100%' }}
                                    placeholder="Enter username"
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Password {editingUser && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    style={{ width: '100%' }}
                                    placeholder={editingUser ? "Enter new password or leave blank" : "Enter password"}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'white',
                                        padding: '10px 16px',
                                        borderRadius: '12px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="CASHIER" style={{ background: '#000' }}>CASHIER</option>
                                    <option value="ADMIN" style={{ background: '#000' }}>ADMIN</option>
                                    <option value="SUPER_ADMIN" style={{ background: '#000' }}>SUPER_ADMIN</option>
                                </select>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '12px',
                                    marginBottom: '16px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    borderRadius: '8px',
                                    color: '#fca5a5',
                                    fontSize: '14px'
                                }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div style={{
                                    padding: '12px',
                                    marginBottom: '16px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                    borderRadius: '8px',
                                    color: '#86efac',
                                    fontSize: '14px'
                                }}>
                                    {success}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-bubble"
                                >
                                    {editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
