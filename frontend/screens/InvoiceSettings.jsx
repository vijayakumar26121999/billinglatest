import React, { useState, useEffect } from "react";

export default function InvoiceSettings({ user }) {
    const [config, setConfig] = useState({ heading: "", address: "", gst_number: "", fssai_id: "", company_name: "", show_watermark: 1 });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("http://localhost:4000/api/invoice-config")
            .then((r) => {
                if (!r.ok) throw new Error("Failed to fetch config");
                return r.json();
            })
            .then((data) => {
                if (data) setConfig({
                    heading: data.heading || "",
                    address: data.address || "",
                    gst_number: data.gst_number || "",
                    fssai_id: data.fssai_id || "",
                    company_name: data.company_name || "",
                    show_watermark: data.show_watermark ?? 1
                });
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    function save() {
        fetch("http://localhost:4000/api/invoice-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...config, role: user.role }),
        })
            .then((r) => r.json())
            .then(() => {
                setMessage("✅ Config saved successfully!");
                setTimeout(() => setMessage(""), 3000);
            });
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex justify-center">
            <div className="glass-card" style={{ width: 500 }}>
                <h2 className="mt-0">🖨 Bill Configuration</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    Customize how your printed bills look on thermal printers.
                </p>

                <div className="flex flex-col gap-4 mt-6">
                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: "bold" }}>Invoice Heading</label>
                        <input
                            type="text"
                            value={config.heading}
                            onChange={(e) => setConfig({ ...config, heading: e.target.value })}
                            placeholder="Restaurant / Store Name"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white" }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: "bold" }}>Address</label>
                        <textarea
                            value={config.address}
                            onChange={(e) => setConfig({ ...config, address: e.target.value })}
                            placeholder="Store Address"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white", minHeight: '60px', resize: 'vertical' }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: "bold" }}>GST Number</label>
                        <input
                            type="text"
                            value={config.gst_number}
                            onChange={(e) => setConfig({ ...config, gst_number: e.target.value })}
                            placeholder="GSTIN/UIN"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white" }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: "bold" }}>Fssai ID :</label>
                        <input
                            type="text"
                            value={config.fssai_id}
                            onChange={(e) => setConfig({ ...config, fssai_id: e.target.value })}
                            placeholder="Fssai License No."
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white" }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: 13, fontWeight: "bold" }}>Company Name (Footer)</label>
                        <input
                            type="text"
                            value={config.company_name}
                            onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                            placeholder="Your Company Name"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white" }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, marginTop: 10 }}>
                        <div>
                            <div style={{ fontWeight: "bold", fontSize: 14 }}>Show Software Watermark</div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                Display "software crafted by www.ctrlplustech.com" at the bottom.
                            </div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={config.show_watermark === 1}
                                onChange={(e) => setConfig({ ...config, show_watermark: e.target.checked ? 1 : 0 })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <button className="btn-bubble w-full" onClick={save} style={{ marginTop: 20 }}>
                        Save Configuration
                    </button>

                    {message && (
                        <div style={{ textAlign: "center", color: "var(--accent)", fontSize: 14, fontWeight: "bold" }}>
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
