import { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  const userId = localStorage.getItem("userId");

  const [balances, setBalances] = useState({
    spending_balance: 0,
    savings_balance: 0,
    emergency_balance: 0,
  });
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    needed: 0,
    fromSavings: 0,
    fromEmergency: 0,
  });

  const formatMoney = (val) => {
    if (!val && val !== 0) return "0";
    return Number(val).toLocaleString("vi-VN");
  };

  const loadData = async () => {
    try {
      const [balRes, catRes, transRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/balances/${userId}`),
        axios.get(`http://localhost:5000/api/categories/${userId}`),
        axios.get(`http://localhost:5000/api/transactions/${userId}`),
      ]);
      setBalances(balRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id);
      }
      setTransactions(transRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const totalAssets =
    (balances.spending_balance || 0) +
    (balances.savings_balance || 0) +
    (balances.emergency_balance || 0);

  // ================= TÍNH TOÁN NGÂN SÁCH ĐỘNG & THÂM HỤT =================
  const now = new Date();
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const currentDay = now.getDate();
  const remainingDays = lastDayOfMonth - currentDay + 1;

  const todayStr = now.toISOString().split("T")[0];
  const spentToday = transactions
    .filter(
      (t) => t.transaction_date && t.transaction_date.startsWith(todayStr),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const originalBudgetForToday =
    balances.spending_balance > 0
      ? Math.floor((balances.spending_balance + spentToday) / remainingDays)
      : 0;

  const strictBudgetTomorrow =
    remainingDays > 1 && balances.spending_balance > 0
      ? Math.floor(balances.spending_balance / (remainingDays - 1))
      : balances.spending_balance;

  const isOverspent = spentToday > originalBudgetForToday;
  const overspentAmount = spentToday - originalBudgetForToday;

  const remainingBudgetToday = isOverspent
    ? 0
    : originalBudgetForToday - spentToday;
  // ========================================================================

  const handleEditFundDirectly = async (fundKey, fundTitle) => {
    const currentVal = balances[fundKey];
    const inputVal = prompt(`Nhập số tiền mới cho [${fundTitle}]:`, currentVal);
    if (inputVal === null || isNaN(inputVal)) return;

    const newAmount = parseFloat(inputVal);
    const updatedBalances = {
      spending:
        fundKey === "spending_balance" ? newAmount : balances.spending_balance,
      savings:
        fundKey === "savings_balance" ? newAmount : balances.savings_balance,
      emergency:
        fundKey === "emergency_balance"
          ? newAmount
          : balances.emergency_balance,
    };

    try {
      const res = await axios.put(
        `http://localhost:5000/api/balances/${userId}`,
        updatedBalances,
      );
      if (res.data && res.data.balances) {
        setBalances(res.data.balances);
      } else {
        setBalances({
          spending_balance: updatedBalances.spending,
          savings_balance: updatedBalances.savings,
          emergency_balance: updatedBalances.emergency,
        });
      }
      await loadData();
    } catch (err) {
      alert("Lỗi cập nhật: " + (err.response?.data?.error || err.message));
    }
  };

  const handleTransferFund = async (fromFund, toFund, fundName) => {
    const inputVal = prompt(`Nhập số tiền muốn chuyển vào [${fundName}]:`);
    if (!inputVal || isNaN(inputVal) || Number(inputVal) <= 0) return;

    const transferAmount = parseFloat(inputVal);
    let spending = balances.spending_balance;
    let savings = balances.savings_balance;
    let emergency = balances.emergency_balance;

    if (fromFund === "spending" && spending < transferAmount)
      return alert("Số dư Quỹ Chi Tiêu không đủ!");
    if (fromFund === "savings" && savings < transferAmount)
      return alert("Số dư Quỹ Tiết Kiệm không đủ!");

    if (fromFund === "spending" && toFund === "savings") {
      spending -= transferAmount;
      savings += transferAmount;
    } else if (fromFund === "spending" && toFund === "emergency") {
      spending -= transferAmount;
      emergency += transferAmount;
    } else if (fromFund === "savings" && toFund === "spending") {
      savings -= transferAmount;
      spending += transferAmount;
    } else if (fromFund === "savings" && toFund === "emergency") {
      savings -= transferAmount;
      emergency += transferAmount;
    }

    try {
      await axios.put(`http://localhost:5000/api/balances/${userId}`, {
        spending,
        savings,
        emergency,
      });
      setBalances({
        spending_balance: spending,
        savings_balance: savings,
        emergency_balance: emergency,
      });
      await loadData();
    } catch (err) {
      alert("Lỗi chuyển quỹ: " + err.message);
    }
  };

  const handlePreAddTransaction = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return alert("Vui lòng nhập số tiền hợp lệ!");

    if (val <= balances.spending_balance) {
      executeTransaction();
    } else {
      const deficit = val - balances.spending_balance;
      let takeSavings = 0,
        takeEmergency = 0;

      if (balances.savings_balance >= deficit) {
        takeSavings = deficit;
      } else {
        takeSavings = balances.savings_balance;
        takeEmergency = deficit - takeSavings;
      }

      setPopupData({
        needed: val,
        fromSavings: takeSavings,
        fromEmergency: takeEmergency,
      });
      setShowPopup(true);
    }
  };

  const executeTransaction = async (
    acceptSavings = false,
    acceptEmergency = false,
  ) => {
    try {
      const nowTime = new Date();
      const localISOString = new Date(
        nowTime.getTime() - nowTime.getTimezoneOffset() * 60000,
      ).toISOString();

      await axios.post("http://localhost:5000/api/transactions", {
        user_id: userId,
        amount: parseFloat(amount),
        category_id: categoryId,
        note,
        transaction_date: localISOString,
        acceptSavings,
        acceptEmergency,
      });

      setAmount("");
      setNote("");
      setShowPopup(false);
      await loadData();
    } catch (err) {
      const errorData = err.response?.data;
      if (
        errorData?.code === "NEED_SAVINGS" ||
        errorData?.code === "NEED_EMERGENCY"
      ) {
        const deficit =
          errorData.shortfall || parseFloat(amount) - balances.spending_balance;
        let takeSavings = 0,
          takeEmergency = 0;
        if (errorData.code === "NEED_SAVINGS") {
          takeSavings = deficit;
        } else {
          takeSavings = balances.savings_balance;
          takeEmergency = deficit - takeSavings;
        }

        setPopupData({
          needed: parseFloat(amount),
          fromSavings: takeSavings,
          fromEmergency: takeEmergency,
        });
        setShowPopup(true);
      } else {
        alert("Lỗi: " + (errorData?.error || err.message));
      }
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (confirm("Xóa giao dịch này và hoàn tiền?")) {
      try {
        await axios.delete(`http://localhost:5000/api/transactions/${id}`);
        await loadData();
      } catch (err) {
        alert("Lỗi xóa giao dịch!");
      }
    }
  };

  const handleResetData = async () => {
    const confirmText = prompt(
      'CẢNH BÁO: Xóa sạch dữ liệu!\nGõ "XOA" để xác nhận:',
    );
    if (confirmText !== "XOA") return;
    try {
      await axios.delete(`http://localhost:5000/api/reset-data/${userId}`);
      localStorage.setItem("hasSetup", "false");
      window.location.href = "/setup";
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  return (
    <div className="p-3 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      {/* POP-UP THÁC NƯỚC */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 md:p-8 rounded-3xl max-w-lg w-full space-y-3 shadow-2xl border">
            <h3 className="text-base md:text-xl font-black text-rose-600">
              ⚠️ Cảnh Báo Hụt Quỹ
            </h3>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
              Hệ thống sẽ tự động trích xuất:
              {popupData.fromSavings > 0 && (
                <span className="block font-bold mt-1">
                  🔹 Lấy{" "}
                  <span className="text-blue-600">
                    {formatMoney(popupData.fromSavings)} đ
                  </span>{" "}
                  (Quỹ Tiết Kiệm)
                </span>
              )}
              {popupData.fromEmergency > 0 && (
                <span className="block font-bold mt-1 text-rose-600">
                  🔸 Lấy {formatMoney(popupData.fromEmergency)} đ (Quỹ Dự Phòng)
                </span>
              )}
            </p>
            <div className="flex gap-2 pt-3">
              <button
                onClick={() => executeTransaction(true, true)}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-full font-bold text-xs transition"
              >
                Đồng ý
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2.5 rounded-full font-bold text-xs transition"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TẦNG 1: 3 QUỸ THÁC NƯỚC (CHIA 2 CỘT TRÊN MOBILE) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Quỹ Chi Tiêu */}
        <div className="col-span-1 bg-white p-3.5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-l-4 md:border-l-8 border-l-blue-500 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] md:text-xs font-black uppercase text-blue-600 truncate mr-1">
              💰 Chi Tiêu
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("spending_balance", "Quỹ Chi Tiêu")
              }
              className="flex-shrink-0 text-[9px] md:text-xs bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-full"
            >
              Sửa
            </button>
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 truncate">
            {formatMoney(balances.spending_balance)}
            <span className="text-[10px] md:text-sm font-bold text-slate-400 ml-0.5">
              đ
            </span>
          </p>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() =>
                handleTransferFund("spending", "savings", "Quỹ Tiết Kiệm")
              }
              className="flex-1 bg-slate-100 text-slate-700 text-[9px] md:text-xs font-bold py-1.5 rounded-full text-center truncate"
            >
              Gửi tiết kiệm
            </button>
            <button
              onClick={() =>
                handleTransferFund("spending", "emergency", "Quỹ Dự Phòng")
              }
              className="flex-1 bg-slate-100 text-slate-700 text-[9px] md:text-xs font-bold py-1.5 rounded-full text-center truncate"
            >
              Gửi dự phòng
            </button>
          </div>
        </div>

        {/* Quỹ Tiết Kiệm */}
        <div className="col-span-1 bg-white p-3.5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-l-4 md:border-l-8 border-l-emerald-500 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] md:text-xs font-black uppercase text-emerald-600 truncate mr-1">
              🏦 Tiết Kiệm
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("savings_balance", "Quỹ Tiết Kiệm")
              }
              className="flex-shrink-0 text-[9px] md:text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full"
            >
              Sửa
            </button>
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 truncate">
            {formatMoney(balances.savings_balance)}
            <span className="text-[10px] md:text-sm font-bold text-slate-400 ml-0.5">
              đ
            </span>
          </p>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() =>
                handleTransferFund("savings", "spending", "Quỹ Chi Tiêu")
              }
              className="flex-1 bg-slate-100 text-slate-700 text-[9px] md:text-xs font-bold py-1.5 rounded-full text-center truncate"
            >
              Rút về chi tiêu
            </button>
            <button
              onClick={() =>
                handleTransferFund("savings", "emergency", "Quỹ Dự Phòng")
              }
              className="flex-1 bg-slate-100 text-slate-700 text-[9px] md:text-xs font-bold py-1.5 rounded-full text-center truncate"
            >
              Gửi dự phòng
            </button>
          </div>
        </div>

        {/* Quỹ Khẩn Cấp (Nằm dưới, kéo dài 2 cột trên mobile) */}
        <div className="col-span-2 lg:col-span-1 bg-white p-3.5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-l-4 md:border-l-8 border-l-rose-500 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] md:text-xs font-black uppercase text-rose-600">
              🚑 Dự Phòng Khẩn Cấp
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("emergency_balance", "Quỹ Khẩn Cấp")
              }
              className="text-[9px] md:text-xs bg-rose-50 text-rose-600 font-bold px-3 py-1 rounded-full"
            >
              Sửa số dư
            </button>
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 truncate">
            {formatMoney(balances.emergency_balance)}
            <span className="text-[10px] md:text-sm font-bold text-slate-400 ml-1">
              đ
            </span>
          </p>
          <div className="w-full bg-rose-50 text-rose-600 text-[9px] md:text-xs font-bold py-1.5 md:py-2 rounded-full text-center mt-1">
            Chỉ dùng khi khẩn cấp 🛡️
          </div>
        </div>
      </div>

      {/* TẦNG 2: NGÂN SÁCH ĐỘNG & TỔNG TÀI SẢN (CHIA 2 CỘT TRÊN MOBILE) */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {/* Thẻ Ngân Sách / Cảnh báo */}
        {isOverspent ? (
          <div className="col-span-2 bg-rose-50 border border-rose-200 p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col justify-center animate-pulse">
            <span className="text-[10px] md:text-sm font-bold text-rose-700 uppercase mb-1">
              ⚠️ Lố {formatMoney(overspentAmount)}đ hôm nay
            </span>
            <span className="text-sm md:text-xl font-black text-rose-900 leading-tight">
              Từ mai, tối đa:{" "}
              <span className="text-xl md:text-3xl block mt-0.5">
                {formatMoney(strictBudgetTomorrow)} đ / ngày
              </span>
            </span>
          </div>
        ) : (
          <div className="col-span-1 bg-emerald-50 border border-emerald-100 p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col justify-center">
            <span className="text-[9px] md:text-sm font-bold text-emerald-600 uppercase mb-1">
              💡 Gợi ý hôm nay
            </span>
            <span className="text-xl md:text-4xl font-black text-emerald-900 truncate">
              {formatMoney(remainingBudgetToday)} đ
            </span>
            <span className="text-[9px] md:text-xs text-emerald-700 mt-1 font-medium truncate">
              Gốc: {formatMoney(originalBudgetForToday)}đ
            </span>
          </div>
        )}

        {/* Thẻ Tổng Tài Sản */}
        <div
          className={`col-span-1 border p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col justify-between shadow-sm bg-white ${isOverspent ? "col-span-2" : ""}`}
        >
          <div>
            <span className="text-[9px] md:text-sm font-bold text-slate-500 uppercase mb-1 block">
              Tổng Tài Sản
            </span>
            <span className="text-xl md:text-4xl font-black text-slate-900 truncate">
              {formatMoney(totalAssets)} đ
            </span>
          </div>
          <button
            onClick={handleResetData}
            className="w-full bg-rose-50 text-rose-600 font-bold text-[9px] md:text-sm py-2 rounded-full mt-3 border border-rose-100"
          >
            🗑️ Xóa Data
          </button>
        </div>
      </div>

      {/* TẦNG 3: FORM & LỊCH SỬ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Form */}
        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border lg:col-span-1">
          <h2 className="text-sm md:text-lg font-black text-slate-900 mb-3">
            ✍️ Thêm Giao Dịch
          </h2>
          <form onSubmit={handlePreAddTransaction} className="space-y-3">
            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase text-slate-600 mb-1">
                Số tiền (VNĐ)
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 p-2.5 rounded-2xl font-bold text-sm outline-none"
                placeholder="VD: 100.000"
                value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase text-slate-600 mb-1">
                Danh mục
              </label>
              <select
                className="w-full bg-slate-50 p-2.5 rounded-2xl font-semibold text-sm outline-none"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase text-slate-600 mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 p-2.5 rounded-2xl outline-none text-sm"
                placeholder="VD: Mua giày..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-full mt-2"
            >
              (+) Thêm Giao Dịch
            </button>
          </form>
        </div>

        {/* Lịch sử */}
        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border lg:col-span-2 overflow-hidden">
          <h2 className="text-sm md:text-lg font-black text-slate-900 mb-3">
            📜 Lịch Sử Gần Nhất
          </h2>
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b text-[10px] md:text-xs font-bold text-slate-400 uppercase">
                  <th className="pb-2 pr-4">Thời gian</th>
                  <th className="pb-2 pr-4">Danh mục</th>
                  <th className="pb-2 pr-4">Ghi chú</th>
                  <th className="pb-2 pr-4 text-right">Số tiền</th>
                  <th className="pb-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs md:text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      Chưa có giao dịch nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-slate-500">
                        {new Date(t.transaction_date).toLocaleDateString(
                          "vi-VN",
                        )}
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-800">
                        {t.category_name}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {t.note || "..."}
                      </td>
                      <td className="py-3 pr-4 text-right font-black text-rose-600">
                        -{formatMoney(t.amount)} đ
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-[10px] bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-full"
                        >
                          Xóa ✖
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
