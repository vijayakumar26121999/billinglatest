import React, { useState, useEffect } from "react";

export default function AppConfig({ user, onTypeChange, licenseFeatures = [] }) {
    const [appType, setAppType] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const canRestaurant = licenseFeatures.includes('restaurant');
    const canRetail = licenseFeatures.includes('retail');

    useEffect(() => {
        fetch("http://localhost:4000/api/global-config")
            .then(r => r.json())
            .then(data => {
                setAppType(data.app_type);
                setLoading(false);
            });
    }, []);

    function handleSave(type) {
        if (!confirm(`Switching to ${type} will use a separate database and change the UI. Continue?`)) return;

        setLoading(true);
        fetch("http://localhost:4000/api/global-config/type", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, role: user.role })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setAppType(data.app_type);
                    setMessage(`✅ Application type changed to ${data.app_type}. Restarting to apply changes...`);
                    if (onTypeChange) onTypeChange(data.app_type);

                    // Trigger Electron restart if available
                    setTimeout(() => {
                        if (window.electronAPI && window.electronAPI.restartApp) {
                            window.electronAPI.restartApp();
                        } else {
                            setMessage(`✅ Changed to ${data.app_type}. Please restart the application manually.`);
                        }
                    }, 1500);
                } else {
                    alert("Error: " + data.error);
                }
                setLoading(false);
            });
    }

    if (loading) return <div>Loading Configuration...</div>;

    // If only one license type is available, just show a message.
    // Assuming if they have access to this screen, at least one is valid.
    // If they have NEITHER, checking logic in parent should likely prevent access, but handling gracefully.

    // Logic: 
    // If BOTH: Show both cards clickable.
    // If ONE: Show only the allowed card (maybe non-clickable or just info status).

    return (
        <div className="flex justify-center">
            <div className="glass-card" style={{ width: 500 }}>
                <h2 className="mt-0">⚙️ Application Type Configuration</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    Select the type of business this application is configured for.
                </p>

                {message && (
                    <div style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
                        {message}
                    </div>
                )}

                <div className="flex flex-col gap-6 mt-8">
                    {/* Restaurant Card */}
                    {(canRestaurant || (appType === 'RESTAURANT' && !canRetail)) && (
                        <div
                            className={`p-4 transition-all ${canRestaurant ? 'cursor-pointer hover:bg-white/5' : 'opacity-80'} ${appType === 'RESTAURANT' ? 'ring-2 ring-accent' : ''}`}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: canRestaurant ? 'pointer' : 'default'
                            }}
                            onClick={() => {
                                if (canRestaurant) {
                                    handleSave('RESTAURANT');
                                } else {
                                    alert("This feature is not available in your current license.");
                                }
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="m-0">🍴 Restaurant</h3>
                                    <p className="m-0" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Enables Tables, Dine-In, and Food Item classification.
                                    </p>
                                    {!canRestaurant && <span className="text-xs text-red-400 mt-1 block">License not active for this module</span>}
                                </div>
                                {appType === 'RESTAURANT' && <span style={{ color: 'var(--accent)' }}>● Active</span>}
                            </div>
                        </div>
                    )}

                    {/* Retail / Grocery Card */}
                    {(canRetail || (appType === 'GROCERY' && !canRestaurant)) && (
                        <div
                            className={`p-4 transition-all ${canRetail ? 'cursor-pointer hover:bg-white/5' : 'opacity-80'} ${appType === 'GROCERY' ? 'ring-2 ring-accent' : ''}`}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: canRetail ? 'pointer' : 'default'
                            }}
                            onClick={() => {
                                if (canRetail) {
                                    handleSave('GROCERY');
                                } else {
                                    alert("This feature is not available in your current license.");
                                }
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="m-0">🛒 Grocery / Retail</h3>
                                    <p className="m-0" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Hides table features. Renames Food Items to Items.
                                    </p>
                                    {!canRetail && <span className="text-xs text-red-400 mt-1 block">License not active for this module</span>}
                                </div>
                                {appType === 'GROCERY' && <span style={{ color: 'var(--accent)' }}>● Active</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Database switch is handled by the backend automatically.
                </div>
            </div>
        </div>
    );
}
