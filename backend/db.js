const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./finance.db", (err) => {
  if (err) console.error("Lỗi kết nối DB:", err.message);
  else console.log("Đã kết nối SQLite database.");
});

db.serialize(() => {
  // ĐÃ THÊM CỘT email UNIQUE
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE, 
    password TEXT,
    has_setup INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS balances (
    user_id INTEGER PRIMARY KEY,
    spending_balance REAL DEFAULT 0,
    savings_balance REAL DEFAULT 0,
    emergency_balance REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    category_id INTEGER,
    note TEXT,
    transaction_date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    lender_or_borrower TEXT, 
    person_name TEXT,
    amount REAL,
    borrowed_date TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Chưa trả',
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

module.exports = db;
