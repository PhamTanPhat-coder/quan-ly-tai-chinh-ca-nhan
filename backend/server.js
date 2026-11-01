const express = require("express");
const cors = require("cors");
const db = require("./db");
const controllers = require("./controllers");

const app = express();
app.use(express.json());
app.use(cors());

// ================= AUTHENTICATION (ĐÃ CHUYỂN SANG CONTROLLERS) =================
// 4 Route này sẽ tự động gọi hàm xử lý mã hóa mật khẩu và gửi mail trong controllers.js
app.post("/api/register", controllers.registerUser);
app.post("/api/login", controllers.loginUser);
app.post("/api/forgot-password", controllers.forgotPassword);
app.post("/api/change-password", controllers.changePassword);

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
// =================Lấy thông tin cá nhân và Đổi Email=================
app.get("/api/user/:userId", controllers.getUserInfo);
app.put("/api/change-email", controllers.changeEmail);
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
