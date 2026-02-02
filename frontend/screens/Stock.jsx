import React, { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";

export default function Stock({ user }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, OUT_OF_STOCK, RECENT
  const [appType, setAppType] = useState('RESTAURANT');

  function load() {
    fetch("http://localhost:4000/api/items")
      .then(r => r.json())
      .then(setItems);

    fetch("http://localhost:4000/api/app-config")
      .then(r => r.json())
      .then(data => setAppType(data.app_type));
  }

  useEffect(load, []);

  function update(id, stock) {
    fetch("http://localhost:4000/api/stock/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock, role: user.role, username: user.username })
    }).then(load);
  }

  function updateWholesale(id, wholesale_price) {
    fetch("http://localhost:4000/api/stock/update-wholesale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, wholesale_price, role: user.role })
    }).then(load);
  }

  function updateDescription(id, description) {
    fetch("http://localhost:4000/api/stock/update-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, description, role: user.role })
    }).then(load);
  }

  function downloadBarcode(item) {
    if (!item.product_id) return;

    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, item.product_id, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `barcode-${item.name}-${item.product_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Invalid Product ID for Barcode");
    }
  }

  const filteredItems = items.filter(i => {
    // 1. Search
    if (!i.name.toLowerCase().includes(search.toLowerCase())) return false;

    // 2. Filter Type
    if (filterType === 'OUT_OF_STOCK') return i.stock <= 0;

    return true;
  }).sort((a, b) => {
    if (filterType === 'RECENT') {
      return b.id - a.id; // Descending ID
    }
    return 0;
  });

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2">
          <h2 className="m-0">📦 Stock Management</h2>
          <div className="flex gap-2">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
              { id: 'RECENT', label: 'Recently Added' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`btn-secondary ${filterType === f.id ? 'active' : ''}`}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  borderRadius: 12,
                  background: filterType === f.id ? '#fff' : 'rgba(255,255,255,0.1)',
                  color: filterType === f.id ? '#000' : '#fff'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <input
          placeholder="🔍 Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 250 }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* Header Row */}
        <div className="flex items-center p-2 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: 13 }}>
          <div style={{ flex: 2 }}>Item Name</div>
          <div style={{ flex: 1 }}>Product ID</div>
          {appType === 'GROCERY' && (
            <>
              <div style={{ flex: 1 }}>Wholesale Price</div>
              <div style={{ flex: 1.5 }}>Description</div>
            </>
          )}
          <div style={{ flex: 1 }}>Barcode</div>
          <div style={{ flex: 1 }}>Expiry</div>
          <div style={{ flex: 1, textAlign: 'right' }}>Available Stock</div>
        </div>

        {filteredItems.map(i => (
          <div
            key={i.id}
            className="flex items-center p-2"
            style={{
              borderBottom: '1px solid var(--glass-border)',
              color: i.stock <= 0 ? '#ff6b6b' : 'inherit',
              background: i.stock <= 0 ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
              borderRadius: 4
            }}
          >
            <div style={{ flex: 2, fontWeight: 600 }}>{i.name}</div>
            <div style={{ flex: 1, fontFamily: 'monospace', color: i.stock <= 0 ? '#ff6b6b' : 'var(--accent)' }}>
              {i.product_id || '----'}
            </div>
            {appType === 'GROCERY' && (
              <>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>₹</span>
                  <input
                    type="number"
                    value={i.wholesale_price || 0}
                    onChange={e => updateWholesale(i.id, e.target.value)}
                    disabled={!["ADMIN", "SUPER_ADMIN"].includes(user.role)}
                    style={{
                      width: 80,
                      padding: 4,
                      textAlign: 'right',
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.2)',
                      opacity: ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? 1 : 0.6,
                      cursor: ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', paddingRight: 10 }}>
                  <input
                    placeholder="Add description..."
                    value={i.description || ""}
                    onChange={e => updateDescription(i.id, e.target.value)}
                    disabled={!["ADMIN", "SUPER_ADMIN"].includes(user.role)}
                    style={{
                      width: '100%',
                      padding: 4,
                      fontSize: 12,
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.2)',
                      opacity: ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? 1 : 0.6,
                      cursor: ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? 'text' : 'not-allowed'
                    }}
                  />
                </div>
              </>
            )}
            <div style={{ flex: 1 }}>
              <button
                onClick={() => downloadBarcode(i)}
                className="btn-secondary"
                disabled={!i.product_id}
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  opacity: i.product_id ? 1 : 0.5,
                  cursor: i.product_id ? 'pointer' : 'not-allowed'
                }}
              >
                ⬇ Download
              </button>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
              {i.expiry_date ? new Date(i.expiry_date).toLocaleDateString() : '-'}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                value={i.stock || 0}
                onChange={e => update(i.id, e.target.value)}
                style={{
                  width: 80,
                  padding: 4,
                  textAlign: 'right',
                  color: i.stock <= 0 ? '#ff6b6b' : 'white',
                  borderColor: i.stock <= 0 ? '#ff6b6b' : 'rgba(255,255,255,0.2)'
                }}
              />
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="p-4 text-center text-secondary">No items found</div>
        )}
      </div>
    </div >
  );
}
