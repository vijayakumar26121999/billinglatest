const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const CryptoJS = require('crypto-js');
const http = require('http');
const https = require('https');
const selfsigned = require('selfsigned');
const { Server } = require("socket.io");
const os = require('os');
const pairing = require('./pairing');

const LICENSE_SECRET = "antigravity_license_secret_key_2026";
// import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// PORT is already defined later or I can move it here, but avoiding redeclaration.
// const PORT = 4000; (Removed duplicate)

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Pairing Service
pairing.init();

// API to get Pairing Code
app.get('/api/pairing-code', (req, res) => {
  res.json({ code: pairing.getCode() });
});
// Serve Scanner UI

// Root Redirect for Mobile Scanner
app.get('/', (req, res) => {
  res.redirect('/scanner.html');
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    port: req.socket.localPort,
    timestamp: new Date().toISOString()
  });
});

// Master DB for Global Configuration
// When running in Electron, use DATA_DIR env var if provided; otherwise fallback to logic
const isElectron = process.env.ELECTRON_RUN_AS_NODE === '1';
const dataDir = process.env.DATA_DIR || (isElectron ? path.join(__dirname) : process.cwd());
const dbDataPath = path.join(dataDir, "data");

console.log(`Data directory: ${dataDir}`);
console.log(`Database path: ${dbDataPath}`);

const masterDb = new sqlite3.Database(path.join(dbDataPath, "master.db"));
masterDb.serialize(() => {
  masterDb.run("CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)");
  masterDb.get("SELECT value FROM config WHERE key='app_type'", (err, row) => {
    if (!row) masterDb.run("INSERT INTO config (key, value) VALUES ('app_type', 'RESTAURANT')");
  });
});

let currentLicense = null;

