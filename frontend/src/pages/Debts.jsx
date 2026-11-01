import { useState, useEffect } from "react";
import axios from "axios";

export default function Debts() {
  const userId = localStorage.getItem("userId");
  const [tab, setTab] = useState("owed-to-me");
  const [debts, setDebts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    person_name: "",
    amount: "",
    borrowed_date: "",
    due_date: "",
  });

  const [activeAlertIndex, setActiveAlertIndex] = useState(0);

  const loadDebts = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/debts/${userId}`);
      // Lọc lại chỉ lấy các khoản "Chưa trả" để hiển thị trên bảng và banner
      setDebts(res.data.filter((d) => d.status === "Chưa trả"));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDebts();
  }, [userId]);

  const formatMoney = (val) => Number(val || 0).toLocaleString("vi-VN");

  const getRemainingDays = (dueDate) => {
    const diff = new Date(dueDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const alertDebts = debts; // Tất cả debts trong state lúc này đều là "Chưa trả"

  useEffect(() => {
    if (alertDebts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveAlertIndex((prev) => (prev + 1) % alertDebts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [alertDebts.length]);

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (new Date(form.due_date) < new Date(form.borrowed_date)) {
      return alert("Lỗi: Ngày trả nợ không thể nhỏ hơn ngày mượn tiền!");
    }

    const lender_or_borrower = tab === "i-owe" ? "Nợ người ta" : "Người ta nợ";
    setIsProcessing(true);

    try {
      await axios.post("http://localhost:5000/api/debts", {
        user_id: userId,
        ...form,
        amount: parseFloat(form.amount),
        lender_or_borrower,
      });
      setShowModal(false);
      setForm({ person_name: "", amount: "", borrowed_date: "", due_date: "" });
      loadDebts();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi khi thêm khoản nợ!");
    } finally {
      setIsProcessing(false);
    }
  };

  // KHI BẤM XÁC NHẬN ĐÃ TRẢ -> TIỀN TỰ SYNC VÀO QUỸ VÀ BẢN GHI BIẾN MẤT LUÔN
  const handleMarkAsPaid = async (d) => {
    const msg =
      d.lender_or_borrower === "Người ta nợ"
        ? `Xác nhận ${d.person_name} đã trả tiền (${formatMoney(d.amount)}đ)?\n\n(Hệ thống sẽ tự động CỘNG tiền vào Quỹ Tiết Kiệm và xóa khoản này khỏi sổ).`
        : `Xác nhận bạn đã trả tiền cho ${d.person_name} (${formatMoney(d.amount)}đ)?\n\n(Hệ thống sẽ tự động TRỪ tiền khỏi Quỹ Tiết Kiệm và xóa khoản này khỏi sổ).`;

    if (!confirm(msg)) return;

    try {
      // 1. Cập nhật trạng thái thành "Đã trả" để Backend tự động tính toán dòng tiền vào Quỹ Tiết Kiệm
      await axios.put(`http://localhost:5000/api/debts/${d.id}/status`, {
        status: "Đã trả",
        user_id: userId,
      });

      // 2. Xóa luôn bản ghi khỏi cơ sở dữ liệu để nó biến mất khỏi giao diện
      await axios.delete(`http://localhost:5000/api/debts/${d.id}`);

      // 3. Tải lại danh sách
      loadDebts();
    } catch (err) {
      alert(err.response?.data?.error || "Lỗi khi xử lý thanh toán!");
    }
  };

  const filteredDebts = debts.filter((d) =>
    tab === "i-owe"
      ? d.lender_or_borrower === "Nợ người ta"
      : d.lender_or_borrower === "Người ta nợ",
  );

  const currentAlertDebt = alertDebts[activeAlertIndex] || alertDebts[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* BANNER NHẮC NHỞ LUÔN HIỆN CÁC KHOẢN CHƯA TRẢ */}
      {currentAlertDebt && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 md:p-5 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between shadow-sm transition-all duration-500 gap-3">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <span className="text-xl">🔔</span>
            </div>
            <p className="text-sm font-bold text-amber-900 truncate">
              {currentAlertDebt.lender_or_borrower === "Nợ người ta"
                ? "⚠️ Khoản nợ cần thanh toán: "
                : "📌 Khoản đang cho mượn: "}
              <br className="md:hidden" />
              {currentAlertDebt.lender_or_borrower === "Nợ người ta"
                ? "Trả "
                : "Thu hồi "}
              <span className="text-rose-600 font-black">
                {formatMoney(currentAlertDebt.amount)}đ
              </span>{" "}
              từ/cho{" "}
              <span className="underline">{currentAlertDebt.person_name}</span>.
              <span className="block mt-1 text-xs text-amber-700">
                Hạn chót: {currentAlertDebt.due_date} —
                {getRemainingDays(currentAlertDebt.due_date) < 0 ? (
                  <span className="text-rose-600 font-black ml-1">
                    ĐÃ QUÁ HẠN{" "}
                    {Math.abs(getRemainingDays(currentAlertDebt.due_date))} NGÀY
                  </span>
                ) : (
                  <span className="font-bold ml-1">
                    Còn {getRemainingDays(currentAlertDebt.due_date)} ngày
                  </span>
                )}
              </span>
            </p>
          </div>
          {alertDebts.length > 1 && (
            <div className="text-[10px] font-black bg-amber-200 text-amber-800 px-3 py-1.5 rounded-full whitespace-nowrap self-start md:self-auto">
              Nhắc nhở {activeAlertIndex + 1}/{alertDebts.length} khoản
            </div>
          )}
        </div>
      )}

      {/* HEADER QUẢN LÝ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">
              Quản Lý Sổ Nợ
            </h1>
            <p className="text-sm text-slate-500">
              Tự động đồng bộ nguồn tiền với Quỹ Tiết Kiệm
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-4 md:py-3.5 rounded-2xl transition shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ghi sổ nợ mới
        </button>
      </div>

      {/* TABS CHUYỂN ĐỔI */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl md:w-fit">
        <button
          onClick={() => setTab("owed-to-me")}
          className={`flex-1 md:flex-none px-6 py-3 font-bold rounded-xl transition text-sm ${tab === "owed-to-me" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Tôi cho mượn tiền
        </button>
        <button
          onClick={() => setTab("i-owe")}
          className={`flex-1 md:flex-none px-6 py-3 font-bold rounded-xl transition text-sm ${tab === "i-owe" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Tôi đi mượn tiền
        </button>
      </div>

      {/* MODAL THÊM KHOẢN NỢ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-white">
            <h3
              className={`text-lg font-black mb-1 flex items-center gap-2 ${tab === "i-owe" ? "text-rose-600" : "text-emerald-600"}`}
            >
              {tab === "i-owe"
                ? "📉 Vay Tiền Người Khác"
                : "📈 Cho Người Khác Mượn"}
            </h3>

            <p className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-5">
              {tab === "i-owe"
                ? "Tiền mượn được sẽ CỘNG TRỰC TIẾP vào Quỹ Tiết Kiệm ngay lúc này."
                : "Hệ thống sẽ TRỪ TIỀN TRỰC TIẾP từ Quỹ Tiết Kiệm để đem cho mượn."}
            </p>

            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                  Tên người {tab === "i-owe" ? "cho bạn mượn" : "mượn tiền"}
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 p-3.5 rounded-xl outline-none font-bold text-sm transition"
                  placeholder="VD: Anh Tùng..."
                  value={form.person_name}
                  onChange={(e) =>
                    setForm({ ...form, person_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                  Số tiền (VNĐ)
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 p-3.5 rounded-xl outline-none font-black text-slate-900 text-base transition"
                  placeholder="0"
                  value={
                    form.amount
                      ? Number(form.amount).toLocaleString("vi-VN")
                      : ""
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                    Ngày giao dịch
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 transition"
                    value={form.borrowed_date}
                    onChange={(e) =>
                      setForm({ ...form, borrowed_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
                    Hạn trả chót
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 transition"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm({ ...form, due_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 text-white py-3.5 rounded-xl font-bold transition shadow-lg ${isProcessing ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"}`}
                >
                  {isProcessing ? "Đang xử lý..." : "Lưu Khoản Nợ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BẢNG LỊCH SỬ NỢ (XÁC NHẬN TRẢ XONG LÀ BIẾN MẤT KHỎI BẢNG) */}
      <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar -mx-2 px-2">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-full">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-4 pr-4 pl-2">Đối tác</th>
                <th className="pb-4 pr-4">Số tiền</th>
                <th className="pb-4 pr-4 hidden md:table-cell">Lập phiếu</th>
                <th className="pb-4 pr-4">Hạn chót</th>
                <th className="pb-4 pr-4">Tình trạng</th>
                <th className="pb-4 text-center">Thao tác thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center opacity-80">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <svg
                          className="w-10 h-10 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-slate-800 font-bold text-base">
                        Sổ nợ đang trống
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        Tuyệt vời! Không có khoản nợ nào cần lưu ý lúc này.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDebts.map((d) => {
                  const daysLeft = getRemainingDays(d.due_date);
                  const isOverdue = daysLeft < 0;

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 md:py-5 pr-4 pl-2 font-bold text-slate-800 text-base">
                        {d.person_name}
                      </td>
                      <td
                        className={`py-4 md:py-5 pr-4 font-black text-base ${tab === "i-owe" ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {formatMoney(d.amount)} đ
                      </td>
                      <td className="py-4 md:py-5 pr-4 text-slate-500 hidden md:table-cell font-medium">
                        {d.borrowed_date || "—"}
                      </td>
                      <td className="py-4 md:py-5 pr-4">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-bold">
                            {d.due_date}
                          </span>
                          <span
                            className={`text-[10px] font-black mt-0.5 ${isOverdue ? "text-rose-600" : "text-slate-400"}`}
                          >
                            {isOverdue
                              ? `(QUÁ HẠN ${Math.abs(daysLeft)} NGÀY)`
                              : `(Còn ${daysLeft} ngày)`}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 md:py-5 pr-4">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {isOverdue ? "Quá hạn" : "Chưa trả"}
                        </span>
                      </td>
                      <td className="py-4 md:py-5 text-center">
                        <div className="flex items-center justify-center">
                          {/* NÚT XÁC NHẬN ĐÃ TRẢ: Bấm vào là sync quỹ và biến mất khỏi bảng */}
                          <button
                            onClick={() => handleMarkAsPaid(d)}
                            className="text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm border bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 border-transparent hover:brightness-110 flex items-center gap-2"
                          >
                            ✅ Xác nhận đã trả (Tất toán)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
