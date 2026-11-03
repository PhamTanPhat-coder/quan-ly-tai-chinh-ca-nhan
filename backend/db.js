const { Pool } = require("pg");

// Sử dụng chuỗi kết nối bạn đã lấy từ Supabase (đã mã hóa ký tự @ thành %40)
const pool = new Pool({
  connectionString:
    "postgresql://postgres.qvvksdzvixxcfkvgbdjq:Tanphat123%40@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then(() => console.log("Đã kết nối thành công với Supabase PostgreSQL! 🚀"))
  .catch((err) => console.error("Lỗi kết nối Supabase:", err.stack));

// Khởi tạo cấu trúc các bảng và Indexing (PostgreSQL)
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT,
        username TEXT UNIQUE,
        email TEXT UNIQUE, 
        password TEXT,
        has_setup INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS balances (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        spending_balance REAL DEFAULT 0,
        savings_balance REAL DEFAULT 0,
        emergency_balance REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount REAL,
        category_id INTEGER REFERENCES categories(id),
        note TEXT,
        transaction_date TEXT
      );

      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        lender_or_borrower TEXT, 
        person_name TEXT,
        amount REAL,
        borrowed_date TEXT,
        due_date TEXT,
        status TEXT DEFAULT 'Chưa trả'
      );

      -- BỔ SUNG INDEXING ĐỂ TĂNG TỐC ĐỘ ĐỌC DỮ LIỆU
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    `);
    console.log("Đã khởi tạo xong cấu trúc bảng và Indexing trên Supabase.");
  } catch (err) {
    console.error("Lỗi tạo bảng:", err);
  }
};

initDB();

module.exports = pool;