function verifyLicense() {
  const licensePath = path.join(dataDir, "license.lic");
  if (!fs.existsSync(licensePath)) {
    console.log("No license file found.");
    currentLicense = null;
    return false;
  }

  try {
    const encryptedData = fs.readFileSync(licensePath, "utf-8");
    const bytes = CryptoJS.AES.decrypt(encryptedData, LICENSE_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    const now = new Date();
    const expiry = new Date(decryptedData.expiryDate);
    const activation = new Date(decryptedData.activationDate);

    if (now < activation) {
      console.log("License is not yet active.");
      currentLicense = { ...decryptedData, status: "NOT_YET_ACTIVE" };
      return false;
    }

    if (now > expiry) {
      console.log("License has expired.");
      currentLicense = { ...decryptedData, status: "EXPIRED" };
      return false;
    }

    // console.log("License verified successfully.");
    currentLicense = { ...decryptedData, status: "ACTIVE" };
    return true;
  } catch (error) {
    console.error("Invalid license file.");
    currentLicense = null;
    return false;
  }
}

// Initial license check
verifyLicense();

let db;
let currentAppType = 'RESTAURANT';

function loadDatabase(type) {
  if (db) db.close();
  currentAppType = type;
  const dbFile = (type === 'GROCERY') ? "grocery.db" : "restaurant.db";
  const dbFilePath = path.join(dbDataPath, dbFile);
  db = new sqlite3.Database(dbFilePath);
  console.log(`Connected to ${type} database: ${dbFilePath}`);

  db.serialize(() => {
    // USERS
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        role TEXT
      )
    `);

    // APP CONFIG (Internal per DB)
    db.run(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY,
        app_type TEXT
      )
    `);

    // ITEMS (SHOP + RESTAURANT)
    db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        tax REAL,
        category TEXT,
        stock INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        product_id INTEGER
      )
    `);

    // BILLS
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total REAL,
        type TEXT,
        table_no INTEGER,
        payment_method TEXT,
        cash_received REAL,
        change_due REAL,
        billed_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // BILL ITEMS
    db.run(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER,
        item_name TEXT,
        qty INTEGER,
        price REAL,
        tax REAL
      )
    `);

    // ACTIVE ORDERS (Dine In)
    db.run(`
      CREATE TABLE IF NOT EXISTS active_orders (
        table_id INTEGER PRIMARY KEY,
        items TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TABLE CONFIG
    db.run(`
      CREATE TABLE IF NOT EXISTS table_config (
        id INTEGER PRIMARY KEY,
        total_tables INTEGER
      )
    `);

    // SCHEMA MIGRATIONS (Ensure columns exist in existing DBs)
    const migrations = [
      { table: 'bills', column: 'payment_method', type: 'TEXT' },
      { table: 'bills', column: 'cash_received', type: 'REAL' },
      { table: 'bills', column: 'change_due', type: 'REAL' },
      { table: 'invoice_config', column: 'address', type: 'TEXT' },
      { table: 'invoice_config', column: 'gst_number', type: 'TEXT' },
      { table: 'invoice_config', column: 'fssai_id', type: 'TEXT' },
      { table: 'bill_items', column: 'tax', type: 'REAL' },
      { table: 'invoice_config', column: 'force_bold', type: 'INTEGER' },
      { table: 'bills', column: 'change_due', type: 'REAL' },
      { table: 'invoice_config', column: 'address', type: 'TEXT' },
      { table: 'invoice_config', column: 'gst_number', type: 'TEXT' },
      { table: 'invoice_config', column: 'fssai_id', type: 'TEXT' },
      { table: 'bill_items', column: 'tax', type: 'REAL' },
      { table: 'invoice_config', column: 'force_bold', type: 'INTEGER' },
      { table: 'bills', column: 'change_due', type: 'REAL' },
      { table: 'invoice_config', column: 'address', type: 'TEXT' },
      { table: 'invoice_config', column: 'gst_number', type: 'TEXT' },
      { table: 'invoice_config', column: 'fssai_id', type: 'TEXT' },
      { table: 'bill_items', column: 'tax', type: 'REAL' },
      { table: 'invoice_config', column: 'force_bold', type: 'INTEGER' },
      { table: 'bills', column: 'billed_by', type: 'TEXT' },
      { table: 'items', column: 'mrp', type: 'REAL' },
      { table: 'bill_items', column: 'mrp', type: 'REAL' },
      { table: 'bills', column: 'customer_name', type: 'TEXT' },
      { table: 'bills', column: 'customer_phone', type: 'TEXT' },
      { table: 'bills', column: 'invoice_config_snapshot', type: 'TEXT' },
      { table: 'items', column: 'is_favorite', type: 'INTEGER DEFAULT 0' },
      { table: 'items', column: 'created_at', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
      { table: 'items', column: 'product_id', type: 'INTEGER' },
      { table: 'items', column: 'wholesale_price', type: 'REAL DEFAULT 0' },
      { table: 'items', column: 'description', type: "TEXT DEFAULT ''" },
      { table: 'items', column: 'expiry_date', type: "TEXT" }
    ];

    migrations.forEach(m => {
      db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`, (err) => {
        // Silently ignore errors (like duplicate column) during migration
        // If we just added invoice_config_snapshot, we should populate it for existing bills
        if (!err && m.column === 'invoice_config_snapshot') {
          db.get("SELECT * FROM invoice_config WHERE id=1", (e, config) => {
            if (config) {
              const snapshot = JSON.stringify(config);
              db.run("UPDATE bills SET invoice_config_snapshot = ? WHERE invoice_config_snapshot IS NULL", [snapshot]);
            }
          });
        }
      });
    });

    // Also run this check on every startup to ensure nulls are filled if migration already ran previously
    db.get("SELECT * FROM invoice_config WHERE id=1", (e, config) => {
      if (config) {
        const snapshot = JSON.stringify(config);
        // Ensure the column exists before trying to update (though migration above handles creation)
        // simplified: just try update, if column missing it errors safely in check
        db.run("UPDATE bills SET invoice_config_snapshot = ? WHERE invoice_config_snapshot IS NULL", [snapshot], (err) => { });

        // Backfill product_id for items that don't have one
        db.all("SELECT id FROM items WHERE product_id IS NULL", (e, items) => {
          if (items) {
            const stmt = db.prepare("UPDATE items SET product_id = ? WHERE id = ?");
            items.forEach(item => {
              const pid = Math.floor(1000 + Math.random() * 9000);
              stmt.run(pid, item.id);
            });
            stmt.finalize();
          }
        });
      }
    });

    // INVOICE CONFIG
    db.run(`
      CREATE TABLE IF NOT EXISTS invoice_config (
        id INTEGER PRIMARY KEY,
        heading TEXT,
        company_name TEXT,
        address TEXT,
        gst_number TEXT,
        fssai_id TEXT,
        show_watermark INTEGER DEFAULT 1,
        force_bold INTEGER DEFAULT 0
      )
    `);

    // NOTIFICATIONS
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        type TEXT DEFAULT 'INFO',
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DASHBOARD CONFIG
    db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_config (
        id INTEGER PRIMARY KEY,
        show_sales_trend INTEGER DEFAULT 1,
        show_revenue_breakdown INTEGER DEFAULT 1,
        show_top_items INTEGER DEFAULT 1,
        show_payment_methods INTEGER DEFAULT 1,
        show_stock_alerts INTEGER DEFAULT 1,
        default_time_range TEXT DEFAULT 'LAST_7_DAYS'
      )
    `);

    // LOGIN HISTORY
    db.run(`
      CREATE TABLE IF NOT EXISTS login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // STOCK HISTORY
    db.run(`
      CREATE TABLE IF NOT EXISTS stock_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        item_name TEXT,
        old_stock INTEGER,
        new_stock INTEGER,
        change_amount INTEGER,
        changed_by TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // Initial Data for New DB
    db.all("SELECT * FROM users", (e, rows) => {
      if (rows && rows.length === 0) {
        db.run("INSERT INTO users VALUES (NULL,'superadmin','super123','SUPER_ADMIN')");
        db.run("INSERT INTO users VALUES (NULL,'admin','admin','ADMIN')");
        db.run("INSERT INTO users VALUES (NULL,'cashier','1234','CASHIER')");
      }
    });

    db.get("SELECT * FROM app_config", (e, row) => {
      if (!row) db.run("INSERT INTO app_config VALUES (1, ?)", [type]);
    });

    db.get("SELECT * FROM table_config", (e, row) => {
      if (!row) db.run("INSERT INTO table_config VALUES (1, 10)");
    });

    db.get("SELECT * FROM invoice_config", (e, row) => {
      if (!row) db.run("INSERT INTO invoice_config (id, heading, company_name, show_watermark, address, gst_number, fssai_id) VALUES (1, 'BILLING POS', 'Our Store', 1, '', '', '')");
    });

    db.get("SELECT * FROM dashboard_config", (e, row) => {
      if (!row) db.run("INSERT INTO dashboard_config (id, show_sales_trend, show_revenue_breakdown, show_top_items, show_payment_methods, show_stock_alerts, default_time_range) VALUES (1, 1, 1, 1, 1, 1, 'LAST_7_DAYS')");
    });

    // Check if items or bills need seeding
    db.get("SELECT COUNT(*) as count FROM items", (e, row) => {
      if (row && row.count === 0) {
        console.log("Seeding sample data (100+ items)...");
        seedSampleData(db, type);
      }
    });
  });
}

function seedSampleData(db, type) {
  const categories = [
    { name: 'Starters', items: ['Spring Rolls', 'Garlic Bread', 'Tomato Soup', 'Bruschetta', 'Nachos', 'Chicken Wings', 'Paneer Tikka', 'Hara Bhara Kabab', 'Corn Cheese Balls', 'Fish Fingers'] },
    { name: 'Main Course', items: ['Paneer Butter Masala', 'Chicken Curry', 'Veg Biryani', 'Chicken Biryani', 'Dal Makhani', 'Kadai Paneer', 'Butter Chicken', 'Pasta Alfredo', 'Veg Pizza', 'Chicken Pizza', 'Grilled Sandwich', 'Burger', 'Fried Rice', 'Hakka Noodles', 'Manchurian'] },
    { name: 'Breads', items: ['Roti', 'Naan', 'Butter Naan', 'Garlic Naan', 'Paratha', 'Kulcha', 'Missi Roti'] },
    { name: 'Beverages', items: ['Coke', 'Pepsi', 'Sprite', 'Fanta', 'Fresh Lime Soda', 'Cold Coffee', 'Hot Coffee', 'Masala Chai', 'Iced Tea', 'Mojito', 'Oreo Shake', 'Mango Lassi', 'Water Bottle'] },
    { name: 'Desserts', items: ['Vanilla Ice Cream', 'Chocolate Brownie', 'Gulab Jamun', 'Rasmalai', 'Cheesecake', 'Fruit Salad'] }
  ];

  const stmt = db.prepare("INSERT INTO items (name, price, tax, category, stock, mrp, active, product_id, wholesale_price, description) VALUES (?,?,?,?,?,?,1,?,?,?)");

  let itemCount = 0;
  categories.forEach(cat => {
    // Generate variations to reach 100+ items
    cat.items.forEach(baseName => {
      // Add base item
      const price = Math.floor(Math.random() * 300) + 50;
      stmt.run(baseName, price, 5, cat.name, 100, price + 20, Math.floor(100000 + Math.random() * 900000), price - 20, "Delicious " + baseName);
      itemCount++;

      // varied versions for common items
      if (['Pizza', 'Burger', 'Pasta', 'Biryani', 'Curry', 'Shake'].some(k => baseName.includes(k))) {
        stmt.run(baseName + " (Large)", Math.floor(price * 1.5), 5, cat.name, 50, Math.floor(price * 1.5) + 30, Math.floor(100000 + Math.random() * 900000), Math.floor(price * 1.5) - 20, "Large portion");
        stmt.run(baseName + " (Special)", price + 50, 5, cat.name, 40, price + 80, Math.floor(100000 + Math.random() * 900000), price + 10, "Chef's Special " + baseName);
        itemCount += 2;
      }
    });
  });

  // Fill up to 100 if needed with generic items
  let extraCount = 1;
  while (itemCount < 105) {
    const price = Math.floor(Math.random() * 100) + 20;
    stmt.run(`Extra Item ${extraCount}`, price, 5, "Others", 50, price + 10, Math.floor(100000 + Math.random() * 900000), price - 5, "");
    itemCount++;
    extraCount++;
  }

  stmt.finalize();

  // Seed Bills
  console.log("Seeding sample bills...");
  const paymentMethods = ['CASH', 'UPI', 'CARD'];
  const customers = ['Walk-in', 'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram'];

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().replace('T', ' ').split('.')[0];

    const total = Math.floor(Math.random() * 2000) + 100;
    const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const cust = customers[Math.floor(Math.random() * customers.length)];

    db.run("INSERT INTO bills (total, type, payment_method, created_at, customer_name) VALUES (?, ?, ?, ?, ?)",
      [total, 'DINE_IN', pMethod, dateStr, cust], function (err) {
        if (!err && this.lastID) {
          const billId = this.lastID;
          // Add 1-5 random items
          const numItems = Math.floor(Math.random() * 5) + 1;
          for (let j = 0; j < numItems; j++) {
            db.run("INSERT INTO bill_items (bill_id, item_name, qty, price, tax) VALUES (?, ?, ?, ?, ?)",
              [billId, `Sample Item ${j}`, 1, Math.floor(total / numItems), 5]);
          }
        }
      });
  }
}

// Initial Load
masterDb.get("SELECT value FROM config WHERE key='app_type'", (err, row) => {
  const type = row ? row.value : 'RESTAURANT';
  loadDatabase(type);
});

// =====================
// LICENSE ROUTES
// =====================
app.get("/api/license/status", (req, res) => {
  res.json({
    hasLicense: !!currentLicense,
    license: currentLicense
  });
});

app.post("/api/license/activate", (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) return res.status(400).json({ error: "License key is required" });

  try {
    // Attempt to decrypt to verify validity before saving
    const bytes = CryptoJS.AES.decrypt(licenseKey, LICENSE_SECRET);
    JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    const licensePath = path.join(dataDir, "license.lic");
    fs.writeFileSync(licensePath, licenseKey);

    const isValid = verifyLicense();
    if (isValid) {
      res.json({ success: true, message: "License activated successfully", license: currentLicense });
    } else {
      res.status(400).json({ success: false, message: "License saved but is currently " + (currentLicense ? currentLicense.status : "INVALID"), license: currentLicense });
    }
  } catch (error) {
    res.status(400).json({ error: "Invalid license key format" });
  }
});

app.post("/api/license/remove", (req, res) => {
  try {
    const licensePath = path.join(dataDir, "license.lic");
    if (fs.existsSync(licensePath)) {
      fs.unlinkSync(licensePath);
    }
    currentLicense = null;
    res.json({ success: true, message: "License removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove license" });
  }
});

// =====================
// GLOBAL CONFIG ROUTES
// =====================
// =====================
// GLOBAL CONFIG ROUTES
// =====================

// Helper to validate and correct app type based on license
function validateAppTypeAgainstLicense(currentType, license) {
  if (!license || license.status !== 'ACTIVE') return currentType;

  const features = license.features || [];
  const hasRestaurant = features.includes('restaurant');
  const hasRetail = features.includes('retail');

  if (!hasRestaurant && !hasRetail) return currentType; // Should effectively be invalid, but fallback

  // Logic:
  // If Current is RESTAURANT but we only have RETAIL -> Force GROCERY
  // If Current is GROCERY but we only have RESTAURANT -> Force RESTAURANT

  if (currentType === 'RESTAURANT' && !hasRestaurant && hasRetail) {
    return 'GROCERY';
  }
  if (currentType === 'GROCERY' && !hasRetail && hasRestaurant) {
    return 'RESTAURANT';
  }

  return currentType;
}

app.get("/api/global-config", (req, res) => {
  verifyLicense(); // Refresh license state
  masterDb.get("SELECT value FROM config WHERE key='app_type'", (err, row) => {
    let type = row ? row.value : 'RESTAURANT';

    // Auto-correct logic
    if (currentLicense && currentLicense.status === 'ACTIVE') {
      const correctedType = validateAppTypeAgainstLicense(type, currentLicense);
      if (correctedType !== type) {
        console.log(`[License Enforcement] Switching App Type from ${type} to ${correctedType}`);
        masterDb.run("UPDATE config SET value=? WHERE key='app_type'", [correctedType], (err) => {
          // Reload DB connection for the new type immediatey
          loadDatabase(correctedType);
          res.json({ app_type: correctedType });
        });
        return;
      }
    }

    res.json({ app_type: type });
  });
});

app.post("/api/global-config/type", (req, res) => {
  const { type, role } = req.body;

  // Basic Auth
  if (role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
  if (!['GROCERY', 'RESTAURANT'].includes(type)) return res.status(400).json({ error: "Invalid type" });

  // License Check
  verifyLicense();
  if (currentLicense && currentLicense.status === 'ACTIVE') {
    const features = currentLicense.features || [];
    if (type === 'RESTAURANT' && !features.includes('restaurant')) {
      return res.status(403).json({ error: "Your license does not include the Restaurant module." });
    }
    if (type === 'GROCERY' && !features.includes('retail')) {
      return res.status(403).json({ error: "Your license does not include the Retail module." });
    }
  }

  masterDb.run("UPDATE config SET value=? WHERE key='app_type'", [type], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    loadDatabase(type);
    res.json({ success: true, app_type: type });
  });
});

// =====================
// NOTIFICATIONS ROUTES
// =====================
app.get("/api/notifications", (req, res) => {
  db.all("SELECT * FROM notifications ORDER BY id DESC LIMIT 10", (e, rows) => res.json(rows || []));
});

app.post("/api/notifications", (req, res) => {
  const { message, type } = req.body;
  db.run("INSERT INTO notifications (message, type) VALUES (?, ?)", [message, type || 'INFO'], () => res.json({ success: true }));
});

app.post("/api/notifications/read", (req, res) => {
  const { id } = req.body;
  db.run("UPDATE notifications SET is_read=1 WHERE id=?", [id], () => res.json({ success: true }));
});

app.post("/api/notifications/clear", (req, res) => {
  db.run("UPDATE notifications SET is_read=1", [], () => res.json({ success: true }));
});

// =====================
// AUTH
// =====================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT username, role FROM users WHERE username=? AND password=?",
    [username, password],
    (e, user) => {
      if (user) {
        // Log the login event
        db.run("INSERT INTO login_history (username, action) VALUES (?, 'LOGIN')", [username]);
        res.json(user);
      } else {
        res.status(401).json({ error: "Invalid login" });
      }
    }
  );
});

// Logout
app.post("/api/logout", (req, res) => {
  const { username } = req.body;
  if (username) {
    db.run("INSERT INTO login_history (username, action) VALUES (?, 'LOGOUT')", [username]);
  }
  res.json({ success: true });
});

// =====================
// USER MANAGEMENT (SUPER_ADMIN ONLY)
// =====================
app.get("/api/users", (req, res) => {
  db.all("SELECT id, username, role FROM users ORDER BY id", (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Username, password, and role are required" });

  db.get("SELECT id FROM users WHERE username=?", [username], (e, existing) => {
    if (existing) return res.status(400).json({ error: "Username already exists" });

    db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, password, role],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
      }
    );
  });
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, password, role, currentUser } = req.body;
  if (!username || !role) return res.status(400).json({ error: "Username and role are required" });

  db.get("SELECT username, role FROM users WHERE id=?", [id], (e, user) => {
    if (!user) return res.status(404).json({ error: "User not found" });
    if (currentUser === user.username && user.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Cannot demote yourself from SUPER_ADMIN" });
    }

    db.get("SELECT id FROM users WHERE username=? AND id!=?", [username, id], (e, existing) => {
      if (existing) return res.status(400).json({ error: "Username already exists" });

      let query, params;
      if (password) {
        query = "UPDATE users SET username=?, password=?, role=? WHERE id=?";
        params = [username, password, role, id];
      } else {
        query = "UPDATE users SET username=?, role=? WHERE id=?";
        params = [username, role, id];
      }

      db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { currentUser } = req.body;

  db.get("SELECT username, role FROM users WHERE id=?", [id], (e, user) => {
    if (!user) return res.status(404).json({ error: "User not found" });
    if (currentUser === user.username) return res.status(403).json({ error: "Cannot delete yourself" });

    if (user.role === "SUPER_ADMIN") {
      db.get("SELECT COUNT(*) as count FROM users WHERE role='SUPER_ADMIN'", (e, result) => {
        if (result.count <= 1) return res.status(403).json({ error: "Cannot delete the last SUPER_ADMIN" });
        db.run("DELETE FROM users WHERE id=?", [id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      });
    } else {
      db.run("DELETE FROM users WHERE id=?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    }
  });
});

// =====================
// CONFIG
// =====================
app.get("/api/app-config", (req, res) => {
  db.get("SELECT app_type FROM app_config WHERE id=1", (e, row) => res.json(row || { app_type: currentAppType }));
});

app.post("/api/app-config", (req, res) => {
  db.run("UPDATE app_config SET app_type=? WHERE id=1", [req.body.app_type], () => res.json({ success: true }));
});

// =====================
// INVOICE CONFIG
// =====================
app.get("/api/invoice-config", (req, res) => {
  db.get("SELECT * FROM invoice_config WHERE id=1", (e, row) => res.json(row || {}));
});

app.post("/api/invoice-config", (req, res) => {
  const { heading, company_name, address, gst_number, fssai_id, show_watermark, role } = req.body;
  if (role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });

  db.run(
    "UPDATE invoice_config SET heading=?, company_name=?, address=?, gst_number=?, fssai_id=?, show_watermark=? WHERE id=1",
    [heading, company_name, address, gst_number, fssai_id, show_watermark ? 1 : 0],
    () => res.json({ success: true })
  );
});

// =====================
// DASHBOARD CONFIG
// =====================
app.get("/api/dashboard-config", (req, res) => {
  db.get("SELECT * FROM dashboard_config WHERE id=1", (e, row) => res.json(row || {}));
});

app.post("/api/dashboard-config", (req, res) => {
  const { show_sales_trend, show_revenue_breakdown, show_top_items, show_payment_methods, show_stock_alerts, default_time_range, role } = req.body;
  if (role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });

  db.run(
    "UPDATE dashboard_config SET show_sales_trend=?, show_revenue_breakdown=?, show_top_items=?, show_payment_methods=?, show_stock_alerts=?, default_time_range=? WHERE id=1",
    [show_sales_trend ? 1 : 0, show_revenue_breakdown ? 1 : 0, show_top_items ? 1 : 0, show_payment_methods ? 1 : 0, show_stock_alerts ? 1 : 0, default_time_range],
    () => res.json({ success: true })
  );
});

// =====================
// DASHBOARD ANALYTICS
// =====================

// Helper function to get date filter SQL
function getDateFilter(range) {
  const now = new Date();
  let dateFilter = "";

  switch (range) {
    case 'TODAY':
      dateFilter = "DATE(created_at) = DATE('now')";
      break;
    case 'LAST_7_DAYS':
      dateFilter = "created_at >= datetime('now', '-7 days')";
      break;
    case 'LAST_30_DAYS':
      dateFilter = "created_at >= datetime('now', '-30 days')";
      break;
    case 'LAST_3_MONTHS':
      dateFilter = "created_at >= datetime('now', '-3 months')";
      break;
    default:
      dateFilter = "created_at >= datetime('now', '-7 days')";
  }

  return dateFilter;
}

// Dashboard Summary
app.get("/api/dashboard/summary", (req, res) => {
  const range = req.query.range || 'LAST_7_DAYS';
  const dateFilter = getDateFilter(range);

  db.get(`SELECT COUNT(*) as total_bills, SUM(total) as total_sales, AVG(total) as avg_bill FROM bills WHERE ${dateFilter}`, (e, row) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(row || { total_bills: 0, total_sales: 0, avg_bill: 0 });
  });
});

// Sales Trend
app.get("/api/dashboard/sales-trend", (req, res) => {
  const range = req.query.range || 'LAST_7_DAYS';
  const dateFilter = getDateFilter(range);

  db.all(`SELECT DATE(created_at) as date, SUM(total) as total, COUNT(*) as count FROM bills WHERE ${dateFilter} GROUP BY DATE(created_at) ORDER BY date ASC`, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

// Product Expiry Alerts
app.get("/api/dashboard/expiry-alerts", (req, res) => {
  const getItemsExiringIn = (days) => {
    return new Promise((resolve, reject) => {
      // Using SQLite date functions
      // Select items where expiry_date is between NOW and NOW + X days
      // And stock > 0 (only care about items we actually have)
      const query = `
        SELECT id, name, stock, category, expiry_date 
        FROM items 
        WHERE active = 1 
        AND stock > 0
        AND expiry_date IS NOT NULL 
        AND expiry_date != ''
        AND date(expiry_date) <= date('now', '+${days} days')
        AND date(expiry_date) >= date('now')
        ORDER BY expiry_date ASC
      `;

      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  };

  Promise.all([
    getItemsExiringIn(7),
    getItemsExiringIn(30),
    getItemsExiringIn(60)
  ]).then(([next7, next30, next60]) => {
    // Filter duplicates:
    // next30 should exclude items already in next7
    // next60 should exclude items already in next30

    // Actually, dashboard might want cumulative lists, or specific buckets.
    // Let's return buckets based on the closest deadline.

    // Unique set strategy:
    // Critical (<= 7 days)
    // Urgent (8 - 30 days)
    // Upcoming (31 - 60 days)

    const critical = next7;
    const urgent = next30.filter(i => !critical.find(c => c.id === i.id));
    const upcoming = next60.filter(i => !critical.find(c => c.id === i.id) && !urgent.find(u => u.id === i.id));

    res.json({
      critical, // <= 7 days
      urgent,   // 8-30 days
      upcoming  // 31-60 days
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// Revenue Breakdown by Category
app.get("/api/dashboard/revenue-breakdown", (req, res) => {
  const range = req.query.range || 'LAST_7_DAYS';
  const dateFilter = getDateFilter(range);

  db.all(`
    SELECT i.category, SUM(bi.qty * bi.price) as revenue, SUM(bi.qty) as quantity
    FROM bill_items bi
    JOIN items i ON bi.item_name = i.name
    JOIN bills b ON bi.bill_id = b.id
    WHERE ${dateFilter.replace('created_at', 'b.created_at')}
    GROUP BY i.category
    ORDER BY revenue DESC
  `, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

// Top Selling Items
app.get("/api/dashboard/top-items", (req, res) => {
  const range = req.query.range || 'LAST_7_DAYS';
  const limit = req.query.limit || 10;
  const dateFilter = getDateFilter(range);

  db.all(`
    SELECT bi.item_name, SUM(bi.qty) as total_qty, SUM(bi.qty * bi.price) as revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE ${dateFilter.replace('created_at', 'b.created_at')}
    GROUP BY bi.item_name
    ORDER BY total_qty DESC
    LIMIT ?
  `, [limit], (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

// Payment Methods Distribution
app.get("/api/dashboard/payment-methods", (req, res) => {
  const range = req.query.range || 'LAST_7_DAYS';
  const dateFilter = getDateFilter(range);

  db.all(`
    SELECT UPPER(TRIM(payment_method)) as payment_method, COUNT(*) as count, SUM(total) as total_amount
    FROM bills
    WHERE ${dateFilter}
    GROUP BY UPPER(TRIM(payment_method))
  `, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

// Stock Alerts (Low Stock Items)
app.get("/api/dashboard/stock-alerts", (req, res) => {
  db.all("SELECT id, name, stock, category FROM items WHERE active=1 AND stock < 10 ORDER BY stock ASC LIMIT 10", (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});


// =====================
// ITEMS
// =====================
app.get("/api/items", (req, res) => {
  db.all("SELECT * FROM items WHERE active=1", (e, rows) => res.json(rows || []));
});

app.post("/api/items/add", (req, res) => {
  const { name, price, tax, category, stock, mrp, product_id, wholesale_price, description, expiry_date } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  // Generate Product ID if missing
  const pid = product_id || Math.floor(100000 + Math.random() * 900000);

  const stmt = db.prepare(`
      INSERT INTO items (name, price, tax, category, stock, mrp, product_id, wholesale_price, description, expiry_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(name, price, tax || 0, category || "Others", stock || 0, mrp || price, pid, wholesale_price || 0, description || "", expiry_date || null, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID, product_id: pid });
  });
  stmt.finalize();
});

