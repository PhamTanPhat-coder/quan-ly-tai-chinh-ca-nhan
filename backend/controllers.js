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

// =====================================================================
// ================= 1. QUẢN LÝ QUỸ (BALANCES) =========================
// =====================================================================

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
    // Đánh dấu user đã setup thành công
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

// =====================================================================
// ================= 2. LOGIC THÊM GIAO DỊCH (THÁC NƯỚC) ===============
// =====================================================================

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

    if (!balance) {
      return res.status(404).json({ error: "Không tìm thấy thông tin quỹ!" });
    }

    let spend = balance.spending_balance;
    let save = balance.savings_balance;
    let emer = balance.emergency_balance;
    let totalAvailable = spend + save + emer;

    // KIỂM TRA BẢO VỆ: Nếu tổng 3 quỹ không đủ thì chặn ngay lập tức
    if (cost > totalAvailable) {
      return res.status(400).json({
        error:
          "Tổng tài sản của tất cả các quỹ không đủ để chi trả giao dịch này!",
      });
    }

    // 1. Nếu tiêu không vượt quá tiền chi tiêu
    if (cost <= spend) {
      spend -= cost;
    }
    // 2. Nếu vượt quá chi tiêu nhưng đủ (chi tiêu + tiết kiệm)
    else if (cost > spend && cost <= spend + save) {
      if (!acceptSavings) {
        return res.status(400).json({
          code: "NEED_SAVINGS",
          message:
            "Số tiền trong tài khoản chi tiêu không đủ. Bạn có muốn lấy thêm từ quỹ tiết kiệm không?",
          shortfall: cost - spend,
        });
      }
      const remaining = cost - spend;
      spend = 0;
      save -= remaining;
    }
    // 3. Phải dùng đến quỹ khẩn cấp
    else {
      if (!acceptEmergency) {
        return res.status(400).json({
          code: "NEED_EMERGENCY",
          message:
            "Tài khoản tiết kiệm và chi tiêu không đủ. Bạn có muốn lấy thêm từ Quỹ dự phòng khẩn cấp không?",
          shortfall: cost - (spend + save),
        });
      }
      const remaining = cost - (spend + save);
      spend = 0;
      save = 0;
      emer -= remaining;
    }

    // Cập nhật số dư
    await run(
      `UPDATE balances SET spending_balance = ?, savings_balance = ?, emergency_balance = ? WHERE user_id = ?`,
      [spend, save, emer, user_id],
    );

    // Lưu giao dịch
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

// =====================================================================
// ================= 3. XÓA GIAO DỊCH VÀ LẤY DANH MỤC ==================
// =====================================================================

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const trans = (
      await query(`SELECT * FROM transactions WHERE id = ?`, [id])
    )[0];

    if (!trans) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }

    // Hoàn tiền vào quỹ chi tiêu
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
      `
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      JOIN categories c ON t.category_id = c.id 
      WHERE t.user_id = ? 
      ORDER BY t.id DESC LIMIT 15
    `,
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

