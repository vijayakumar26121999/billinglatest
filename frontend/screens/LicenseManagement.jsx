import React, { useState, useEffect } from "react";
import { format } from "date-fns";

export default function LicenseManagement({ user }) {
    const [licenseInfo, setLicenseInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchLicenseStatus = async () => {
        try {
            const response = await fetch("http://localhost:4000/api/license/status");
            const data = await response.json();
            setLicenseInfo(data.license);
        } catch (error) {
            console.error("Failed to fetch license status", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenseStatus();
    }, []);

    const handleRemoveLicense = async () => {
        if (!confirm("Are you sure you want to remove the current license? The application will be locked immediately.")) {
            return;
        }

        try {
            const response = await fetch("http://localhost:4000/api/license/remove", {
                method: "POST"
            });
            const data = await response.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert("Failed to remove license");
            }
        } catch (error) {
            alert("Failed to connect to server");
        }
    };

    if (loading) return <div>Loading License Data...</div>;

    return (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="m-0 text-xl font-bold">License Management</h2>
                {licenseInfo && (
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-opacity-20 border"
                        style={{
                            backgroundColor: licenseInfo.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: licenseInfo.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                            color: licenseInfo.status === 'ACTIVE' ? '#86efac' : '#fca5a5'
                        }}
                    >
                        {licenseInfo.status}
                    </span>
                )}
            </div>

            {licenseInfo ? (
                <>
                    <div className="overflow-x-auto mb-8">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td className="py-3 text-sm font-bold text-gray-400">Registered Store</td>
                                    <td className="py-3 text-right font-medium">{licenseInfo.customerName}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td className="py-3 text-sm font-bold text-gray-400">Activation Date</td>
                                    <td className="py-3 text-right font-medium font-mono text-xs text-gray-300">
                                        {format(new Date(licenseInfo.activationDate), 'dd MMM yyyy, hh:mm a')}
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td className="py-3 text-sm font-bold text-gray-400">Expiry Date</td>
                                    <td className="py-3 text-right font-medium font-mono text-xs text-gray-300">
                                        {format(new Date(licenseInfo.expiryDate), 'dd MMM yyyy, hh:mm a')}
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td className="py-3 text-sm font-bold text-gray-400">Instance ID</td>
                                    <td className="py-3 text-right font-medium font-mono text-xs text-gray-500">
                                        ANT-{licenseInfo.generatedAt?.split('T')[0].replace(/-/g, '') || 'UNKNOWN'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Active Modules</h3>
                        <div className="flex gap-3 flex-wrap">
                            {licenseInfo.features.map(f => (
                                <div key={f} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-gray-500 max-w-sm">
                            Need to move license to another machine? Deactivate here first.
                        </div>
                        <button
                            onClick={handleRemoveLicense}
                            className="btn-danger"
                            style={{ fontSize: 12, padding: '8px 16px' }}
                        >
                            Deactivate License
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    No active license found.
                </div>
            )}
        </div>
    );
}
