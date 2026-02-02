import React, { useEffect, useState } from "react";

export default function InvoiceHistory({ initialBillId, appType, initialPaymentFilter = "ALL", initialDateRange = "ALL" }) {
    const [bills, setBills] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [dateRange, setDateRange] = useState(initialDateRange);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [paymentFilter, setPaymentFilter] = useState(initialPaymentFilter);
    const [search, setSearch] = useState("");
    const [isBold, setIsBold] = useState(false);
    const [invoiceConfig, setInvoiceConfig] = useState({ heading: "BILLING POS", show_watermark: 1 });

    useEffect(() => {
        setPaymentFilter(initialPaymentFilter);
        setDateRange(initialDateRange);
    }, [initialPaymentFilter, initialDateRange]);

    useEffect(() => {
        fetch("http://localhost:4000/api/invoice-config")
            .then(r => r.json())
            .then(setInvoiceConfig);
    }, []);

    useEffect(() => {
        let url = `http://localhost:4000/api/bills?type=${filter}&paymentMethod=${paymentFilter}`;

        let start = "";
        let end = "";
        const today = new Date().toISOString().split('T')[0];

        if (dateRange === 'TODAY') {
            start = today;
            end = today;
        } else if (dateRange === 'LAST_7_DAYS') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
            end = today;
        } else if (dateRange === 'CUSTOM') {
            start = customStart;
            end = customEnd;
        }

        if (start) url += `&startDate=${start}`;
        if (end) url += `&endDate=${end}`;

        fetch(url)
            .then(r => r.json())
            .then(setBills);
    }, [filter, dateRange, customStart, customEnd, paymentFilter]);

    useEffect(() => {
        if (initialBillId) {
            viewBill(initialBillId);
        }
    }, [initialBillId]);

    function viewBill(id) {
        fetch(`http://localhost:4000/api/bills/${id}`)
            .then(r => r.json())
            .then(setSelectedBill);
    }

    const filteredBills = bills.filter(b => {
        if (search) {
            return b.id.toString().includes(search.toLowerCase());
        }
        return true;
    });

    return (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 100px)' }}>
            {/* LEFT: LIST */}
            <div className="glass-card flex flex-col gap-4" style={{ flex: 1, overflowY: 'hidden' }}>
                <div className="flex justify-between items-center">
                    <h2 className="mt-0">📜 Bill History</h2>
                    <input
                        placeholder="🔍 Search Bill ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 180 }}
                    />
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>From:</label>
                        <select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value)}
                            className="bg-glass-input"
                            style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontSize: 12, outline: 'none' }}
                        >
                            <option value="ALL" style={{ background: '#222' }}>All</option>
                            <option value="TODAY" style={{ background: '#222' }}>Today</option>
                            <option value="LAST_7_DAYS" style={{ background: '#222' }}>7 Day</option>
                            <option value="CUSTOM" style={{ background: '#222' }}>Custom</option>
                        </select>
                    </div>

                    {dateRange === 'CUSTOM' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontSize: 11 }}
                            />
                            <span style={{ fontSize: 11 }}>to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontSize: 11 }}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Payment type:</label>
                        <select
                            value={paymentFilter}
                            onChange={e => setPaymentFilter(e.target.value)}
                            className="bg-glass-input"
                            style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontSize: 12, outline: 'none' }}
                        >
                            <option value="ALL" style={{ background: '#222' }}>All</option>
                            <option value="CASH" style={{ background: '#222' }}>Cash</option>
                            <option value="UPI" style={{ background: '#222' }}>UPI</option>
                            <option value="CARD" style={{ background: '#222' }}>Card</option>
                        </select>
                    </div>
                </div>

                {/* Filters */}
                {appType !== 'GROCERY' && (
                    <div className="flex gap-2">
                        {["ALL", "DINE_IN", "TAKE_AWAY"].map(f => (
                            <button
                                key={f}
                                className={`btn-secondary ${filter === f ? "active" : ""}`}
                                style={{
                                    background: filter === f ? '#fff' : 'rgba(255,255,255,0.1)',
                                    color: filter === f ? '#000' : '#fff',
                                    padding: '4px 12px',
                                    fontSize: 12,
                                    borderRadius: 12
                                }}
                                onClick={() => setFilter(f)}
                            >
                                {f.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-2 custom-scrollbar" style={{ overflowY: 'auto', paddingRight: 12 }}>
                    {filteredBills.map(b => (
                        <div
                            key={b.id}
                            className="p-3 flex justify-between items-center bill-item-row"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                border: selectedBill?.id === b.id ? '1px solid var(--accent)' : '1px solid transparent'
                            }}
                            onClick={() => viewBill(b.id)}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span style={{ fontWeight: 'bold' }}>#{b.id}</span>
                                    {b.type === "DINE_IN" ? (
                                        <span style={{ fontSize: 10, background: '#3b82f6', padding: '2px 6px', borderRadius: 4 }}>
                                            Table {b.table_no}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 10, background: '#f59e0b', padding: '2px 6px', borderRadius: 4, color: 'black' }}>
                                            Take Away
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(b.created_at).toLocaleString()}
                                </div>
                            </div>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                ₹{b.total}
                            </div>
                        </div>
                    ))}
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: var(--accent);
                    }
                    .bill-item-row:hover {
                        background: rgba(255, 255, 255, 0.1) !important;
                        transform: translateY(-1px);
                        transition: all 0.2s ease;
                    }
                `}</style>
            </div>

            {/* RIGHT: DETAILS */}
            <div className="glass-card printable-parent" style={{ flex: 1 }}>
                {selectedBill ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="mt-0">🧾 Bill ID : {selectedBill.id}</h3>
                            <div className="flex items-center gap-3 no-print">
                                <label className="flex items-center gap-2 cursor-pointer text-secondary" style={{ fontSize: 13 }}>
                                    <input type="checkbox" checked={isBold} onChange={(e) => setIsBold(e.target.checked)} />
                                    <b>BOLD</b>
                                </label>
                                <button
                                    className="btn-secondary"
                                    onClick={() => window.print()}
                                >
                                    🖨 Print
                                </button>
                            </div>
                        </div>

                        <div className="printable-invoice" style={{ background: '#fff', color: '#000', padding: 20, borderRadius: 8, fontWeight: isBold ? 'bold' : 'normal' }}>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                {(() => {
                                    // Use snapshot if available, otherwise fallback to current global config
                                    const configToUse = selectedBill.invoice_config_snapshot
                                        ? JSON.parse(selectedBill.invoice_config_snapshot)
                                        : invoiceConfig;

                                    return (
                                        <>
                                            <h2 style={{ fontSize: 24, margin: '0 0 5px 0' }}>{configToUse.heading}</h2>

                                            {(() => {
                                                const hasTaxIds = configToUse.gst_number || configToUse.fssai_id;
                                                return (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: hasTaxIds ? 'space-between' : 'center',
                                                        fontSize: 10,
                                                        marginTop: 5,
                                                        marginBottom: 10,
                                                        borderBottom: '1px solid #eee',
                                                        paddingBottom: 5,
                                                        textAlign: hasTaxIds ? 'left' : 'center'
                                                    }}>
                                                        <div style={{ maxWidth: hasTaxIds ? '60%' : '100%', whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                                            {configToUse.address}
                                                        </div>
                                                        {hasTaxIds && (
                                                            <div style={{ textAlign: 'right', fontSize: 13 }}>
                                                                {configToUse.gst_number && <div>GST: {configToUse.gst_number}</div>}
                                                                {configToUse.fssai_id && <div>Fssai ID : {configToUse.fssai_id}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    );
                                })()}

                                <p style={{ fontSize: 14, margin: 0, fontWeight: 'bold' }}>Bill ID : {selectedBill.id}</p>
                                <p style={{ fontSize: 14, margin: 0 }}>{new Date(selectedBill.created_at).toLocaleString()}</p>
                                {selectedBill.type === 'DINE_IN' && (
                                    <p style={{ marginTop: 5, fontWeight: 'bold', fontSize: 14 }}>Table No: {selectedBill.table_no}</p>
                                )}
                                <p style={{ marginTop: 5, fontSize: 14 }}>{(selectedBill.type || "TAKE_AWAY").replace("_", " ")} | <b>{selectedBill.payment_method || 'CASH'}</b></p>
                                {(selectedBill.customer_name || selectedBill.customer_phone) && (
                                    <div style={{ marginTop: 10, textAlign: 'left', borderTop: '1px dashed #eee', paddingTop: 5 }}>
                                        {selectedBill.customer_name && <div>Customer: <b>{selectedBill.customer_name}</b></div>}
                                        {selectedBill.customer_phone && <div>Phone: {selectedBill.customer_phone}</div>}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: 15 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #000' }}>
                                            <th style={{ textAlign: 'left', padding: '5px 10px 5px 0', width: '40px' }}>S.No</th>
                                            <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                                            <th style={{ textAlign: 'center', padding: '5px 0', width: '40px' }}>Qty</th>
                                            <th style={{ textAlign: 'right', padding: '5px 0', width: '60px' }}>MRP</th>
                                            <th style={{ textAlign: 'right', padding: '5px 0', width: '60px' }}>Price</th>
                                            <th style={{ textAlign: 'right', padding: '5px 0', width: '70px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedBill.items && selectedBill.items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                                                <td style={{ padding: '5px 0' }}>{idx + 1}</td>
                                                <td style={{ padding: '5px 0' }}>{item.item_name}</td>
                                                <td style={{ padding: '5px 0', textAlign: 'center' }}>{item.qty}</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right' }}>{item.mrp || item.price}</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right' }}>{item.price}</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right' }}>{(item.price * item.qty).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        {(() => {
                                            const billTotalQty = selectedBill.items ? selectedBill.items.reduce((acc, item) => acc + item.qty, 0) : 0;
                                            return (
                                                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                                                    <td colSpan="2" style={{ textAlign: 'right', padding: '5px 10px 5px 0' }}>Total Qty</td>
                                                    <td style={{ textAlign: 'center', padding: '5px 0' }}>{billTotalQty}</td>
                                                    <td colSpan="3"></td>
                                                </tr>
                                            );
                                        })()}
                                    </tfoot>
                                </table>
                            </div>

                            {/* Tax Breakdown */}
                            {selectedBill.items && selectedBill.items.some(i => i.tax > 0) && (
                                <div style={{ marginBottom: 15, fontSize: 12, color: '#555', borderTop: '1px dashed #eee', paddingTop: 10 }}>
                                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>Tax Details:</p>
                                    {selectedBill.items.map((item, idx) => (
                                        item.tax > 0 ? (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <span>{item.item_name} ({item.tax}%)</span>
                                                <span>₹{(item.price * item.qty * (item.tax / 100)).toFixed(2)}</span>
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            )}

                            {(() => {
                                const billSubtotal = selectedBill.items ? selectedBill.items.reduce((acc, item) => acc + item.price * item.qty, 0) : 0;
                                const billTotalQty = selectedBill.items ? selectedBill.items.reduce((acc, item) => acc + item.qty, 0) : 0;
                                const billTotalTax = selectedBill.items ? selectedBill.items.reduce((acc, item) => acc + (item.price * item.qty * (item.tax / 100 || 0)), 0) : 0;
                                const billCGST = billTotalTax / 2;
                                const billSGST = billTotalTax / 2;
                                const billDiscount = Math.max(0, (billSubtotal + billTotalTax) - selectedBill.total);

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #000', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>Subtotal</span>
                                            <span>₹{billSubtotal.toFixed(2)}</span>
                                        </div>
                                        {billCGST > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span>CGST</span>
                                                <span>₹{billCGST.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {billSGST > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span>SGST</span>
                                                <span>₹{billSGST.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {billDiscount > 0.5 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                <span>Discount</span>
                                                <span>-₹{billDiscount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '5px' }}>
                                            <span>Grand Total</span>
                                            <span>₹{selectedBill.total.toFixed(2)}</span>
                                        </div>
                                        {selectedBill.payment_method === 'CASH' && selectedBill.cash_received > 0 && (
                                            <div style={{ marginTop: 10, borderTop: '1px dashed #eee', paddingTop: 5 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                                    <span>Cash Received</span>
                                                    <span>₹{selectedBill.cash_received.toFixed(2)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                                                    <span>Change Returned</span>
                                                    <span>₹{selectedBill.change_due.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div style={{ textAlign: 'center', marginTop: 30, borderTop: '1px dashed #000', paddingTop: 10 }}>
                                {selectedBill.billed_by && (
                                    <div style={{ fontSize: 13, marginBottom: 10 }}>
                                        Billed By: <b>{selectedBill.billed_by}</b>
                                    </div>
                                )}
                                <div style={{ fontSize: 16, fontWeight: 'bold' }}>Thanks! Visit again</div>
                                {(() => {
                                    const configToUse = selectedBill.invoice_config_snapshot
                                        ? JSON.parse(selectedBill.invoice_config_snapshot)
                                        : invoiceConfig;
                                    return (
                                        <>
                                            <div style={{ fontSize: 12, marginTop: 10 }}>
                                                <b>{configToUse.company_name}</b>
                                            </div>
                                            {configToUse.show_watermark === 1 && (
                                                <div style={{ fontSize: 10, marginTop: 10, color: '#444' }}>
                                                    software crafted by <b>www.ctrlplustech.com</b>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                        Select a bill to view details
                    </div>
                )}
            </div>
        </div>
    );
}
