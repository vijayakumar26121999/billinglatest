import React, { useEffect, useState } from "react";

export default function FoodItems({ appType, newItemData, onUpdateNewItem }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const { name, price, mrp, tax, category, stock, editingId, expiry_date } = newItemData;

  const updateField = (field, value) => {
    onUpdateNewItem({ [field]: value });
  };

  function load() {
    fetch("http://localhost:4000/api/items")
      .then(r => r.json())
      .then(data => {
        // Backend returns active=1 items
        setItems(data);
      });
  }

  useEffect(load, []);

  function save() {
    if (!name || !price) {
      alert("Name & price required");
      return;
    }

    const payload = {
      name,
      price: Number(price),
      mrp: Number(mrp),
      tax: Number(tax),
      category,
      category,
      stock: Number(stock),
      expiry_date: newItemData.expiry_date
    };

    if (editingId) {
      // UPDATE
      fetch("http://localhost:4000/api/items/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingId })
      }).then(() => {
        forceReset();
        load();
      });
    } else {
      // ADD
      fetch("http://localhost:4000/api/items/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(() => {
        forceReset();
        load();
      });
    }
  }

  function edit(item) {
    if (hasChanges()) {
      if (!confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        return;
      }
    }

    onUpdateNewItem({
      editingId: item.id,
      name: item.name,
      price: item.price,
      mrp: item.mrp || "",
      tax: item.tax,
      category: item.category,
      category: item.category,
      stock: item.stock || 0,
      expiry_date: item.expiry_date || ""
    });
  }

  function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    fetch("http://localhost:4000/api/items/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: 0 })
    }).then(() => load());
  }

  function hasChanges() {
    if (!editingId) return name !== "" || price !== "" || mrp !== "" || tax !== "" || category !== "";
    const original = items.find(i => i.id === editingId);
    if (!original) return false;
    return (
      name !== original.name ||
      Number(price) !== original.price ||
      Number(mrp) !== (original.mrp || 0) ||
      Number(tax) !== (original.tax || 0) ||
      category !== (original.category || "") ||
      category !== (original.category || "") ||
      Number(stock) !== (original.stock || 0) ||
      (newItemData.expiry_date || "") !== (original.expiry_date || "")
    );
  }

  function resetForm() {
    if (hasChanges()) {
      if (!confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        return;
      }
    }
    forceReset();
  }

  function forceReset() {
    onUpdateNewItem({
      editingId: null,
      name: "",
      price: "",
      mrp: "",
      tax: "",
      category: "",
      category: "",
      stock: "",
      expiry_date: ""
    });
  }

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category && i.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="responsive-container" style={{ minHeight: 'calc(100vh - 100px)', paddingBottom: '2rem' }}>
      {/* LEFT: FORM */}
      <div className="glass-card flex flex-col gap-4" style={{ flex: 1, minWidth: 300 }}>
        <h2 className="mt-0">{editingId ? "✏️ Edit Item" : "➕ Add New Item"}</h2>

        <div className="flex flex-col gap-2">
          <label className="text-secondary text-sm">Name</label>
          <input
            placeholder="e.g. Cheese Burger"
            value={name}
            onChange={e => updateField("name", e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-secondary text-sm">Price (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={e => updateField("price", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-secondary text-sm">MRP (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={mrp}
              onChange={e => updateField("mrp", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-secondary text-sm">Tax (%)</label>
            <input
              type="number"
              placeholder="5"
              value={tax}
              onChange={e => updateField("tax", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-secondary text-sm">Stock Level</label>
            <input
              type="number"
              placeholder="0"
              value={stock}
              onChange={e => updateField("stock", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-secondary text-sm">Expiry Date</label>
          <input
            type="date"
            value={newItemData.expiry_date || ""}
            onChange={e => updateField("expiry_date", e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-secondary text-sm">Category</label>
          <input
            placeholder="e.g. Fast Food"
            value={category}
            onChange={e => updateField("category", e.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-2">
          {editingId && (
            <button className="btn-secondary flex-1" onClick={resetForm}>
              CANCEL
            </button>
          )}
          <button className="btn-bubble flex-1" onClick={save}>
            {editingId ? "UPDATE ITEM" : "ADD ITEM"}
          </button>
        </div>
      </div>

      {/* RIGHT: LIST */}
      <div className="glass-card flex flex-col gap-4" style={{ flex: 2, overflow: 'hidden' }}>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h2 className="mt-0">{appType === 'GROCERY' ? "🛒 Store Items" : "🍔 Food Items"}</h2>
            <input
              placeholder="🔍 Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
          </div>
          {editingId && (
            <div className="flex justify-end">
              <button
                className="btn-bubble"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={resetForm}
              >
                ➕ Add New Item
              </button>
            </div>
          )}
        </div>

        <div className="responsive-table-wrapper" style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(10px)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                <th className="p-3 text-secondary">Name</th>
                <th className="p-3 text-secondary">Category</th>
                <th className="p-3 text-secondary">Price</th>
                <th className="p-3 text-secondary">MRP</th>
                <th className="p-3 text-secondary">Stock</th>
                <th className="p-3 text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="p-3 font-bold">{item.name}</td>
                  <td className="p-3 text-secondary text-sm">
                    {item.category && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12 }}>{item.category}</span>}
                  </td>
                  <td className="p-3">₹{item.price}</td>
                  <td className="p-3">{item.mrp ? `₹${item.mrp}` : '-'}</td>
                  <td className="p-3">
                    <span style={{
                      color: item.stock <= 5 ? 'var(--danger)' : 'inherit',
                      fontWeight: item.stock <= 5 ? 'bold' : 'normal'
                    }}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary"
                        onClick={() => edit(item)}
                        data-tooltip="Edit Item"
                        style={{ marginRight: '8px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => remove(item)}
                        data-tooltip="Delete Item"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-secondary">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
