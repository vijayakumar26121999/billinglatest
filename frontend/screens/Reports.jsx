import React, { useState, useEffect } from "react";

export default function Reports({ user }) {
    const [activeTab, setActiveTab] = useState('LOGIN');
    const [loginHistory, setLoginHistory] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters for Login History
    const [loginUsername, setLoginUsername] = useState('');
    const [loginStartDate, setLoginStartDate] = useState('');
    const [loginEndDate, setLoginEndDate] = useState('');

    // Filters for Stock History
    const [stockItemName, setStockItemName] = useState('');
    const [stockStartDate, setStockStartDate] = useState('');
    const [stockEndDate, setStockEndDate] = useState('');

    const [users, setUsers] = useState([]);

    useEffect(() => {
        // Fetch users for filter dropdown
        fetch("http://localhost:4000/api/users")
            .then(r => r.json())
            .then(data => setUsers(data || []));

        loadLoginHistory();
    }, []);

    useEffect(() => {
        if (activeTab === 'LOGIN') {
            loadLoginHistory();
        } else {
            loadStockHistory();
        }
    }, [activeTab]);

    function loadLoginHistory() {
        setLoading(true);
        let url = "http://localhost:4000/api/reports/login-history?limit=100";

        if (loginUsername) url += `&username=${loginUsername}`;
        if (loginStartDate) url += `&startDate=${loginStartDate}`;
        if (loginEndDate) url += `&endDate=${loginEndDate}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                setLoginHistory(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }

    function loadStockHistory() {
        setLoading(true);
        let url = "http://localhost:4000/api/reports/stock-history?limit=100";

        if (stockItemName) url += `&itemName=${stockItemName}`;
        if (stockStartDate) url += `&startDate=${stockStartDate}`;
        if (stockEndDate) url += `&endDate=${stockEndDate}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                setStockHistory(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        return (
            <div className="flex justify-center items-center" style={{ height: '60vh' }}>
                <div className="glass-card" style={{ width: 400, textAlign: 'center' }}>
                    <h2>🔒 Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Only ADMIN and SUPER_ADMIN can access reports.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 20 }}>📊 Reports</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('LOGIN')}
                    className={activeTab === 'LOGIN' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 20px' }}
                >
                    🔐 Login History
                </button>
                <button
                    onClick={() => setActiveTab('STOCK')}
                    className={activeTab === 'STOCK' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 20px' }}
                >
                    📦 Stock History
                </button>
            </div>

            {/* Login History Tab */}
            {activeTab === 'LOGIN' && (
                <div className="glass-card">
                    <h2>Login History</h2>

                    {/* Filters */}
                    <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                        <select
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                        >
                            <option value="">All Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.username}>{u.username}</option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={loginStartDate}
                            onChange={(e) => setLoginStartDate(e.target.value)}
                            placeholder="Start Date"
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                        />

                        <input
                            type="date"
                            value={loginEndDate}
                            onChange={(e) => setLoginEndDate(e.target.value)}
                            placeholder="End Date"
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                        />

                        <button onClick={loadLoginHistory} className="btn-primary" style={{ padding: '8px 16px' }}>
                            🔍 Filter
                        </button>

                        <button
                            onClick={() => {
                                setLoginUsername('');
                                setLoginStartDate('');
                                setLoginEndDate('');
                                setTimeout(loadLoginHistory, 100);
                            }}
                            className="btn-secondary"
                            style={{ padding: '8px 16px' }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
                    ) : loginHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                            No login history found
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 8px' }}>Username</th>
                                        <th style={{ textAlign: 'center', padding: '12px 8px' }}>Action</th>
                                        <th style={{ textAlign: 'right', padding: '12px 8px' }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loginHistory.map(record => (
                                        <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <td style={{ padding: '12px 8px' }}>{record.username}</td>
                                            <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 4,
                                                    background: record.action === 'LOGIN' ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)',
                                                    color: record.action === 'LOGIN' ? '#34C759' : '#FF9500',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {record.action === 'LOGIN' ? '✓ LOGIN' : '⊗ LOGOUT'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                {new Date(record.timestamp).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Stock History Tab */}
            {activeTab === 'STOCK' && (
                <div className="glass-card">
                    <h2>Stock Change History</h2>

                    {/* Filters */}
                    <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            value={stockItemName}
                            onChange={(e) => setStockItemName(e.target.value)}
                            placeholder="Search item name..."
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white',
                                minWidth: 200
                            }}
                        />

                        <input
                            type="date"
                            value={stockStartDate}
                            onChange={(e) => setStockStartDate(e.target.value)}
                            placeholder="Start Date"
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                        />

                        <input
                            type="date"
                            value={stockEndDate}
                            onChange={(e) => setStockEndDate(e.target.value)}
                            placeholder="End Date"
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white'
                            }}
                        />

                        <button onClick={loadStockHistory} className="btn-primary" style={{ padding: '8px 16px' }}>
                            🔍 Filter
                        </button>

                        <button
                            onClick={() => {
                                setStockItemName('');
                                setStockStartDate('');
                                setStockEndDate('');
                                setTimeout(loadStockHistory, 100);
                            }}
                            className="btn-secondary"
                            style={{ padding: '8px 16px' }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
                    ) : stockHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                            No stock history found
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 8px' }}>Item Name</th>
                                        <th style={{ textAlign: 'center', padding: '12px 8px' }}>Old Stock</th>
                                        <th style={{ textAlign: 'center', padding: '12px 8px' }}>New Stock</th>
                                        <th style={{ textAlign: 'center', padding: '12px 8px' }}>Change</th>
                                        <th style={{ textAlign: 'center', padding: '12px 8px' }}>Changed By</th>
                                        <th style={{ textAlign: 'right', padding: '12px 8px' }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockHistory.map(record => (
                                        <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{record.item_name}</td>
                                            <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                {record.old_stock}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 'bold' }}>
                                                {record.new_stock}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 4,
                                                    background: record.change_amount > 0 ? 'rgba(52,199,89,0.2)' : record.change_amount < 0 ? 'rgba(255,59,48,0.2)' : 'rgba(128,128,128,0.2)',
                                                    color: record.change_amount > 0 ? '#34C759' : record.change_amount < 0 ? '#FF3B30' : '#888',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {record.change_amount > 0 ? '+' : ''}{record.change_amount}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                {record.changed_by}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                                {new Date(record.timestamp).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