app.post("/api/items/update", (req, res) => {
  const { id, name, price, tax, category, stock, mrp, wholesale_price, description, expiry_date } = req.body;

  const stmt = db.prepare(`
      UPDATE items 
      SET name=?, price=?, tax=?, category=?, stock=?, mrp=?, wholesale_price=?, description=?, expiry_date=? 
      WHERE id=?
  `);

  stmt.run(name, price, tax, category, stock, mrp, wholesale_price, description, expiry_date, id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
  stmt.finalize();
});
app.post("/api/items/toggle", (req, res) => {
  const { id, active } = req.body;
  db.get("SELECT name FROM items WHERE id=?", [id], (err, item) => {
    db.run("UPDATE items SET active=? WHERE id=?", [active, id], () => {
      const itemName = item ? item.name : `Item #${id}`;
      const status = active ? 'enabled' : 'disabled';
      db.run("INSERT INTO notifications (message, type) VALUES (?, 'WARNING')", [`${itemName} has been ${status}`]);
      res.json({ success: true })
    });
  });
});

// =====================
// STOCK
// =====================
app.post("/api/stock/update", (req, res) => {
  const { id, stock, role, username } = req.body;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) return res.status(403).json({ error: "Access denied" });

  db.get("SELECT name, stock FROM items WHERE id=?", [id], (err, item) => {
    if (!item) return res.status(404).json({ error: "Item not found" });

    const oldStock = item.stock;
    const newStock = stock;
    const changeAmount = newStock - oldStock;

    db.run("UPDATE items SET stock=? WHERE id=?", [stock, id], () => {
      const itemName = item.name;

      // Log stock change to history
      db.run(
        "INSERT INTO stock_history (item_id, item_name, old_stock, new_stock, change_amount, changed_by) VALUES (?, ?, ?, ?, ?, ?)",
        [id, itemName, oldStock, newStock, changeAmount, username || 'Unknown'],
        () => {
          db.run("INSERT INTO notifications (message, type) VALUES (?, 'INFO')", [`Stock updated: ${itemName} now has ${stock} units`]);
          res.json({ success: true });
        }
      );
    });
  });
});

