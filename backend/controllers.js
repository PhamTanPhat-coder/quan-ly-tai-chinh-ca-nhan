const db = require("./db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Hàm hỗ trợ Promisify
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

// ================= 1. QUẢN LÝ QUỸ (BALANCES) =================

exports.getBalances = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await query(
      `SELECT spending_balance, savings_balance, emergency_balance FROM balances WHERE user_id = ?`,
      [userId],
    );
    res.json(
      user[0] || {
        spending_balance: 0,
        savings_balance: 0,
        emergency_balance: 0,
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBalances = async (req, res) => {
  const { userId } = req.params;
  const { spending, savings, emergency } = req.body;
  try {
    await run(
      `UPDATE balances SET spending_balance = ?, savings_balance = ?, emergency_balance = ? WHERE user_id = ?`,
      [spending, savings, emergency, userId],
    );
    await run(`UPDATE users SET has_setup = 1 WHERE id = ?`, [userId]);
    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetData = async (req, res) => {
  const { userId } = req.params;
  try {
    await run(`DELETE FROM transactions WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM debts WHERE user_id = ?`, [userId]);
    await run(
      `UPDATE balances SET spending_balance = 0, savings_balance = 0, emergency_balance = 0 WHERE user_id = ?`,
      [userId],
    );
    await run(`UPDATE users SET has_setup = 0 WHERE id = ?`, [userId]);
    res.json({ message: "Đã xóa toàn bộ dữ liệu cá nhân" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= 2. LOGIC THÊM GIAO DỊCH (THÁC NƯỚC) =================

exports.addTransaction = async (req, res) => {
  const {
    user_id,
    amount,
    category_id,
    note,
    transaction_date,
    acceptSavings,
    acceptEmergency,
  } = req.body;
  const cost = parseInt(amount);

  try {
    const balance = (
      await query(`SELECT * FROM balances WHERE user_id = ?`, [user_id])
    )[0];
    if (!balance)
      return res.status(404).json({ error: "Không tìm thấy thông tin quỹ!" });

    let spend = balance.spending_balance;
    let save = balance.savings_balance;
    let emer = balance.emergency_balance;
    let totalAvailable = spend + save + emer;

    if (cost > totalAvailable) {
      return res
        .status(400)
        .json({ error: "Tổng tài sản không đủ để chi trả giao dịch này!" });
    }

    if (cost <= spend) {
      spend -= cost;
    } else if (cost > spend && cost <= spend + save) {
      if (!acceptSavings) {
        return res.status(400).json({
          code: "NEED_SAVINGS",
          message:
            "Số tiền chi tiêu không đủ. Bạn có muốn lấy thêm từ quỹ tiết kiệm không?",
          shortfall: cost - spend,
        });
      }
      const remaining = cost - spend;
      spend = 0;
      save -= remaining;
    } else {
      if (!acceptEmergency) {
        return res.status(400).json({
          code: "NEED_EMERGENCY",
          message:
            "Tiết kiệm không đủ. Lấy thêm từ Quỹ dự phòng khẩn cấp không?",
          shortfall: cost - (spend + save),
        });
      }
      const remaining = cost - (spend + save);
      spend = 0;
      save = 0;
      emer -= remaining;
    }

    await run(
      `UPDATE balances SET spending_balance = ?, savings_balance = ?, emergency_balance = ? WHERE user_id = ?`,
      [spend, save, emer, user_id],
    );
    await run(
      `INSERT INTO transactions (user_id, category_id, amount, note, transaction_date) VALUES (?, ?, ?, ?, ?)`,
      [
        user_id,
        category_id,
        cost,
        note,
        transaction_date || new Date().toISOString(),
      ],
    );

    res.json({
      success: true,
      message: "Giao dịch thành công",
      balances: { spending: spend, savings: save, emergency: emer },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const trans = (
      await query(`SELECT * FROM transactions WHERE id = ?`, [id])
    )[0];
    if (!trans)
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });

    await run(
      `UPDATE balances SET spending_balance = spending_balance + ? WHERE user_id = ?`,
      [trans.amount, trans.user_id],
    );
    await run(`DELETE FROM transactions WHERE id = ?`, [id]);
    res.json({ message: "Đã xóa và hoàn tiền vào quỹ chi tiêu" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  const { userId } = req.params;
  try {
    const trans = await query(
      `SELECT t.*, c.name as category_name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? ORDER BY t.id DESC LIMIT 15`,
      [userId],
    );
    res.json(trans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  const { userId } = req.params;
  try {
    const cats = await query(
      `SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL`,
      [userId],
    );
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= 4. QUẢN LÝ SỔ NỢ (DEBTS) =================

exports.getDebts = async (req, res) => {
  const { userId } = req.params;
  try {
    const debts = await query(
      `SELECT * FROM debts WHERE user_id = ? ORDER BY id DESC`,
      [userId],
    );
    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addDebt = async (req, res) => {
  const {
    user_id,
    lender_or_borrower,
    person_name,
    amount,
    borrowed_date,
    due_date,
  } = req.body;
  try {
    await run(
      `INSERT INTO debts (user_id, lender_or_borrower, person_name, amount, borrowed_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Chưa trả')`,
      [
        user_id,
        lender_or_borrower,
        person_name,
        amount,
        borrowed_date,
        due_date,
      ],
    );
    res.json({ message: "Thêm khoản nợ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDebtStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await run(`UPDATE debts SET status = ? WHERE id = ?`, [status, id]);
    res.json({ message: "Cập nhật trạng thái nợ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDebt = async (req, res) => {
  const { id } = req.params;
  try {
    await run(`DELETE FROM debts WHERE id = ?`, [id]);
    res.json({ message: "Xóa khoản nợ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= 5. HỆ THỐNG XÁC THỰC & BẢO MẬT =================

exports.registerUser = async (req, res) => {
  const { full_name, username, email, password } = req.body;
  try {
    const exist = await query(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [username, email],
    );
    if (exist.length > 0)
      return res
        .status(400)
        .json({ error: "Tên đăng nhập hoặc Email đã tồn tại!" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await run(
      `INSERT INTO users (full_name, username, email, password) VALUES (?, ?, ?, ?)`,
      [full_name, username, email, hashedPassword],
    );
    const userId = result.lastID;

    // BỔ SUNG: Khởi tạo số dư 0đ và danh mục mặc định
    await run(
      `INSERT INTO balances (user_id, spending_balance, savings_balance, emergency_balance) VALUES (?, 0, 0, 0)`,
      [userId],
    );
    await run(`INSERT INTO categories (user_id, name) VALUES (?, 'Mua sắm')`, [
      userId,
    ]);
    await run(`INSERT INTO categories (user_id, name) VALUES (?, 'Ăn uống')`, [
      userId,
    ]);

    res.json({ message: "Đăng ký thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server: " + error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = (
      await query(`SELECT * FROM users WHERE username = ?`, [username])
    )[0];
    if (!user)
      return res
        .status(400)
        .json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });

    res.json({
      user: { id: user.id, fullName: user.full_name, hasSetup: user.has_setup },
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

// CẤU HÌNH GMAIL
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "quanlytaichinh.app.noreply@gmail.com",
    pass: "epsg fiep kibj kvoe",
  },
});

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = (
      await query(`SELECT * FROM users WHERE email = ?`, [email])
    )[0];
    if (!user)
      return res
        .status(404)
        .json({ error: "Email này chưa được đăng ký trong hệ thống!" });

    const newRawPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newRawPassword, salt);

    await run(`UPDATE users SET password = ? WHERE id = ?`, [
      hashedNewPassword,
      user.id,
    ]);

    const mailOptions = {
      from: "SmartFinance System",
      to: email,
      subject: "🔑 Mật khẩu truy cập mới - SmartFinance",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #0f172a;">Xin chào ${user.full_name},</h2>
          <p>Hệ thống đã nhận được yêu cầu cấp lại mật khẩu của bạn.</p>
          <p>Tên đăng nhập của bạn là: <strong>${user.username}</strong></p>
          <p>Mật khẩu tạm thời của bạn là:</p>
          <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #dc2626; border-radius: 8px; margin: 20px 0;">
            ${newRawPassword}
          </div>
          <p style="color: #64748b; font-size: 14px;">Vui lòng đăng nhập bằng mật khẩu này và vào phần Cài đặt để đổi lại mật khẩu an toàn hơn.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error)
        return res
          .status(500)
          .json({ error: "Không thể gửi Email. Vui lòng thử lại sau." });
      res.json({ message: "Mật khẩu mới đã được gửi vào Email của bạn!" });
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

exports.changePassword = async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  try {
    const user = (await query(`SELECT * FROM users WHERE id = ?`, [userId]))[0];
    const validPassword = await bcrypt.compare(oldPassword, user.password);

    if (!validPassword)
      return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    await run(`UPDATE users SET password = ? WHERE id = ?`, [
      hashedNewPassword,
      userId,
    ]);

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

// ================= 6. QUẢN LÝ THÔNG TIN CÁ NHÂN (PROFILE) =================

exports.getUserInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await query(
      `SELECT id, full_name, username, email FROM users WHERE id = ?`,
      [userId],
    );
    if (user.length === 0)
      return res.status(404).json({ error: "Không tìm thấy user" });
    res.json(user[0]);
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

exports.changeEmail = async (req, res) => {
  const { userId, newEmail } = req.body;
  try {
    const exist = await query(
      `SELECT * FROM users WHERE email = ? AND id != ?`,
      [newEmail, userId],
    );
    if (exist.length > 0)
      return res
        .status(400)
        .json({ error: "Email này đã được tài khoản khác sử dụng!" });

    await run(`UPDATE users SET email = ? WHERE id = ?`, [newEmail, userId]);
    res.json({ message: "Cập nhật Email thành công!" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};
