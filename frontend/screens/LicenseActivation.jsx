import React, { useState, useRef } from "react";

export default function LicenseActivation({ onActivated }) {
    const [licenseKey, setLicenseKey] = useState("");
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    const handleActivate = async () => {
        if (!licenseKey) return;
        setLoading(true);
        setError("");
        try {
            const response = await fetch("http://localhost:4000/api/license/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ licenseKey })
            });
            const data = await response.json();
            if (data.success) {
                onActivated(data.license);
            } else {
                setError(data.message || data.error || "Failed to activate license");
            }
        } catch (err) {
            setError("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            setLicenseKey(event.target.result);
        };
        reader.readAsText(file);
    };

    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#020617] p-4 text-white font-sans">
            <div className="glass-card" style={{ maxWidth: 600, width: '100%', padding: '40px' }}>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Activation</h1>
                    <p className="text-gray-400 text-sm">
                        Please provide a valid license key or file to activate your Application.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* File Upload Area */}
                    <div className="flex items-center justify-between p-6 border border-white/10 rounded-xl bg-white/5">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-300">Upload License File</span>
                            <span className="text-xs text-gray-500 mt-1">{fileName || "No file chosen"}</span>
                        </div>
                        <div>
                            <input
                                type="file"
                                accept=".lic"
                                onChange={handleFileUpload}
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={triggerFileSelect}
                                className="btn-secondary text-xs uppercase tracking-wide font-bold hover:bg-white/10"
                            >
                                Choose File
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-400 whitespace-nowrap">
                            To get your license contact <a href="mailto:support@ctrlplustech.com" className="text-blue-400 hover:text-blue-300 font-bold transition-colors ml-1">support@ctrlplustech.com</a>
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-6 w-full">
                        <button
                            onClick={handleActivate}
                            disabled={loading || !licenseKey}
                            className="btn-bubble w-full py-3 rounded-xl font-bold uppercase tracking-wide text-sm"
                            style={{ height: 'auto', opacity: (!licenseKey || loading) ? 0.5 : 1, cursor: (!licenseKey || loading) ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? "Activating..." : "Activate Now"}
                        </button>

                        <div className="flex justify-center w-full opacity-30 select-none" style={{ fontSize: "10px", color: "#94a3b8" }}>
                            Copyrights <a href="http://www.ctrlplustech.com" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} onMouseOver={(e) => e.target.style.textDecoration = "underline"} onMouseOut={(e) => e.target.style.textDecoration = "none"}>CtrlPlusTech</a>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
