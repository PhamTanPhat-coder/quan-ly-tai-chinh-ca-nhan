const db = require("./db");

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
    // KIỂM TRA BẢO VỆ: Nếu tổng 3 quỹ không đủ thì chặn ngay lập tức, không cho âm tiền
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

    // Cập nhật số dư và lưu giao dịch vào DB chính xác theo giờ địa phương gửi lên
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

// ================= 3. XÓA GIAO DỊCH (HOÀN TIỀN VÀO QUỸ CHI TIÊU) =================

exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const trans = (
      await query(`SELECT * FROM transactions WHERE id = ?`, [id])
    )[0];
    if (!trans)
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });

    // Hoàn tiền vào quỹ chi tiêu của đúng user đó
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