// Update wholesale price from Stock screen
app.post("/api/stock/update-wholesale", (req, res) => {
  const { id, wholesale_price, role } = req.body;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) return res.status(403).json({ error: "Access denied" });

  db.run("UPDATE items SET wholesale_price=? WHERE id=?", [wholesale_price || 0, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Update description from Stock screen
app.post("/api/stock/update-description", (req, res) => {
  const { id, description, role } = req.body;
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) return res.status(403).json({ error: "Access denied" });

  db.run("UPDATE items SET description=? WHERE id=?", [description || "", id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post("/api/items/toggle-favorite", (req, res) => {
  const { id, is_favorite } = req.body;
  db.run("UPDATE items SET is_favorite=? WHERE id=?", [is_favorite ? 1 : 0, id], () => {
    res.json({ success: true });
  });
});

// =====================
// TABLES (DINE IN)
// =====================
app.get("/api/tables/config", (req, res) => {
  db.get("SELECT total_tables FROM table_config WHERE id=1", (e, row) => {
    res.json(row || { total_tables: 10 });
  });
});

app.post("/api/tables/config", (req, res) => {
  const { total } = req.body;
  db.run("UPDATE table_config SET total_tables=? WHERE id=1", [total], () => res.json({ success: true }));
});

app.get("/api/tables", (req, res) => {
  db.get("SELECT total_tables FROM table_config WHERE id=1", (e, config) => {
    const total = config ? config.total_tables : 10;
    db.all("SELECT table_id, items, updated_at FROM active_orders", (e, rows) => {
      const activeMap = {};
      (rows || []).forEach(r => activeMap[r.table_id] = r);
      const tables = [];
      for (let i = 1; i <= total; i++) {
        tables.push({
          id: i,
          status: activeMap[i] ? 'OCCUPIED' : 'AVAILABLE',
          order: activeMap[i] ? JSON.parse(activeMap[i].items) : []
        });
      }
      res.json(tables);
    });
  });
});

app.post("/api/tables/:id/order", (req, res) => {
  const tableId = req.params.id;
  const { items } = req.body;
  if (!items || items.length === 0) {
    db.run("DELETE FROM active_orders WHERE table_id=?", [tableId], () => res.json({ success: true }));
  } else {
    db.run("INSERT OR REPLACE INTO active_orders (table_id, items, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
      [tableId, JSON.stringify(items)],
      () => res.json({ success: true })
    );
  }
});

// =====================
// BILLING
// =====================
app.post("/api/save-bill", (req, res) => {
  const { cart, total, type, tableNo, paymentMethod, cashReceived, changeDue, billedBy, customerName, customerPhone } = req.body;
  const billType = type || (currentAppType === 'GROCERY' ? 'TAKE_AWAY' : "TAKE_AWAY");

  db.serialize(() => {
    const checkStock = new Promise((resolve, reject) => {
      db.all("SELECT id, stock, name FROM items WHERE active=1", (err, rows) => {
        if (err) return reject(err);
        const stockMap = {};
        rows.forEach(r => stockMap[r.id] = r);
        for (const item of cart) {
          const dbItem = stockMap[item.id];
          if (!dbItem) return reject("Item not found: " + item.name);
          if (dbItem.stock < item.qty) return reject("Out of stock: " + item.name);
        }
        resolve();
      });
    });

    checkStock.then(() => {
      db.serialize(() => {
        const stmt = db.prepare("UPDATE items SET stock = stock - ? WHERE id = ?");
        cart.forEach(i => stmt.run(i.qty, i.id));
        stmt.finalize();

        // Fetch current invoice config logic to snapshot
        db.get("SELECT * FROM invoice_config WHERE id=1", (err, config) => {
          const configSnapshot = config ? JSON.stringify(config) : "{}";

          db.run("INSERT INTO bills (total, type, table_no, payment_method, cash_received, change_due, billed_by, customer_name, customer_phone, invoice_config_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)",
            [total, billType, tableNo, paymentMethod || 'CASH', cashReceived || 0, changeDue || 0, billedBy || 'SYSTEM', customerName || '', customerPhone || '', configSnapshot], function (err) {
              if (err) return res.status(500).json({ error: err.message });
              const billId = this.lastID;


              const itemStmt = db.prepare("INSERT INTO bill_items (bill_id,item_name,qty,price,tax,mrp) VALUES (?,?,?,?,?,?)");
              cart.forEach(i => itemStmt.run(billId, i.name, i.qty, i.price, i.tax || 0, i.mrp || 0));
              itemStmt.finalize();

              if (billType === 'DINE_IN' && tableNo) {
                db.run("DELETE FROM active_orders WHERE table_id=?", [tableNo]);
              }
              res.json({ success: true, billId });
            });
        });
      });
    }).catch(errMsg => res.status(400).json({ error: errMsg }));
  });
});

// =====================
// HISTORY
// =====================
app.get("/api/bills", (req, res) => {
  const { startDate, endDate, paymentMethod, type } = req.query;
  let query = "SELECT * FROM bills WHERE 1=1";
  const params = [];

  if (startDate) {
    query += " AND DATE(created_at) >= DATE(?)";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND DATE(created_at) <= DATE(?)";
    params.push(endDate);
  }
  if (paymentMethod && paymentMethod !== 'ALL') {
    query += " AND UPPER(payment_method) = ?";
    params.push(paymentMethod.toUpperCase());
  }
  if (type && type !== 'ALL') {
    query += " AND type = ?";
    params.push(type);
  }

  query += " ORDER BY id DESC LIMIT 100";
  db.all(query, params, (e, rows) => res.json(rows || []));
});

app.get("/api/bills/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM bills WHERE id=?", [id], (e, bill) => {
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    db.all("SELECT * FROM bill_items WHERE bill_id=?", [id], (e, items) => {
      res.json({ ...bill, items });
    });
  });
});

// =====================
// REPORTS
// =====================
app.get("/api/reports/daily", (req, res) => {
  db.all("SELECT DATE(created_at) date, SUM(total) total FROM bills GROUP BY DATE(created_at)", (e, rows) => res.json(rows || []));
});

app.get("/api/reports/monthly", (req, res) => {
  db.all("SELECT strftime('%Y-%m',created_at) month, SUM(total) total FROM bills GROUP BY month", (e, rows) => res.json(rows || []));
});

app.get("/api/reports/items", (req, res) => {
  db.all("SELECT item_name, SUM(qty) qty, SUM(qty*price) total FROM bill_items GROUP BY item_name", (e, rows) => res.json(rows || []));
});

// Login History
app.get("/api/reports/login-history", (req, res) => {
  const { limit = 50, offset = 0, username, startDate, endDate } = req.query;

  let query = "SELECT * FROM login_history WHERE 1=1";
  const params = [];

  if (username) {
    query += " AND username = ?";
    params.push(username);
  }

  if (startDate) {
    query += " AND timestamp >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND timestamp <= ?";
    params.push(endDate + " 23:59:59");
  }

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});

// Stock History
app.get("/api/reports/stock-history", (req, res) => {
  const { limit = 50, offset = 0, itemName, startDate, endDate } = req.query;

  let query = "SELECT * FROM stock_history WHERE 1=1";
  const params = [];

  if (itemName) {
    query += " AND item_name LIKE ?";
    params.push(`%${itemName}%`);
  }

  if (startDate) {
    query += " AND timestamp >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND timestamp <= ?";
    params.push(endDate + " 23:59:59");
  }

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (e, rows) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(rows || []);
  });
});



// Backend Configuration
const PORT = process.env.PORT || 4000;

// Helper to get local IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push({ name: interfaceName, address: alias.address });
      }
    }
  }
  return ips.length > 0 ? ips : [{ name: 'loopback', address: 'localhost' }];
}

