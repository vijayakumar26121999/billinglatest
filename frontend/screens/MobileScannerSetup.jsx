import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function MobileScannerSetup({ user }) {
    const [ips, setIps] = useState([]);
    const [selectedIp, setSelectedIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [pairingCode, setPairingCode] = useState(null);

    useEffect(() => {
        // Fetch IPs
        fetch('http://localhost:4000/api/network-ip')
            .then(res => res.json())
            .then(data => {
                setIps(data.ips || []);
                if (data.ips && data.ips.length > 0) {
                    setSelectedIp(data.ips[0].address);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch IP", err);
                setLoading(false);
            });

        // Fetch Pairing Code
        fetch('http://localhost:4000/api/pairing-code')
            .then(res => res.json())
            .then(data => setPairingCode(data.code));
    }, []);

    const connectionUrl = selectedIp ? `http://${selectedIp}:4000/scanner.html` : '';

    return (
        <div className="glass-card flex flex-col items-center justify-center p-6" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="mb-2">📱 Mobile Barcode Scanner Setup</h2>
            <p className="text-secondary mb-6">
                Turn your mobile phone into a wireless scanner for your point of sale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <div className="text-left">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70">1. Configuration</h3>

                    <div className="mb-6">
                        <label className="block text-xs font-bold mb-1 opacity-60">SELECT NETWORK INTERFACE</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm"
                            value={selectedIp}
                            onChange={(e) => setSelectedIp(e.target.value)}
                        >
                            {ips.map(ip => (
                                <option key={ip.address} value={ip.address}>
                                    {ip.name}: {ip.address}
                                </option>
                            ))}
                            {ips.length === 0 && <option>No networks found</option>}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-2 italic">
                            ⚡ Fast & reliable. The system is optimized to use your local WiFi network.
                        </p>
                    </div>

                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-70">2. Instructions</h3>
                    <ol className="text-sm text-secondary space-y-3">
                        <li>Ensure your phone is on <strong>{ips.find(i => i.address === selectedIp)?.name || 'the same'}</strong> WiFi.</li>
                        <li>Open the <strong>Mobile Scanner</strong> app on your phone.</li>
                        <li>Scan the QR code to sync with this PC.</li>
                        <li>Login as <strong>{user.username}</strong> on your phone.</li>
                    </ol>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <div style={{ background: 'white', padding: 25, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', marginBottom: 20 }}>
                        {loading ? (
                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50">
                                <span className="text-slate-400">Loading...</span>
                            </div>
                        ) : selectedIp && selectedIp !== 'localhost' ? (
                            <QRCodeCanvas value={connectionUrl} size={200} />
                        ) : (
                            <div className="w-[200px] flex flex-col items-center justify-center">
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📡</div>
                                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>No Network Detected</div>
                                <div style={{ color: '#666', fontSize: '11px', marginTop: '5px' }}>Connect to WiFi to generate QR code.</div>
                            </div>
                        )}
                    </div>

                    {pairingCode && (
                        <div className="glass-card flex flex-col items-center p-4 mb-4 border border-blue-500/30 bg-blue-500/10">
                            <span className="text-xs uppercase font-bold text-blue-300 tracking-wider mb-2">Pairing Code</span>
                            <span className="text-4xl font-mono font-bold text-white tracking-widest">{pairingCode}</span>
                            <span className="text-[10px] text-blue-200/50 mt-2">Enter this code in the mobile app</span>
                        </div>
                    )}

                    {connectionUrl && (
                        <div className="bg-slate-900/50 p-2 px-4 rounded-full border border-slate-700/50">
                            <code className="text-xs text-blue-400">{connectionUrl}</code>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
