import React, { useState, useEffect, useRef } from "react";

export default function Navbar({ user, screen, setScreen, onLogout, appType, toast, onClearToast, onShowToast }) {
    const [notifications, setNotifications] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    // Removed local toast state
    const lastUnreadCount = useRef(0);
    const notifRef = useRef(null);

    function loadNotifications() {
        fetch("http://localhost:4000/api/notifications")
            .then(r => r.json())
            .then(data => {
                setNotifications(data);

                // Logic for Toast
                const unread = data.filter(n => !n.is_read).length;
                if (unread > lastUnreadCount.current) {
                    // New notification detected!
                    const latest = data[0]; // Assuming sorted desc
                    if (latest && !latest.is_read) {
                        if (onShowToast) onShowToast(latest.message);
                    }
                }
                lastUnreadCount.current = unread;
            });
    }

    // Removed local showToast function

    // Poll for notifications every 5 seconds
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000);

        // Click outside to close notification list
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    function markRead(id) {
        fetch("http://localhost:4000/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        }).then(() => loadNotifications());
    }

    function clearAll() {
        if (!confirm("Clear all notifications?")) return;
        fetch("http://localhost:4000/api/notifications/clear", {
            method: "POST"
        }).then(() => loadNotifications());
    }

    // Count unread
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const NavItem = ({ name, label }) => (
        <button
            className={`chrome-tab ${screen === name ? "active" : ""}`}
            onClick={() => setScreen(name)}
        >
            <span>{label}</span>
        </button>
    );

    return (
        <div className="navbar justify-between">
            {/* TOAST NOTIFICATION - TOP RIGHT */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '80px',
                    right: '20px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,240,240,0.95))',
                    color: '#000',
                    padding: '16px 20px',
                    paddingRight: '45px',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 9999,
                    minWidth: '280px',
                    maxWidth: '420px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    {/* Close Button */}
                    <button
                        onClick={onClearToast}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: '#666',
                            padding: '4px 8px',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        ✕
                    </button>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>Notification</div>
                            <div style={{ fontSize: '13px', lineHeight: '1.4', color: '#333' }}>{toast}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left: Tabs */}
            <div className="flex items-center" style={{ height: '100%' }}>
                <NavItem name="BILLING" label="Billing" />
                {appType !== 'GROCERY' && <NavItem name="TABLES" label="Tables" />}
                <NavItem name="HISTORY" label="History" />

                {["ADMIN", "SUPER_ADMIN"].includes(user.role) && (
                    <>
                        <NavItem name="DASHBOARD" label="Dashboard" />
                        <NavItem name="REPORTS" label="Reports" />
                        <NavItem name="STOCK" label="Stock" />
                        <NavItem name="FOOD" label={appType === 'GROCERY' ? "Items" : "Food Items"} />
                        <NavItem name="SCANNER" label="Mobile Scanner" />
                    </>
                )}

                {user.role === "SUPER_ADMIN" && (
                    <>
                        <NavItem name="USERS" label="Users" />
                        <NavItem name="INVOICE_SETTINGS" label="Bill Settings" />
                        <NavItem name="DASHBOARD_SETTINGS" label="Dashboard Settings" />
                        <NavItem name="APP_CONFIG" label="App Config" />
                        <NavItem name="LICENSE" label="License" />
                    </>
                )}
            </div>

            {/* Right: Notifications + Profile + Logout */}
            <div className="flex items-center gap-4">

                {/* Notification Bell */}
                <div style={{ position: 'relative' }} ref={notifRef}>
                    <button
                        className="btn-secondary"
                        style={{ position: 'relative', padding: '8px 12px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onClick={() => setShowNotif(!showNotif)}
                    >
                        {/* White Bell Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                background: 'red',
                                color: 'white',
                                fontSize: 10,
                                borderRadius: '50%',
                                width: 16,
                                height: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showNotif && (
                        <div className="glass-card" style={{
                            position: 'absolute',
                            top: 40,
                            right: 0,
                            width: 320,
                            maxHeight: 400,
                            overflowY: 'auto',
                            zIndex: 100,
                            padding: '10px 0',
                            background: 'rgba(0,0,0,0.95)',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ padding: '0 10px 10px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>Notifications</span>
                                <div className="flex gap-2">
                                    <span
                                        style={{ fontSize: 10, cursor: 'pointer', color: 'var(--accent)' }}
                                        onClick={() => loadNotifications()}
                                    >
                                        Refresh
                                    </span>
                                    <span style={{ color: 'gray' }}>|</span>
                                    <span
                                        style={{ fontSize: 10, cursor: 'pointer', color: '#ff6b6b' }}
                                        onClick={clearAll}
                                    >
                                        Clear All
                                    </span>
                                </div>
                            </div>
                            {notifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#aaa' }}>No notifications</div>}
                            {notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markRead(n.id)}
                                    style={{
                                        padding: '10px 15px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        opacity: n.is_read ? 0.6 : 1,
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => { if (!n.is_read) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                                    onMouseLeave={e => { if (!n.is_read) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: n.is_read ? 'normal' : 'bold', color: n.type === 'WARNING' ? '#ffcc00' : 'inherit' }}>
                                        {n.type === 'WARNING' && '⚠️ '}
                                        {n.message}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile Circle */}
                <div className="flex items-center gap-2">
                    <div
                        style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #fff, #ccc)', borderRadius: '50%', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                        {user.username[0].toUpperCase()}
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="btn-danger"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                >
                    LOGOUT
                </button>
            </div>
        </div>
    );
}
