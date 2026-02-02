import React, { useEffect, useState } from "react";

export default function Tables({ user, onSelectTable }) {
    const [tables, setTables] = useState([]);
    const [totalTables, setTotalTables] = useState(10);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTables();
    }, []);

    function loadTables() {
        setLoading(true);
        fetch("http://localhost:4000/api/tables")
            .then(r => r.json())
            .then(data => {
                setTables(data);
                setTotalTables(data.length);
                setLoading(false);
            });
    }

    function updateConfig() {
        fetch("http://localhost:4000/api/tables/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ total: totalTables })
        }).then(() => loadTables());
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="mt-0">🍽️ Tables</h2>

                {["ADMIN", "SUPER_ADMIN"].includes(user.role) && (
                    <div className="flex gap-2 items-center glass-card p-2" style={{ padding: '8px 16px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Tables:</span>
                        <input
                            type="number"
                            value={totalTables}
                            onChange={e => setTotalTables(e.target.value)}
                            style={{ width: 60, padding: 4 }}
                        />
                        <button className="btn-secondary" onClick={updateConfig}>Set</button>
                    </div>
                )}
            </div>

            <div className="items-grid">
                {tables.map(t => {
                    const isOccupied = t.status === 'OCCUPIED';
                    const totalAmount = t.order.reduce((sum, item) => sum + (item.price * item.qty), 0);

                    return (
                        <div
                            key={t.id}
                            className="glass-card flex flex-col justify-center items-center gap-2"
                            style={{
                                height: 120,
                                borderColor: isOccupied ? 'var(--danger)' : 'var(--success)',
                                borderWidth: 2,
                                cursor: 'pointer',
                                background: isOccupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.05)'
                            }}
                            onClick={() => onSelectTable(t)}
                        >
                            <div style={{ fontSize: 24, fontWeight: 'bold' }}>#{t.id}</div>
                            <div style={{
                                color: isOccupied ? 'var(--danger)' : 'var(--success)',
                                fontWeight: 600,
                                fontSize: 12
                            }}>
                                {isOccupied ? 'OCCUPIED' : 'OBTAINABLE'}
                            </div>
                            {isOccupied && (
                                <div style={{ fontSize: 14, fontWeight: 'bold' }}>₹{totalAmount}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
