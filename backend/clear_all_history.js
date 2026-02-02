const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDataPath = path.join(__dirname, 'data');
const posDbs = ['restaurant.db', 'grocery.db'];

async function clearPosHistory(dbFile) {
    const dbPath = path.join(dbDataPath, dbFile);
    if (!fs.existsSync(dbPath)) {
        console.log(`[POS] Database not found: ${dbFile}`);
        return;
    }

    const db = new sqlite3.Database(dbPath);
    console.log(`[POS] Clearing history for: ${dbFile}...`);

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM bills");
            db.run("DELETE FROM bill_items");
            db.run("DELETE FROM stock_history");
            db.run("DELETE FROM login_history");
            db.run("DELETE FROM notifications");
            db.run("DELETE FROM active_orders", (err) => {
                db.close();
                if (err) {
                    console.error(`[POS] Error clearing ${dbFile}:`, err.message);
                    reject(err);
                } else {
                    console.log(`[POS] Successfully cleared: ${dbFile}`);
                    resolve();
                }
            });
        });
    });
}

async function run() {
    console.log("=== PRE-BUILD HISTORY CLEANUP STARTED ===\n");
    for (const dbFile of posDbs) {
        await clearPosHistory(dbFile);
    }
    console.log("\n=== PRE-BUILD HISTORY CLEANUP COMPLETED ===");
}

run().catch(console.error);
