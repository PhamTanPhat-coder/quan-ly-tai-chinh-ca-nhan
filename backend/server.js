const express = require("express");
const cors = require("cors");
const db = require("./db");
const controllers = require("./controllers");

const app = express();
app.use(express.json());
app.use(cors());

// ================= AUTHENTICATION =================
app.post("/api/register", (req, res) => {
  const { full_name, username, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Mật khẩu nhập lại không khớp!" });
  }
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error:
        "Mật khẩu yếu: Phải từ 8 ký tự trở lên, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt!",
    });
  }

  db.run(
    `INSERT INTO users (full_name, username, password, has_setup) VALUES (?, ?, ?, 0)`,
    [full_name, username, password],
    function (err) {
      if (err)
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
      const userId = this.lastID;
      db.run(
        `INSERT INTO balances (user_id, spending_balance, savings_balance, emergency_balance) VALUES (?, 0, 0, 0)`,
        [userId],
      );
      db.run(`INSERT INTO categories (user_id, name) VALUES (?, 'Mua sắm')`, [
        userId,
      ]);
      db.run(`INSERT INTO categories (user_id, name) VALUES (?, 'Ăn uống')`, [
        userId,
      ]);
      res.json({ success: true, userId });
    },
  );
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    `SELECT * FROM users WHERE username = ? AND password = ?`,
    [username, password],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user)
        return res
          .status(401)
          .json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
      res.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          username: user.username,
          hasSetup: user.has_setup === 1,
        },
      });
    },
  );
});

// ================= QUẢN LÝ QUỸ =================
app.get("/api/balances/:userId", controllers.getBalances);
app.put("/api/balances/:userId", controllers.updateBalances);
app.delete("/api/reset-data/:userId", controllers.resetData);

// ================= GIAO DỊCH & THÁC NƯỚC =================
app.get("/api/categories/:userId", controllers.getCategories);
app.get("/api/transactions/:userId", controllers.getTransactions);
app.post("/api/transactions", controllers.addTransaction);
app.delete("/api/transactions/:id", controllers.deleteTransaction);

// ================= SỔ NỢ =================
app.get("/api/debts/:userId", controllers.getDebts);
app.post("/api/debts", controllers.addDebt);
app.put("/api/debts/:id/status", controllers.updateDebtStatus);
app.delete("/api/debts/:id", controllers.deleteDebt);
// ================= CRON JOB: KẾT TOÁN TỰ ĐỘNG CUỐI THÁNG =================
const cron = require("node-cron");

// Chạy vào lúc 23:59 mỗi ngày để kiểm tra
cron.schedule("59 23 * * *", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Nếu ngày mai là mùng 1 (tức là hôm nay là ngày cuối cùng của tháng)
  if (tomorrow.getDate() === 1) {
    console.log(
      "Tiến hành kết toán cuối tháng: Chuyển tiền dư vào quỹ tiết kiệm...",
    );

    // Tìm tất cả user có tiền dư trong quỹ chi tiêu
    db.all(
      `SELECT * FROM balances WHERE spending_balance > 0`,
      [],
      (err, rows) => {
        if (err) return console.error(err);

        rows.forEach((row) => {
          const newSavings = row.savings_balance + row.spending_balance;
          // Chuyển toàn bộ spending_balance sang savings_balance, đưa spending về 0
          db.run(
            `UPDATE balances SET savings_balance = ?, spending_balance = 0 WHERE user_id = ?`,
            [newSavings, row.user_id],
          );
        });
      },
    );
  }
});
app.listen(5000, () => {
  console.log("Backend đang chạy trên cổng 5000");
});