// =====================================================================
// ================= 4. QUẢN LÝ SỔ NỢ (DEBTS) ==========================
// =====================================================================

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
  const cost = parseFloat(amount);

  try {
    const balance = (
      await query(`SELECT * FROM balances WHERE user_id = ?`, [user_id])
    )[0];
    if (!balance)
      return res.status(404).json({ error: "Lỗi không tìm thấy quỹ" });

    // LOGIC LIÊN KẾT QUỸ TIẾT KIỆM
    if (lender_or_borrower === "Người ta nợ") {
      // Mình cho mượn -> Trừ tiền Quỹ Tiết Kiệm
      if (balance.savings_balance < cost) {
        return res.status(400).json({
          error: "Quỹ tiết kiệm của bạn không đủ tiền để cho mượn khoản này!",
        });
      }
      await run(
        `UPDATE balances SET savings_balance = savings_balance - ? WHERE user_id = ?`,
        [cost, user_id],
      );
    } else {
      // Mình đi mượn (Nợ người ta) -> Nhận được tiền -> Cộng vào Quỹ Tiết Kiệm
      await run(
        `UPDATE balances SET savings_balance = savings_balance + ? WHERE user_id = ?`,
        [cost, user_id],
      );
    }

    // Ghi vào sổ nợ
    await run(
      `INSERT INTO debts (user_id, lender_or_borrower, person_name, amount, borrowed_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Chưa trả')`,
      [user_id, lender_or_borrower, person_name, cost, borrowed_date, due_date],
    );
    res.json({ message: "Thêm khoản nợ và đồng bộ quỹ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDebtStatus = async (req, res) => {
  const { id } = req.params;
  const { status, user_id } = req.body; // Yêu cầu FE gửi kèm user_id

  try {
    const debt = (
      await query(`SELECT * FROM debts WHERE id = ? AND user_id = ?`, [
        id,
        user_id,
      ])
    )[0];
    if (!debt)
      return res.status(404).json({ error: "Không tìm thấy khoản nợ" });

    const balance = (
      await query(`SELECT * FROM balances WHERE user_id = ?`, [user_id])
    )[0];
    const cost = parseFloat(debt.amount);

    if (status === "Đã trả") {
      // Đổi từ "Chưa trả" sang "Đã trả"
      if (debt.lender_or_borrower === "Người ta nợ") {
        // Người ta trả tiền cho mình -> Cộng lại vào Tiết kiệm
        await run(
          `UPDATE balances SET savings_balance = savings_balance + ? WHERE user_id = ?`,
          [cost, user_id],
        );
      } else {
        // Mình đi trả nợ người ta -> Trừ tiền khỏi Tiết kiệm
        if (balance.savings_balance < cost) {
          return res.status(400).json({
            error: "Quỹ tiết kiệm không đủ tiền để thanh toán khoản nợ này!",
          });
        }
        await run(
          `UPDATE balances SET savings_balance = savings_balance - ? WHERE user_id = ?`,
          [cost, user_id],
        );
      }
    } else {
      // Đổi từ "Đã trả" về lại "Chưa trả" (Hoàn tác)
      if (debt.lender_or_borrower === "Người ta nợ") {
        // Hủy việc người ta trả -> Trừ lại tiền khỏi Tiết Kiệm
        if (balance.savings_balance < cost) {
          return res.status(400).json({
            error:
              "Không thể hoàn tác vì số dư Tiết kiệm hiện tại nhỏ hơn khoản tiền thu hồi!",
          });
        }
        await run(
          `UPDATE balances SET savings_balance = savings_balance - ? WHERE user_id = ?`,
          [cost, user_id],
        );
      } else {
        // Hủy việc mình đã trả nợ -> Lấy lại tiền về Tiết Kiệm
        await run(
          `UPDATE balances SET savings_balance = savings_balance + ? WHERE user_id = ?`,
          [cost, user_id],
        );
      }
    }

    // Cập nhật trạng thái
    await run(`UPDATE debts SET status = ? WHERE id = ?`, [status, id]);
    res.json({ message: "Cập nhật trạng thái nợ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDebt = async (req, res) => {
  const { id } = req.params;
  try {
    const debt = (await query(`SELECT * FROM debts WHERE id = ?`, [id]))[0];
    if (!debt)
      return res.status(404).json({ error: "Không tìm thấy khoản nợ" });

    // CHỈ HOÀN TIỀN VÀO QUỸ NẾU KHOẢN NỢ ĐÓ VẪN CÒN "CHƯA TRẢ"
    // Còn nếu ĐÃ TRẢ xong rồi mà bấm xóa thì tiền quỹ đã khớp thực tế từ trước đó rồi, KHÔNG CẦN HOÀN TIỀN NỮA.
    if (debt.status === "Chưa trả") {
      const balance = (
        await query(`SELECT * FROM balances WHERE user_id = ?`, [debt.user_id])
      )[0];
      const cost = parseFloat(debt.amount);

      if (debt.lender_or_borrower === "Người ta nợ") {
        await run(
          `UPDATE balances SET savings_balance = savings_balance + ? WHERE user_id = ?`,
          [cost, debt.user_id],
        );
      } else {
        if (balance.savings_balance < cost) {
          return res.status(400).json({
            error:
              "Không thể xóa vì số dư Tiết kiệm hiện tại không đủ để hoàn tác dòng tiền!",
          });
        }
        await run(
          `UPDATE balances SET savings_balance = savings_balance - ? WHERE user_id = ?`,
          [cost, debt.user_id],
        );
      }
    }

    await run(`DELETE FROM debts WHERE id = ?`, [id]);
    res.json({ message: "Đã xóa bản ghi thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================================================================
// ================= 5. HỆ THỐNG XÁC THỰC & BẢO MẬT ====================
// =====================================================================

// Regex chuẩn: Có Hoa, thường, số, ký tự đặc biệt, ít nhất 8 ký tự
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

exports.registerUser = async (req, res) => {
  const { full_name, username, email, password } = req.body;
  try {
    // 1. Validate Mật khẩu tại Backend
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Mật khẩu yếu: Phải từ 8 ký tự trở lên, bao gồm chữ hoa, thường, số và ký tự đặc biệt!",
      });
    }

    // 2. Kiểm tra xem Username hoặc Email đã tồn tại chưa
    const exist = await query(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [username, email],
    );
    if (exist.length > 0) {
      return res
        .status(400)
        .json({ error: "Tên đăng nhập hoặc Email đã tồn tại!" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu User và lấy ra ID
    const result = await run(
      `INSERT INTO users (full_name, username, email, password) VALUES (?, ?, ?, ?)`,
      [full_name, username, email, hashedPassword],
    );
    const userId = result.lastID;

    // Khởi tạo quỹ và danh mục mặc định
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

    if (!user) {
      return res
        .status(400)
        .json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
    }

    // So sánh mật khẩu mã hóa
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(400)
        .json({ error: "Sai tên đăng nhập hoặc mật khẩu!" });
    }

    res.json({
      user: { id: user.id, fullName: user.full_name, hasSetup: user.has_setup },
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

// CẤU HÌNH GMAIL GỬI MAIL TỰ ĐỘNG
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "quanlytaichinh.app.noreply@gmail.com", // HÃY NHỚ SỬA LẠI ĐÚNG GMAIL CỦA BẠN
    pass: "epsg fiep kibj kvoe",
  },
});

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = (
      await query(`SELECT * FROM users WHERE email = ?`, [email])
    )[0];

    if (!user) {
      return res
        .status(404)
        .json({ error: "Email này chưa được đăng ký trong hệ thống!" });
    }

    // Thuật toán tạo mật khẩu mạnh ngẫu nhiên đảm bảo Regex
    const generateStrongPassword = () => {
      const lower = "abcdefghijklmnopqrstuvwxyz";
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const num = "0123456789";
      const special = "@$!%*?&";
      const all = lower + upper + num + special;

      let pwd = "";
      // Ép cứng bốc ít nhất 1 chữ thường, 1 chữ hoa, 1 số, 1 ký tự đặc biệt
      pwd += lower[Math.floor(Math.random() * lower.length)];
      pwd += upper[Math.floor(Math.random() * upper.length)];
      pwd += num[Math.floor(Math.random() * num.length)];
      pwd += special[Math.floor(Math.random() * special.length)];

      // Bốc thêm 4 ký tự ngẫu nhiên nữa để đủ 8 ký tự
      for (let i = 0; i < 4; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
      }

      // Xáo trộn ngẫu nhiên thứ tự của 8 ký tự này
      return pwd
        .split("")
        .sort(() => 0.5 - Math.random())
        .join("");
    };

    const newRawPassword = generateStrongPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newRawPassword, salt);

    await run(`UPDATE users SET password = ? WHERE id = ?`, [
      hashedNewPassword,
      user.id,
    ]);

    // Gửi Mail
    const mailOptions = {
      from: "SmartFinance System",
      to: email,
      subject: "🔑 Mật khẩu truy cập mới - SmartFinance",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #0f172a;">Xin chào ${user.full_name},</h2>
          <p>Hệ thống đã nhận được yêu cầu cấp lại mật khẩu của bạn.</p>
          <p>Tên đăng nhập của bạn là: <strong>${user.username}</strong></p>
          <p>Mật khẩu mới của bạn (đã được tạo chuẩn bảo mật) là:</p>
          <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #dc2626; border-radius: 8px; margin: 20px 0;">
            ${newRawPassword}
          </div>
          <p style="color: #64748b; font-size: 14px;">Vui lòng đăng nhập bằng mật khẩu này và vào phần Cài đặt để đổi lại mật khẩu cá nhân.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: "Không thể gửi Email. Vui lòng thử lại sau." });
      }
      res.json({
        message: "Mật khẩu bảo mật mới đã được gửi vào Email của bạn!",
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};

exports.changePassword = async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  try {
    // 1. Validate Mật khẩu mới tại Backend
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "Mật khẩu mới yếu: Phải từ 8 ký tự trở lên, bao gồm chữ hoa, thường, số và ký tự đặc biệt!",
      });
    }

    const user = (await query(`SELECT * FROM users WHERE id = ?`, [userId]))[0];

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });
    }

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

// =====================================================================
// ================= 6. QUẢN LÝ THÔNG TIN CÁ NHÂN (PROFILE) ============
// =====================================================================

exports.getUserInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await query(
      `SELECT id, full_name, username, email FROM users WHERE id = ?`,
      [userId],
    );
    if (user.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy user" });
    }
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
    if (exist.length > 0) {
      return res
        .status(400)
        .json({ error: "Email này đã được tài khoản khác sử dụng!" });
    }

    await run(`UPDATE users SET email = ? WHERE id = ?`, [newEmail, userId]);

    res.json({ message: "Cập nhật Email thành công!" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi Server" });
  }
};
// =====================================================================
// ================= 7. TÍCH HỢP AI GROQ (PHÂN TÍCH TÀI CHÍNH + GOOGLE) =
// =====================================================================
const Groq = require("groq-sdk");
const google = require("googlethis");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
exports.analyzeFinanceAI = async (req, res) => {
  const { message, transactions, balances, debts, isAutoAnalyze } = req.body;

  try {
    const transSummary = transactions
      .map(
        (t) =>
          `${t.transaction_date.split("T")[0]} | ${t.category_name} | -${t.amount}đ | ${t.note || ""}`,
      )
      .join("\n");
    const debtSummary = debts
      .map(
        (d) =>
          `${d.lender_or_borrower}: ${d.person_name} | ${d.amount}đ | Hạn: ${d.due_date} | ${d.status}`,
      )
      .join("\n");

    // =========================================================
    // THUẬT TOÁN TÍNH NGÂN SÁCH ĐỂ BÁO ĐỘNG CHO AI
    // =========================================================
    const now = new Date();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const remainingDays = lastDayOfMonth - now.getDate() + 1;
    const todayStr = now.toISOString().split("T")[0];

    let spentToday = 0;
    transactions.forEach((t) => {
      if (t.transaction_date.startsWith(todayStr)) spentToday += t.amount;
    });

    const spendingBalance = balances?.spending_balance || 0;
    const originalTodayBudget =
      (spendingBalance + spentToday) / (remainingDays || 1);

    let budgetWarning = "";
    if (spentToday > originalTodayBudget) {
      const overspent = spentToday - originalTodayBudget;
      const newDailyLimit =
        spendingBalance / (remainingDays - 1 > 0 ? remainingDays - 1 : 1);
      budgetWarning = `🚨 BÁO ĐỘNG ĐỎ: Người dùng đã TIÊU LỐ ${Math.round(overspent)}đ trong ngày hôm nay! Hạn mức ép buộc từ mai chỉ còn ${Math.round(newDailyLimit)}đ/ngày. BẮT BUỘC PHẢI CẢNH BÁO GAY GẮT NGAY DÒNG ĐẦU TIÊN!`;
    } else {
      budgetWarning = `✅ Tình hình chi tiêu trong ngày an toàn.`;
    }

    let systemPrompt = "";
    let userMessage = message;

    if (isAutoAnalyze) {
      // 🧠 BÁO CÁO CỰC KỲ NGẮN GỌN (ÉP BUỘC ĐỌC CẢNH BÁO NGÂN SÁCH)
      systemPrompt = `Bạn là Cố vấn Tài chính AI cực kỳ nghiêm khắc.
      Dữ liệu:
      - Quỹ: Chi tiêu ${spendingBalance}đ, Khẩn cấp ${balances?.emergency_balance || 0}đ.
      - Chi tiêu: \n${transSummary || "Trống"}
      - Nợ: \n${debtSummary || "Trống"}
      
      THÔNG TIN KIỂM SOÁT TỪ HỆ THỐNG: ${budgetWarning}
      
      NHIỆM VỤ: Đánh giá TỐI ĐA 4 GẠCH ĐẦU DÒNG. Mỗi dòng chỉ 1-2 câu ngắn gọn.
      1. Ngân sách: Xử lý ngay Thông tin kiểm soát (nếu tiêu lố, phải khiển trách và báo hạn mức mới).
      2. Giá cả: Nhận diện mua hớ hoặc sai logic (VD: máy tính 100k -> phụ kiện).
      3. Sức khỏe: Báo động nếu ăn mỡ/ngọt.
      4. Nợ nần: Cảnh báo nợ sắp hạn.
      TUYỆT ĐỐI KHÔNG giải thích lôi thôi, đi thẳng vào số liệu.`;

      userMessage =
        "Đánh giá thật ngắn gọn các điểm bất thường về ngân sách, giá cả và nợ.";
    } else {
      // 🤖 TỐI ƯU HÓA GOOGLE SEARCH + KIẾN THỨC NỀN
      let searchContext = "";
      try {
        const searchOptions = {
          page: 0,
          safe: false,
          additional_params: { hl: "vi", gl: "vn" },
        };
        const searchResponse = await google.search(message, searchOptions);

        let snippets = [];
        if (searchResponse.featured_snippet?.description)
          snippets.push("- " + searchResponse.featured_snippet.description);
        if (searchResponse.results?.length > 0) {
          snippets.push(
            ...searchResponse.results
              .slice(0, 3)
              .map((r) => `- ${r.title}: ${r.description}`),
          );
        }
        if (snippets.length > 0)
          searchContext = `[KẾT QUẢ GOOGLE MỚI NHẤT]:\n${snippets.join("\n")}`;
      } catch (e) {
        console.error("Lỗi Google Search:", e.message);
      }

      systemPrompt = `Bạn là Trợ Lý AI.
      DỮ LIỆU SỔ SÁCH CỦA TÔI: \nGiao dịch: \n${transSummary}\n Nợ: \n${debtSummary}
      
      ${searchContext}
      
      NGUYÊN TẮC:
      1. Nếu người dùng hỏi giá cả/tin tức, HÃY ƯU TIÊN lấy dữ liệu từ [KẾT QUẢ GOOGLE MỚI NHẤT] để trả lời.
      2. Nếu [KẾT QUẢ GOOGLE] trống, HÃY TỰ DÙNG KIẾN THỨC VỐN CÓ TRONG NÃO CỦA BẠN để đưa ra mức giá ước lượng hoặc tư vấn. KHÔNG ĐƯỢC XIN LỖI LÀ KHÔNG CÓ DỮ LIỆU.
      3. Trả lời NGẮN GỌN, đi thẳng vào vấn đề.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "qwen/qwen3.8-27b",
      temperature: 0.3,
    });

    res.json({ reply: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error("Lỗi Groq AI:", error.message);
    res.status(500).json({ error: "Lỗi kết nối với Trợ lý AI Groq!" });
  }
};