const localIPs = getLocalIPs();
const localIP = localIPs[0].address; // Fallback for single-IP usage
console.log(`Detected Local IPs:`, localIPs.map(i => i.address).join(', '));

// Create Server
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.attach(httpServer);

// Track connected devices
const connectedDevices = new Map();

function broadcastDevices() {
  const devicesList = Array.from(connectedDevices.entries()).map(([id, data]) => ({
    id,
    identity: data.identity || 'Guest',
    type: data.type || 'Unknown'
  }));
  io.emit('devices-list', devicesList);
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Set default identity
  connectedDevices.set(socket.id, { identity: 'Guest', type: 'Desktop' });

  // Handle identity update (e.g., mobile connecting as admin)
  socket.on('set-identity', (data) => {
    connectedDevices.set(socket.id, {
      identity: data.identity || 'Guest',
      type: data.type || 'Mobile'
    });
    console.log(`Socket ${socket.id} identity set to: ${data.identity}`);
    broadcastDevices();
  });

  // Broadcast device connection
  broadcastDevices();

  socket.on('scan-item', (data) => {
    const device = connectedDevices.get(socket.id) || {};
    console.log(`Scanned Item from ${device.identity}:`, data);

    // Broadcast to all with sender identity
    io.emit('scan-item', { ...data, senderIdentity: device.identity });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedDevices.delete(socket.id);
    broadcastDevices();
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Network IP Endpoint
app.get('/api/network-ip', (req, res) => {
  res.json({ ips: localIPs, primaryIp: localIP });
});
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Start Server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend running at http://${localIP}:${PORT}`);
  console.log(`👉 Scanner UI available at http://${localIP}:${PORT}/scanner.html`);
});


