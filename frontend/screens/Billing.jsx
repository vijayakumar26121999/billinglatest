import React, { useEffect, useState, useRef } from "react";

import { io } from "socket.io-client";

export default function Billing({
  user, selectedTable, onOrderSaved, onPaymentSuccess, appType, onShowToast,
  billingData, onUpdateBilling, onClearBilling
}) {
  const [items, setItems] = useState([]);
  const searchInputRef = useRef(null);

  // Use persistent state from props if no table is selected (Take Away mode)
  // If table IS selected, we use the table's order but temporarily store it in a local state for editing
  const [localCart, setLocalCart] = useState([]);
  const [localBilling, setLocalBilling] = useState({
    discount: 0, discountType: "AMOUNT", paymentMethod: "CASH", cashReceived: "",
    customerName: "", customerPhone: ""
  });

  // Sync with whichever mode we are in
  const cart = selectedTable ? localCart : billingData.cart;
  const { discount, discountType, paymentMethod, cashReceived, customerName, customerPhone } = selectedTable ? localBilling : billingData;

  const updateCart = (newCart) => {
    if (selectedTable) {
      setLocalCart(newCart);
    } else {
      onUpdateBilling({ cart: newCart });
    }
  };

  const updateField = (field, value) => {
    if (selectedTable) {
      setLocalBilling(prev => ({ ...prev, [field]: value }));
    } else {
      onUpdateBilling({ [field]: value });
    }
  };

  useEffect(() => {
    fetch("http://localhost:4000/api/items")
      .then(r => r.json())
      .then(data => {
        setItems(data.filter(i => i.enabled !== 0));
      });

    if (selectedTable && selectedTable.order) {
      setLocalCart(selectedTable.order);
      setLocalBilling({
        discount: 0, discountType: "AMOUNT", paymentMethod: "CASH", cashReceived: "",
        customerName: "", customerPhone: ""
      });
    }
  }, [selectedTable]);

  useEffect(() => {
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Derived state (search, filter etc. remains local to the UI)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Socket.io Integration
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket
    socketRef.current = io("http://localhost:4000");

    socketRef.current.on("connect", () => {
      socketRef.current.emit('set-identity', { identity: user.username, type: 'Desktop' });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user.username]);

  // Handle Scan Events (updates with cart/items closure)
  useEffect(() => {
    if (!socketRef.current) return;

    const onScan = (data) => {
      if (data.barcode) {
        // Only process if sender matches current logged in user on desktop
        if (data.senderIdentity === user.username) {
          console.log(`Socket received scan from ${data.senderIdentity}:`, data.barcode);
          handleBarcodeScan(data.barcode);
        } else {
          console.log(`Ignored scan from ${data.senderIdentity}. Current user: ${user.username}`);
        }
      }
    };

    socketRef.current.off("scan-item");
    socketRef.current.on("scan-item", onScan);

    return () => {
      socketRef.current.off("scan-item");
    };
  }, [items, cart, onShowToast, user.username]);

  // Barcode Listener
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't intercept if typing in an input or textarea, or if modifier keys are held
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) barcodeBuffer = "";
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 0) {
          handleBarcodeScan(barcodeBuffer);
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, cart]);

  function handleBarcodeScan(code) {
    // Ensure code is treated as a string for comparison
    const scannedCode = String(code).trim();
    const item = items.find(i => String(i.product_id).trim() === scannedCode);

    if (item) {
      const exists = cart.find(c => c.id === item.id);
      if (exists) {
        if (onShowToast) onShowToast(`Item "${item.name}" is already scanned and added`);
      } else {
        add(item);
        if (onShowToast) onShowToast(`✅ Added: ${item.name}`);
      }
    } else {
      if (onShowToast) onShowToast(`❌ Item not found for barcode: ${scannedCode}`);
      console.warn(`Item not found for barcode: ${scannedCode}`);
    }
  }

  function toggleFavorite(e, item) {
    e.stopPropagation();
    const newStatus = item.is_favorite ? 0 : 1;
    setItems(items.map(i => i.id === item.id ? { ...i, is_favorite: newStatus } : i));
    fetch("http://localhost:4000/api/items/toggle-favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_favorite: newStatus })
    });
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'FAV') return item.is_favorite === 1;
    return true;
  }).sort((a, b) => {
    if (filterType === 'RECENT') return b.id - a.id;
    return 0;
  });

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalTax = cart.reduce((acc, item) => acc + (item.price * item.qty * (item.tax / 100)), 0);
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const totalBeforeDiscount = subtotal + totalTax;
  const calculatedDiscount = discountType === "PERCENT" ? (totalBeforeDiscount * (discount / 100)) : discount;
  const total = totalBeforeDiscount - calculatedDiscount;
  const changeDue = (paymentMethod === 'CASH' && cashReceived) ? (Number(cashReceived) - total) : 0;

  function add(item) {
    if (item.expiry_date) {
      const now = new Date();
      // Create local midnight date for today
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Parse expiry date string (YYYY-MM-DD) to local midnight
      const parts = item.expiry_date.split('-');
      if (parts.length === 3) {
        const expiry = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

        if (today > expiry) {
          if (onShowToast) onShowToast(`❌ Cannot add expired item: ${item.name} (Expired on ${item.expiry_date})`);
          // Also play a warning sound if possible, but toast is sufficient for now
          return;
        }
      }
    }

    const found = cart.find(i => i.id === item.id);
    const currentQty = found ? found.qty : 0;

    if (currentQty + 1 > item.stock) {
      fetch("http://localhost:4000/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Out of stock warning: Attempted to add ${item.name} when stock is ${item.stock}`,
          type: "WARNING"
        })
      });
      if (onShowToast) onShowToast(`Out of stock! ${item.name} has only ${item.stock} left.`);
      return;
    }

    const newCart = found
      ? cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      : [...cart, { ...item, qty: 1 }];
    updateCart(newCart);
  }

  function remove(item) {
    const found = cart.find(i => i.id === item.id);
    if (found.qty > 1) {
      updateCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty - 1 } : i));
    } else {
      updateCart(cart.filter(i => i.id !== item.id));
    }
  }

  function updateQty(item, newQty) {
    const qty = Math.max(1, parseInt(newQty) || 1);
    const masterItem = items.find(i => i.id === item.id);
    if (!masterItem) return;
    const finalQty = qty > masterItem.stock ? masterItem.stock : qty;
    updateCart(cart.map(i => i.id === item.id ? { ...i, qty: finalQty } : i));
  }

  function saveOrder() {
    if (!selectedTable) return;
    fetch(`http://localhost:4000/api/tables/${selectedTable.id}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    })
      .then(r => r.json())
      .then(() => {
        alert("Order Saved!");
        if (onOrderSaved) onOrderSaved();
      })
      .catch(err => alert("Failed to save order: " + err.message));
  }

  function payAndSave() {
    if (cart.length === 0) return;

    fetch("http://localhost:4000/api/save-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart,
        total,
        type: selectedTable ? 'DINE_IN' : 'TAKE_AWAY',
        tableNo: selectedTable ? selectedTable.id : null,
        paymentMethod,
        cashReceived: Number(cashReceived) || 0,
        changeDue: changeDue > 0 ? changeDue : 0,
        billedBy: user.username,
        customerName,
        customerPhone
      })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        // Clear billing data (global or local)
        if (selectedTable) {
          setLocalCart([]);
          setLocalBilling({
            discount: 0, discountType: "AMOUNT", paymentMethod: "CASH", cashReceived: "",
            customerName: "", customerPhone: ""
          });
        } else {
          onClearBilling();
        }

        if (onPaymentSuccess) onPaymentSuccess(data.billId);

        fetch("http://localhost:4000/api/items")
          .then(r => r.json())
          .then(data => setItems(data.filter(i => i.enabled !== 0)));
      })
      .catch(err => alert(err.message));
  }


  return (
    <div className="flex gap-4">
      {/* LEFT: ITEMS */}
      <div className="glass-card" style={{ flex: 2 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '30px' }}>
          <div className="flex flex-col gap-2">
            <h2 className="m-0">
              {appType === 'GROCERY' ? '🛒 POS Billing' : (selectedTable ? `🍽️ Table #${selectedTable.id}` : '🛍️ Take Away')}
            </h2>
            <div className="flex gap-2">
              {[
                { id: 'ALL', label: 'All Items' },
                { id: 'FAV', label: 'Favorites' },
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

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                paddingLeft: '35px',
                width: '200px',
                fontSize: '14px'
              }}
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        {filteredItems.length === 0 && (
          <p className="text-secondary">
            {items.length === 0 ? "No items available" : "No items found matching your search"}
          </p>
        )}

        <div className="items-grid">
          {filteredItems.map(item => (
            <div key={item.id} className="item-card" onClick={() => add(item)} style={{
              position: 'relative',
              border: item.stock <= 0 ? '1px solid #ef4444' : undefined,
              color: item.stock <= 0 ? '#ef4444' : undefined
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  cursor: 'pointer',
                  zIndex: 10
                }}
                onClick={(e) => toggleFavorite(e, item)}
              >
                {item.is_favorite ? (
                  <span style={{ fontSize: 16 }}>⭐</span>
                ) : (
                  <span style={{ fontSize: 16, opacity: 0.3, filter: 'grayscale(1)' }}>⭐</span>
                )}
              </div>

              <div style={{ fontWeight: 600 }}>{item.name}</div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Stock: {item.stock}
                </span>
                <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
                  ₹{item.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: CART & BILL */}
      <div className="glass-card flex flex-col gap-4" style={{ flex: 1, minWidth: 300 }}>
        <h3 className="mt-0">🛒 Cart</h3>

        <div className="flex flex-col gap-2 p-2" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
          <input
            placeholder="Customer Name (Optional)"
            value={customerName}
            onChange={e => updateField('customerName', e.target.value)}
            style={{ padding: '6px', fontSize: 13, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4 }}
          />
          <input
            placeholder="Phone Number (Optional)"
            value={customerPhone}
            onChange={e => updateField('customerPhone', e.target.value)}
            style={{ padding: '6px', fontSize: 13, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4 }}
          />
        </div>

        {/* Cart Items List with +/- controls could be here, but simple list for now */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
          {cart.length === 0 && <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)' }}>Cart is empty</p>}
          {cart.map((item, idx) => (
            <div key={item.id} className="flex justify-between items-center mb-2 p-2" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <div>
                <div>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>₹{item.price} x {item.qty}</div>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'right' }}>₹{item.price * item.qty}</div>
                <div className="flex items-center gap-1">
                  <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4 }} onClick={(e) => { e.stopPropagation(); remove(item); }}>-</button>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateQty(item, e.target.value)}
                    style={{ width: 40, padding: 2, height: 26, textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                    onClick={e => e.stopPropagation()}
                  />
                  <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4 }} onClick={(e) => { e.stopPropagation(); add(item); }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ... summary ... */}
        <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
          <div className="flex justify-between text-secondary"><span>Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-secondary" style={{ fontSize: '13px' }}><span>CGST:</span> <span>₹{cgst.toFixed(2)}</span></div>
          <div className="flex justify-between text-secondary" style={{ fontSize: '13px' }}><span>SGST:</span> <span>₹{sgst.toFixed(2)}</span></div>
          <div className="flex justify-between items-center">
            <span>Discount:</span>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                value={discount}
                onChange={e => updateField('discount', Number(e.target.value))}
                style={{ width: 60, padding: 4, height: 24 }}
                placeholder="0"
              />
              <select
                value={discountType}
                onChange={e => updateField('discountType', e.target.value)}
                style={{ height: 24, padding: '0 4px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11 }}
              >
                <option value="AMOUNT" style={{ color: 'black' }}>₹</option>
                <option value="PERCENT" style={{ color: 'black' }}>%</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Payment:</span>
            <select
              value={paymentMethod}
              onChange={e => updateField('paymentMethod', e.target.value)}
              style={{ width: 80, padding: 4, height: 32, background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
            >
              <option value="CASH" style={{ color: 'black' }}>CASH</option>
              <option value="UPI" style={{ color: 'black' }}>UPI</option>
              <option value="CARD" style={{ color: 'black' }}>CARD</option>
            </select>
          </div>

          {paymentMethod === 'CASH' && (
            <>
              <div className="flex justify-between items-center">
                <span>Cash Received:</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={e => updateField('cashReceived', e.target.value)}
                  placeholder="0.00"
                  style={{ width: 80, padding: 4, height: 24 }}
                />
              </div>
              {Number(cashReceived) > 0 && (
                <div className="flex justify-between items-center" style={{ color: changeDue >= 0 ? '#4ade80' : '#f87171' }}>
                  <span>{changeDue >= 0 ? "Change Due:" : "Balance Due:"}</span>
                  <span style={{ fontWeight: 'bold' }}>₹{Math.abs(changeDue).toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between" style={{ fontSize: 18, fontWeight: 'bold' }}>
            <span>Total:</span> <span>₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {selectedTable && appType !== 'GROCERY' && (
            <button onClick={saveOrder} className="btn-secondary w-full" disabled={cart.length === 0}>
              RESERVE TABLE
            </button>
          )}
          <button onClick={payAndSave} className="btn-bubble w-full" disabled={cart.length === 0}>
            {appType === 'GROCERY' ? 'PAY & SAVE' : (selectedTable ? 'PAY BILL' : 'PAY & SAVE')}
          </button>
        </div>
      </div>
    </div>
  );
}
