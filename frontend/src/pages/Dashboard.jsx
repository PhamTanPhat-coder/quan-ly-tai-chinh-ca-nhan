import { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {
  const userId = localStorage.getItem("userId");
  const fullName = localStorage.getItem("fullName") || "Bạn";

  const [balances, setBalances] = useState({
    spending_balance: 0,
    savings_balance: 0,
    emergency_balance: 0,
  });
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  // Pop-up Thác nước
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

  // Hàm load dữ liệu từ API và cập nhật State trực tiếp
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

  // 1. SỬA SỐ TIỀN QUỸ TRỰC TIẾP (Đã fix async/await để update state lập tức)
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

      // Cập nhật State ngay lập tức từ response của server hoặc gán trực tiếp
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
      alert("Cập nhật số tiền quỹ thành công!");
    } catch (err) {
      alert("Lỗi cập nhật: " + (err.response?.data?.error || err.message));
    }
  };

  // 2. CHUYỂN QUỸ LINH HOẠT
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
      alert("Chuyển quỹ thành công!");
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
      let takeSavings = 0;
      let takeEmergency = 0;

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

  // 3. THÊM GIAO DỊCH (Đã thêm await để load lại dữ liệu ngay lập tức)
  const executeTransaction = async (
    acceptSavings = false,
    acceptEmergency = false,
  ) => {
    try {
      // Sửa đoạn lấy ngày giờ theo giờ địa phương Việt Nam
      const now = new Date();
      const localISOString = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000,
      ).toISOString();

      const res = await axios.post("http://localhost:5000/api/transactions", {
        user_id: userId,
        amount: parseFloat(amount),
        category_id: categoryId,
        note,
        transaction_date: localISOString, // Sử dụng chuỗi thời gian chuẩn địa phương
        acceptSavings,
        acceptEmergency,
      });

      setAmount("");
      setNote("");
      setShowPopup(false);
      await loadData();
    } catch (err) {
      const errorData = err.response?.data;

      // Bắt chính xác mã code do controllers.js trả về khi hụt quỹ
      if (
        errorData?.code === "NEED_SAVINGS" ||
        errorData?.code === "NEED_EMERGENCY"
      ) {
        const deficit =
          errorData.shortfall || parseFloat(amount) - balances.spending_balance;
        let takeSavings = 0;
        let takeEmergency = 0;

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
        setShowPopup(true); // Kích hoạt Pop-up thác nước hiện ra
      } else {
        alert(
          "Lỗi thêm giao dịch: " +
            (errorData?.error || errorData?.message || err.message),
        );
      }
    }
  };

  // 4. XÓA GIAO DỊCH (Đã thêm await để hoàn tiền và load lại state lập tức)
  const handleDeleteTransaction = async (id) => {
    if (confirm("Xóa giao dịch này và hoàn tiền vào quỹ chi tiêu?")) {
      try {
        await axios.delete(`http://localhost:5000/api/transactions/${id}`);
        await loadData(); // Ép load lại số dư và lịch sử ngay lập tức
      } catch (err) {
        alert("Lỗi khi xóa giao dịch!");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      {/* POP-UP THÁC NƯỚC */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl border">
            <h3 className="text-xl font-black text-rose-600">
              ⚠️ Cảnh Báo Hụt Quỹ Chi Tiêu
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Số tiền chi tiêu tháng này không đủ để thanh toán. Hệ thống sẽ tự
              động trích xuất:
              {popupData.fromSavings > 0 && (
                <span className="block font-bold mt-1">
                  🔹 Lấy{" "}
                  <span className="text-blue-600">
                    {formatMoney(popupData.fromSavings)} đ
                  </span>{" "}
                  từ Quỹ Tiết Kiệm
                </span>
              )}
              {popupData.fromEmergency > 0 && (
                <span className="block font-bold mt-1 text-rose-600">
                  🔸 Lấy {formatMoney(popupData.fromEmergency)} đ từ Quỹ Dự
                  Phòng Khẩn Cấp
                </span>
              )}
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => executeTransaction(true, true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition"
              >
                Đồng ý thanh toán
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-bold transition"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Chào, {fullName}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hệ thống quản lý tài chính thông minh theo quy tắc thác nước.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-2xl text-right">
          <span className="text-xs font-bold text-blue-600 block uppercase">
            TỔNG TÀI SẢN HIỆN TẠI
          </span>
          <span className="text-xl font-black text-blue-900">
            {formatMoney(totalAssets)} VNĐ
          </span>
        </div>
      </div>

      {/* 3 QUỸ THÁC NƯỚC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quỹ Chi Tiêu */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-l-blue-500 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-blue-600">
              💰 Chi Tiêu Tháng Này
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("spending_balance", "Quỹ Chi Tiêu")
              }
              className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-100"
            >
              ✏️ Sửa số tiền
            </button>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {formatMoney(balances.spending_balance)}{" "}
            <span className="text-sm font-bold text-slate-400">đ</span>
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() =>
                handleTransferFund("spending", "savings", "Quỹ Tiết Kiệm")
              }
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2 rounded-xl transition"
            >
              Gửi tiết kiệm
            </button>
            <button
              onClick={() =>
                handleTransferFund("spending", "emergency", "Quỹ Dự Phòng")
              }
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2 rounded-xl transition"
            >
              Gửi dự phòng
            </button>
          </div>
        </div>

        {/* Quỹ Tiết Kiệm */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-l-emerald-500 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-emerald-600">
              🏦 Quỹ Tiết Kiệm
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("savings_balance", "Quỹ Tiết Kiệm")
              }
              className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-100"
            >
              ✏️ Sửa số tiền
            </button>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {formatMoney(balances.savings_balance)}{" "}
            <span className="text-sm font-bold text-slate-400">đ</span>
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() =>
                handleTransferFund("savings", "spending", "Quỹ Chi Tiêu")
              }
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2 rounded-xl transition"
            >
              Rút về chi tiêu
            </button>
            <button
              onClick={() =>
                handleTransferFund("savings", "emergency", "Quỹ Dự Phòng")
              }
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2 rounded-xl transition"
            >
              Gửi dự phòng
            </button>
          </div>
        </div>

        {/* Quỹ Khẩn Cấp */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-l-rose-500 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-rose-600">
              🚑 Quỹ Dự Phòng Khẩn Cấp
            </h3>
            <button
              onClick={() =>
                handleEditFundDirectly("emergency_balance", "Quỹ Khẩn Cấp")
              }
              className="text-xs bg-rose-50 text-rose-600 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-100"
            >
              ✏️ Sửa số tiền
            </button>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {formatMoney(balances.emergency_balance)}{" "}
            <span className="text-sm font-bold text-slate-400">đ</span>
          </p>
          <div className="w-full bg-rose-50 text-rose-600 text-xs font-bold py-2.5 text-center rounded-xl mt-2">
            Bảo vệ tuyệt đối 🛡️
          </div>
        </div>
      </div>

      {/* FORM THÊM GIAO DỊCH & LỊCH SỬ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border lg:col-span-1">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            ✍️ Thêm Giao Dịch Mới
          </h2>
          <form onSubmit={handlePreAddTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Số tiền (VNĐ)
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border p-3 rounded-xl font-bold text-slate-800 outline-none"
                placeholder="VD: 100.000"
                value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Danh mục
              </label>
              <select
                className="w-full bg-slate-50 border p-3 rounded-xl font-semibold text-slate-800 outline-none"
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
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border p-3 rounded-xl outline-none"
                placeholder="VD: Mua giày..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition"
            >
              (+) Thêm Giao Dịch
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border lg:col-span-2">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            📜 Lịch Sử Giao Dịch Gần Nhất
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs font-bold text-slate-400 uppercase">
                  <th className="pb-3">Thời gian</th>
                  <th className="pb-3">Danh mục</th>
                  <th className="pb-3">Ghi chú</th>
                  <th className="pb-3 text-right">Số tiền</th>
                  <th className="pb-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Chưa có giao dịch nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-4 text-slate-500">
                        {new Date(t.transaction_date).toLocaleDateString(
                          "vi-VN",
                        )}
                      </td>
                      <td className="py-4 font-bold text-slate-800">
                        {t.category_name}
                      </td>
                      <td className="py-4 text-slate-600">
                        {t.note || "Không có ghi chú"}
                      </td>
                      <td className="py-4 text-right font-black text-rose-600">
                        -{formatMoney(t.amount)} đ
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-xs bg-rose-50 text-rose-600 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-100"
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
// node server.js
// npm run dev
