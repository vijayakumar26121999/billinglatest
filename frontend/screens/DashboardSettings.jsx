import React, { useState, useEffect } from "react";

export default function DashboardSettings({ user }) {
    const [config, setConfig] = useState({
        show_sales_trend: 1,
        show_top_items: 1,
        show_payment_methods: 1,
        show_stock_alerts: 1,
        default_time_range: 'LAST_7_DAYS'
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("http://localhost:4000/api/dashboard-config")
            .then(r => r.json())
            .then(data => {
                if (data.id) setConfig(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    function save() {
        fetch("http://localhost:4000/api/dashboard-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...config, role: user.role }),
        })
            .then(r => r.json())
            .then(() => {
                setMessage("✅ Dashboard settings saved successfully!");
                setTimeout(() => setMessage(""), 3000);
            });
    }

    if (user.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex justify-center items-center" style={{ height: '60vh' }}>
                <div className="glass-card" style={{ width: 400, textAlign: 'center' }}>
                    <h2>🔒 Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Only SUPER_ADMIN can configure dashboard settings.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) return <div>Loading...</div>;

    const timeRangeOptions = [
        { value: 'TODAY', label: 'Today' },
        { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
        { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
        { value: 'LAST_3_MONTHS', label: 'Last 3 Months' }
    ];

    return (
        <div className="flex justify-center">
            <div className="glass-card" style={{ width: 600 }}>
                <h2 className="mt-0">⚙️ Dashboard Settings</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    Configure which charts and metrics to display on the dashboard.
                </p>

                <div className="flex flex-col gap-4 mt-6">
                    {/* Chart Visibility Toggles */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 16 }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>📊 Chart Visibility</h3>

                        <div className="flex items-center justify-between p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 14 }}>Sales Trend Chart</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    Line chart showing sales over time
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={config.show_sales_trend === 1}
                                    onChange={e => setConfig({ ...config, show_sales_trend: e.target.checked ? 1 : 0 })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>



                        <div className="flex items-center justify-between p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 14 }}>Top Selling Items</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    Bar chart showing best-performing products
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={config.show_top_items === 1}
                                    onChange={e => setConfig({ ...config, show_top_items: e.target.checked ? 1 : 0 })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 14 }}>Payment Methods</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    Pie chart showing payment distribution
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={config.show_payment_methods === 1}
                                    onChange={e => setConfig({ ...config, show_payment_methods: e.target.checked ? 1 : 0 })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 14 }}>Stock Alerts</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    Table showing low stock items
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={config.show_stock_alerts === 1}
                                    onChange={e => setConfig({ ...config, show_stock_alerts: e.target.checked ? 1 : 0 })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                    {/* Default Time Range */}
                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: 'bold' }}>Default Time Range</label>
                        <select
                            value={config.default_time_range}
                            onChange={e => setConfig({ ...config, default_time_range: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {timeRangeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            This will be the default time range when the dashboard loads
                        </div>
                    </div>

                    <button className="btn-bubble w-full" onClick={save} style={{ marginTop: 20 }}>
                        Save Settings
                    </button>

                    {message && (
                        <div style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 14, fontWeight: 'bold' }}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255,255,255,0.2);
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .slider {
          background-color: #34C759;
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>
        </div>
    );
}
