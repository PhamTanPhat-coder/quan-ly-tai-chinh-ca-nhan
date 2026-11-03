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

  // State quản lý việc hiển thị Bảng chọn Danh mục (Modal)
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const formatMoney = (val) => {
    if (!val && val !== 0) return "0";
    return Number(val).toLocaleString("vi-VN");
  };

  const loadData = async () => {
    try {
      const [balRes, catRes, transRes] = await Promise.all([
        axios.get(
          `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
        ),
        axios.get(
          `https://finance-backend-6wv7.onrender.com/api/categories/${userId}`,
        ),
        axios.get(
          `https://finance-backend-6wv7.onrender.com/api/transactions/${userId}`,
        ),
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

  const spentPercentage =
    originalBudgetForToday > 0
      ? Math.min(Math.round((spentToday / originalBudgetForToday) * 100), 100)
      : 0;

  // ================= PHÂN NHÓM DANH MỤC =================
  const essentialCats = categories.filter((c) =>
    ["Ăn uống", "Hóa đơn & Dịch vụ", "Nhà cửa", "Di chuyển"].includes(c.name),
  );
  const lifestyleCats = categories.filter((c) =>
    [
      "Giải trí",
      "Mua sắm cá nhân",
      "Giao lưu / Hẹn hò",
      "Hiếu hỉ & Quà tặng",
      "Mua sắm",
    ].includes(c.name),
  );
  const techCats = categories.filter((c) =>
    ["Tiện ích số & Phần mềm", "Thiết bị Công nghệ"].includes(c.name),
  );
  const healthCats = categories.filter((c) =>
    [
      "Sức khỏe / Y tế",
      "Học tập & Phát triển",
      "Bảo hiểm / Tiết kiệm",
    ].includes(c.name),
  );
  const otherCats = categories.filter(
    (c) =>
      ![
        "Ăn uống",
        "Hóa đơn & Dịch vụ",
        "Nhà cửa",
        "Di chuyển",
        "Giải trí",
        "Mua sắm cá nhân",
        "Giao lưu / Hẹn hò",
        "Hiếu hỉ & Quà tặng",
        "Mua sắm",
        "Tiện ích số & Phần mềm",
        "Thiết bị Công nghệ",
        "Sức khỏe / Y tế",
        "Học tập & Phát triển",
        "Bảo hiểm / Tiết kiệm",
      ].includes(c.name),
  );

  const getCategoryIcon = (name) => {
    const icons = {
      "Ăn uống": "🍚",
      "Hóa đơn & Dịch vụ": "🧾",
      "Nhà cửa": "🏠",
      "Di chuyển": "🛵",
      "Giải trí": "🎮",
      "Mua sắm cá nhân": "🛍️",
      "Giao lưu / Hẹn hò": "🍻",
      "Hiếu hỉ & Quà tặng": "🎁",
      "Mua sắm": "🛒",
      "Tiện ích số & Phần mềm": "💻",
      "Thiết bị Công nghệ": "🎧",
      "Sức khỏe / Y tế": "💊",
      "Học tập & Phát triển": "📚",
      "Bảo hiểm / Tiết kiệm": "🛡️",
    };
    return icons[name] || "📌";
  };
  // =======================================================

  const handleEditFundDirectly = async (fundKey, fundTitle) => {
    const currentVal = balances[fundKey];
    const inputVal = prompt(`Nhập số dư mới cho [${fundTitle}]:`, currentVal);
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
        `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
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
      await axios.put(
        `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
        {
          spending,
          savings,
          emergency,
        },
      );
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

      await axios.post(
        "https://finance-backend-6wv7.onrender.com/api/transactions",
        {
          user_id: userId,
          amount: parseFloat(amount),
          category_id: categoryId,
          note,
          transaction_date: localISOString,
          acceptSavings,
          acceptEmergency,
        },
      );

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
    if (confirm("Bạn muốn xóa giao dịch này và hoàn tiền vào quỹ?")) {
      try {
        await axios.delete(
          `https://finance-backend-6wv7.onrender.com/api/transactions/${id}`,
        );
        await loadData();
      } catch (err) {
        alert("Lỗi xóa giao dịch!");
      }
    }
  };

  const handleResetData = async () => {
    const confirmText = prompt(
      'CẢNH BÁO: Hành động này sẽ xóa sạch dữ liệu!\nGõ "XOA" để xác nhận:',
    );
    if (confirmText !== "XOA") return;
    try {
      await axios.delete(
        `https://finance-backend-6wv7.onrender.com/api/reset-data/${userId}`,
      );
      localStorage.setItem("hasSetup", "false");
      window.location.href = "/setup";
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* BACKGROUND MESH GRADIENT */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 md:space-y-8 relative z-10">
        {/* ================= MODAL CHỌN DANH MỤC (THAY THẾ DROP DOWN) ================= */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-all">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="text-xl">🏷️</span> Chọn danh mục chi tiêu
                </h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                {/* Render từng nhóm Danh Mục */}
                {[
                  {
                    title: "1. Nhóm Thiết Yếu",
                    data: essentialCats,
                    color: "text-blue-600",
                    bg: "bg-blue-50 border-blue-100 hover:border-blue-300",
                  },
                  {
                    title: "2. Nhóm Lối Sống",
                    data: lifestyleCats,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
                  },
                  {
                    title: "3. Nhóm Công Nghệ",
                    data: techCats,
                    color: "text-indigo-600",
                    bg: "bg-indigo-50 border-indigo-100 hover:border-indigo-300",
                  },
                  {
                    title: "4. Sức Khỏe & Tương lai",
                    data: healthCats,
                    color: "text-rose-600",
                    bg: "bg-rose-50 border-rose-100 hover:border-rose-300",
                  },
                  {
                    title: "Khác",
                    data: otherCats,
                    color: "text-slate-600",
                    bg: "bg-slate-50 border-slate-200 hover:border-slate-300",
                  },
                ].map(
                  (group, idx) =>
                    group.data.length > 0 && (
                      <div key={idx}>
                        <h4
                          className={`text-xs font-bold uppercase tracking-wider mb-3 ${group.color}`}
                        >
                          {group.title}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {group.data.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryId(cat.id);
                                setShowCategoryModal(false);
                              }}
                              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${group.bg} ${categoryId === cat.id ? "ring-2 ring-blue-500 shadow-md scale-[1.02]" : ""}`}
                            >
                              <span className="text-xl">
                                {getCategoryIcon(cat.name)}
                              </span>
                              <span className="font-semibold text-slate-700 text-sm truncate">
                                {cat.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ),
                )}
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}

        {/* POP-UP CẢNH BÁO HỤT QUỸ (Giữ nguyên) */}
        {showPopup && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity">
            <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] max-w-lg w-full shadow-2xl border border-white/20 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center text-white mb-5 shadow-lg shadow-rose-500/30">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">
                Hụt Quỹ Chi Tiêu
              </h3>
              <p className="text-sm md:text-base text-slate-600 mb-6 px-2 leading-relaxed">
                Giao dịch này vượt quá quỹ chi tiêu. Hệ thống sẽ tự động trích
                xuất:
                {popupData.fromSavings > 0 && (
                  <span className="block font-medium mt-3 text-slate-700 bg-blue-50 py-2 rounded-xl border border-blue-100">
                    Trích{" "}
                    <span className="font-black text-blue-700">
                      {formatMoney(popupData.fromSavings)} đ
                    </span>{" "}
                    từ Quỹ Tiết Kiệm
                  </span>
                )}
                {popupData.fromEmergency > 0 && (
                  <span className="block font-medium mt-2 text-slate-700 bg-rose-50 py-2 rounded-xl border border-rose-100">
                    Trích{" "}
                    <span className="font-black text-rose-700">
                      {formatMoney(popupData.fromEmergency)} đ
                    </span>{" "}
                    từ Quỹ Khẩn Cấp
                  </span>
                )}
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-3.5 rounded-2xl font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => executeTransaction(true, true)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold transition shadow-lg shadow-blue-500/30"
                >
                  Tiếp tục thanh toán
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TẦNG 1: 3 QUỸ THÁC NƯỚC (GIỮ NGUYÊN VÌ ĐÃ ĐẸP) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Quỹ Chi Tiêu */}
          <div className="col-span-1 bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-900 p-5 md:p-7 rounded-[2rem] shadow-xl shadow-blue-900/20 text-white flex flex-col justify-between relative overflow-hidden group">
            <svg
              className="absolute top-0 right-0 w-32 h-32 text-white/5 transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="50" />
            </svg>
            <svg
              className="absolute bottom-0 left-0 w-24 h-24 text-white/5 transform -translate-x-6 translate-y-6"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <polygon points="50,0 100,100 0,100" />
            </svg>
            <div className="relative z-10 flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100">
                  Chi tiêu tháng này
                </h3>
              </div>
              <button
                onClick={() =>
                  handleEditFundDirectly("spending_balance", "Quỹ Chi Tiêu")
                }
                className="text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg backdrop-blur-md transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
            <p className="relative z-10 text-xl sm:text-2xl md:text-4xl font-black mb-5 drop-shadow-md leading-tight">
              {formatMoney(balances.spending_balance)}
              <span className="text-sm md:text-base font-bold text-blue-300 ml-1.5">
                đ
              </span>
            </p>
            <div className="relative z-10 flex gap-2">
              <button
                onClick={() =>
                  handleTransferFund("spending", "savings", "Quỹ Tiết Kiệm")
                }
                className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-[10px] md:text-xs font-bold py-2.5 rounded-xl text-center transition"
              >
                Chuyển tiết kiệm
              </button>
              <button
                onClick={() =>
                  handleTransferFund("spending", "emergency", "Quỹ Dự Phòng")
                }
                className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-[10px] md:text-xs font-bold py-2.5 rounded-xl text-center transition"
              >
                Chuyển dự phòng
              </button>
            </div>
          </div>

          {/* Quỹ Tiết Kiệm */}
          <div className="col-span-1 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 p-5 md:p-7 rounded-[2rem] shadow-xl shadow-emerald-900/20 text-white flex flex-col justify-between relative overflow-hidden group">
            <svg
              className="absolute top-0 right-0 w-40 h-40 text-white/5 transform translate-x-12 -translate-y-4 group-hover:rotate-12 transition-transform duration-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="relative z-10 flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Quỹ Tiết Kiệm
                </h3>
              </div>
              <button
                onClick={() =>
                  handleEditFundDirectly("savings_balance", "Quỹ Tiết Kiệm")
                }
                className="text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg backdrop-blur-md transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
            <p className="relative z-10 text-xl sm:text-2xl md:text-4xl font-black mb-5 drop-shadow-md leading-tight">
              {formatMoney(balances.savings_balance)}
              <span className="text-sm md:text-base font-bold text-emerald-300 ml-1.5">
                đ
              </span>
            </p>
            <div className="relative z-10 flex gap-2">
              <button
                onClick={() =>
                  handleTransferFund("savings", "spending", "Quỹ Chi Tiêu")
                }
                className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-[10px] md:text-xs font-bold py-2.5 rounded-xl text-center transition"
              >
                Rút về chi tiêu
              </button>
              <button
                onClick={() =>
                  handleTransferFund("savings", "emergency", "Quỹ Dự Phòng")
                }
                className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-[10px] md:text-xs font-bold py-2.5 rounded-xl text-center transition"
              >
                Gửi dự phòng
              </button>
            </div>
          </div>

          {/* Quỹ Khẩn Cấp */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-rose-700 via-rose-900 to-black p-5 md:p-7 rounded-[2rem] shadow-xl shadow-rose-900/30 text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50"></div>
            <svg
              className="absolute bottom-0 right-0 w-32 h-32 text-white/5 transform translate-x-8 translate-y-8"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <polygon points="0,100 100,0 100,100" />
            </svg>
            <div className="relative z-10 flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/30 backdrop-blur-md flex items-center justify-center border border-rose-400/30">
                  <svg
                    className="w-4 h-4 text-rose-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                  QUỸ DỰ PHÒNG Khẩn Cấp
                </h3>
              </div>
              <button
                onClick={() =>
                  handleEditFundDirectly("emergency_balance", "Quỹ Khẩn Cấp")
                }
                className="text-rose-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg backdrop-blur-md transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
            <p className="relative z-10 text-xl sm:text-2xl md:text-4xl font-black mb-5 drop-shadow-md leading-tight">
              {formatMoney(balances.emergency_balance)}
              <span className="text-sm md:text-base font-bold text-rose-300 ml-1.5">
                đ
              </span>
            </p>
            <div className="relative z-10 w-full bg-rose-950/50 border border-rose-500/20 text-rose-200 text-[10px] md:text-xs font-bold py-2.5 rounded-xl text-center backdrop-blur-md">
              Chỉ được dùng khi các quỹ khác cạn kiệt🛡️
            </div>
          </div>
        </div>

        {/* TẦNG 2: NGÂN SÁCH ĐỘNG & TỔNG TÀI SẢN (GIỮ NGUYÊN) */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {isOverspent ? (
            <div className="col-span-2 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 p-5 md:p-6 rounded-[2rem] flex flex-col justify-center relative shadow-lg shadow-rose-100/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center animate-pulse">
                  <svg
                    className="w-4 h-4 text-rose-700"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-xs md:text-sm font-bold text-rose-800 uppercase tracking-wide">
                  Đã tiêu lố {formatMoney(overspentAmount)}đ hôm nay
                </span>
              </div>
              <span className="text-sm md:text-lg font-bold text-rose-900">
                Hạn mức ép buộc từ mai:{" "}
                <span className="text-2xl md:text-4xl font-black block mt-1 text-rose-950">
                  {formatMoney(strictBudgetTomorrow)} đ / ngày
                </span>
              </span>
              <div className="mt-5 w-full bg-rose-200/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-full rounded-full w-full"></div>
              </div>
            </div>
          ) : (
            <div className="col-span-1 bg-white/70 backdrop-blur-xl border border-white/50 p-5 md:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="text-xs md:text-sm font-bold text-teal-800 uppercase tracking-wide">
                  Gợi ý tiêu hôm nay
                </span>
              </div>
              <span className="text-2xl md:text-4xl font-black text-slate-900 truncate">
                {formatMoney(remainingBudgetToday)}{" "}
                <span className="text-lg md:text-2xl text-slate-400">đ</span>
              </span>
              <div className="mt-4 w-full bg-slate-200/60 rounded-full h-2 overflow-hidden flex shadow-inner">
                <div
                  className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${spentPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2 text-[10px] md:text-xs font-semibold text-slate-500">
                <span>Đã tiêu {spentPercentage}%</span>
                <span>Gốc: {formatMoney(originalBudgetForToday)}đ</span>
              </div>
            </div>
          )}

          <div
            className={`col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl shadow-slate-900/30 flex flex-col justify-between text-white relative overflow-hidden ${isOverspent ? "col-span-2" : ""}`}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            <div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                </div>
                <span className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wide">
                  Tổng Tài Sản
                </span>
              </div>
              <span className="text-2xl md:text-4xl font-black truncate relative z-10 drop-shadow-md">
                {formatMoney(totalAssets)}{" "}
                <span className="text-lg md:text-2xl text-slate-400">đ</span>
              </span>
            </div>
            <button
              onClick={handleResetData}
              className="relative z-10 w-full bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-bold text-[10px] md:text-sm py-3 rounded-xl mt-4 backdrop-blur-md transition flex items-center justify-center gap-2 border border-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Xóa Dữ Liệu
            </button>
          </div>
        </div>

        {/* TẦNG 3: FORM & LỊCH SỬ (ĐÃ LÀM LẠI HOÀN TOÀN) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* ================= FORM THÊM GIAO DỊCH (LÀM LẠI) ================= */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-1 relative overflow-hidden">
            <h2 className="text-base md:text-lg font-black text-slate-900 mb-6 flex items-center gap-3 relative z-10">
              {/* Đã thay biểu tượng dấu + thành biểu tượng Ví tiền tinh tế */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              Thêm Giao Dịch
            </h2>

            <form
              onSubmit={handlePreAddTransaction}
              className="space-y-5 relative z-10"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Số tiền (VNĐ)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₫
                  </span>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 pl-9 pr-4 py-3.5 rounded-2xl font-black text-slate-900 text-base outline-none transition-all"
                    placeholder="0"
                    value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
              </div>

              {/* Box Chọn Danh Mục thay cho thẻ Select cũ */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Danh mục
                </label>
                <div
                  onClick={() => setShowCategoryModal(true)}
                  className="w-full bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 px-4 py-3.5 rounded-2xl font-bold text-slate-700 text-sm cursor-pointer flex justify-between items-center transition-all group"
                >
                  <span className="flex items-center gap-2">
                    {categoryId ? (
                      <>
                        <span className="text-lg">
                          {getCategoryIcon(
                            categories.find((c) => c.id == categoryId)?.name,
                          )}
                        </span>
                        {categories.find((c) => c.id == categoryId)?.name}
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal">
                        Chọn danh mục...
                      </span>
                    )}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 px-4 py-3.5 rounded-2xl font-medium text-slate-700 text-sm outline-none transition-all"
                  placeholder="Tùy chọn nhập ghi chú..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-4 rounded-2xl mt-2 transition-all duration-300 shadow-[0_8px_20px_rgb(0,0,0,0.12)] hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                Ghi Sổ
              </button>
            </form>
          </div>

          {/* ================= BẢNG LỊCH SỬ (LÀM LẠI CLEAN VÀ MINIMAL) ================= */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col relative">
            <h2 className="text-base md:text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              Lịch Sử Giao Dịch
            </h2>

            <div className="overflow-x-auto flex-1 custom-scrollbar -mx-2 px-2">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-4 pr-4 pl-2 font-semibold">Thời gian</th>
                    <th className="pb-4 pr-4 font-semibold">Danh mục</th>
                    <th className="pb-4 pr-4 hidden md:table-cell font-semibold">
                      Ghi chú
                    </th>
                    <th className="pb-4 pr-4 text-right font-semibold">
                      Số tiền
                    </th>
                    <th className="pb-4 text-center font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center opacity-70">
                          <span className="text-4xl mb-3">📭</span>
                          <p className="text-slate-800 font-bold text-base">
                            Chưa có giao dịch
                          </p>
                          <p className="text-slate-400 text-sm mt-1">
                            Sổ chi tiêu của bạn đang trống.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="py-4 md:py-4 pr-4 pl-2 text-slate-500 font-medium">
                          {new Date(t.transaction_date).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="py-4 md:py-4 pr-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                            <span>{getCategoryIcon(t.category_name)}</span>{" "}
                            {t.category_name}
                          </span>
                        </td>
                        <td className="py-4 md:py-4 pr-4 text-slate-500 hidden md:table-cell truncate max-w-[150px] font-medium">
                          {t.note || (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="py-4 md:py-4 pr-4 text-right font-black text-rose-600 text-base">
                          -{formatMoney(t.amount)}
                        </td>
                        <td className="py-4 md:py-4 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-slate-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Xóa & Hoàn tiền"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
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
    </div>
  );
}
