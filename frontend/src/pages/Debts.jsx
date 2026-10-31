import { useState, useEffect } from "react";
import axios from "axios";

export default function Debts() {
  const userId = localStorage.getItem("userId");
  const [tab, setTab] = useState("i-owe");
  const [debts, setDebts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    person_name: "",
    amount: "",
    borrowed_date: "",
    due_date: "",
  });

  // State quản lý việc trượt hiển thị thông báo nợ luân phiên
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);

  const loadDebts = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/debts/${userId}`);
      setDebts(res.data);
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

  // Lọc ra tất cả các khoản nợ chưa trả và còn hạn (hoặc quá hạn) để làm banner trượt thông báo
  const alertDebts = debts.filter(
    (d) => d.status === "Chưa trả" && getRemainingDays(d.due_date) >= 0,
  );

  // Hiệu ứng trượt luân phiên thông báo sau mỗi 4 giây
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

    // Tự động gán loại nợ dựa vào tab đang đứng (bỏ dropdown)
    const lender_or_borrower = tab === "i-owe" ? "Nợ người ta" : "Người ta nợ";

    try {
      await axios.post("http://localhost:5000/api/debts", {
        user_id: userId,
        ...form,
        amount: parseFloat(form.amount),
        lender_or_borrower,
      });
      setShowModal(false);
      setForm({
        person_name: "",
        amount: "",
        borrowed_date: "",
        due_date: "",
      });
      loadDebts();
    } catch (err) {
      alert("Lỗi khi thêm khoản nợ!");
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Đã trả" ? "Chưa trả" : "Đã trả";
    await axios.put(`http://localhost:5000/api/debts/${id}/status`, {
      status: newStatus,
    });
    loadDebts();
  };

  const deleteDebt = async (id) => {
    if (confirm("Xóa khoản nợ này?")) {
      await axios.delete(`http://localhost:5000/api/debts/${id}`);
      loadDebts();
    }
  };

  const filteredDebts = debts.filter((d) =>
    tab === "i-owe"
      ? d.lender_or_borrower === "Nợ người ta"
      : d.lender_or_borrower === "Người ta nợ",
  );

  const currentAlertDebt = alertDebts[activeAlertIndex] || alertDebts[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* BANNER THÔNG BÁO TRƯỞT LUÂN PHIÊN (SLIDER TICKER) */}
      {currentAlertDebt && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all duration-500">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-xl animate-bounce">🔔</span>
            <p className="text-sm font-bold text-amber-900 truncate">
              {currentAlertDebt.lender_or_borrower === "Nợ người ta"
                ? "⚠️ Sắp đến hạn trả:"
                : "📌 Sắp thu hồi:"}{" "}
              Còn{" "}
              <span className="text-rose-600 font-black">
                {getRemainingDays(currentAlertDebt.due_date)} ngày
              </span>{" "}
              nữa{" "}
              {currentAlertDebt.lender_or_borrower === "Nợ người ta"
                ? "phải trả"
                : "phải nhận"}{" "}
              <span className="font-black">
                {formatMoney(currentAlertDebt.amount)} đ
              </span>{" "}
              {currentAlertDebt.lender_or_borrower === "Nợ người ta"
                ? "cho"
                : "từ"}{" "}
              <span className="underline">{currentAlertDebt.person_name}</span>!
            </p>
          </div>
          {alertDebts.length > 1 && (
            <span className="text-xs font-bold bg-amber-200/60 text-amber-800 px-2.5 py-1 rounded-full whitespace-nowrap ml-2">
              {activeAlertIndex + 1} / {alertDebts.length}
            </span>
          )}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            📒 Quản Lý Sổ Nợ Cá Nhân
          </h1>
          <p className="text-sm text-slate-500">
            Theo dõi lịch sử vay mượn và đếm ngược thời gian trả nợ.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition shadow-md"
        >
          + Thêm Khoản Nợ Mới
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setTab("i-owe")}
          className={`px-6 py-3 font-bold rounded-2xl transition ${tab === "i-owe" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border"}`}
        >
          Tôi Nợ Người Ta
        </button>
        <button
          onClick={() => setTab("owed-to-me")}
          className={`px-6 py-3 font-bold rounded-2xl transition ${tab === "owed-to-me" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border"}`}
        >
          Người Ta Nợ Tôi
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black">
              {tab === "i-owe"
                ? "Thêm Khoản Nợ (Tôi Nợ Người Ta)"
                : "Thêm Khoản Nợ (Người Ta Nợ Tôi)"}
            </h3>
            <form onSubmit={handleAddDebt} className="space-y-3">
              <input
                type="text"
                placeholder="Tên đối tượng (VD: Anh Sơn)"
                required
                className="w-full border p-3 rounded-xl outline-none"
                value={form.person_name}
                onChange={(e) =>
                  setForm({ ...form, person_name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Số tiền (VNĐ) - VD: 100.000"
                required
                className="w-full border p-3 rounded-xl outline-none font-bold"
                value={
                  form.amount ? Number(form.amount).toLocaleString("vi-VN") : ""
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Ngày mượn:
                </label>
                <input
                  type="date"
                  required
                  className="w-full border p-3 rounded-xl outline-none"
                  value={form.borrowed_date}
                  onChange={(e) =>
                    setForm({ ...form, borrowed_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Ngày trả (Hạn chót):
                </label>
                <input
                  type="date"
                  required
                  className="w-full border p-3 rounded-xl outline-none"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-200 py-3 rounded-xl font-bold"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-sm border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-xs font-bold text-slate-400 uppercase">
              <th className="pb-3">Đối tượng</th>
              <th className="pb-3">Số tiền</th>
              <th className="pb-3">Ngày mượn</th>
              <th className="pb-3">Hạn trả</th>
              <th className="pb-3">Trạng thái</th>
              <th className="pb-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400">
                  Chưa có khoản nợ nào trong danh mục này.
                </td>
              </tr>
            ) : (
              filteredDebts.map((d) => {
                const daysLeft = getRemainingDays(d.due_date);
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-4 font-bold text-slate-800">
                      {d.person_name}
                    </td>
                    <td className="py-4 font-black text-slate-900">
                      {formatMoney(d.amount)} đ
                    </td>
                    <td className="py-4 text-slate-600">
                      {d.borrowed_date || "N/A"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {d.due_date}{" "}
                      <span className="text-xs text-rose-500 font-bold">
                        ({daysLeft >= 0 ? `Còn ${daysLeft} ngày` : "Quá hạn"})
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${d.status === "Đã trả" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button
                        onClick={() => toggleStatus(d.id, d.status)}
                        className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg"
                      >
                        {d.status === "Đã trả" ? "Hoàn tác" : "Đã trả"}
                      </button>
                      <button
                        onClick={() => deleteDebt(d.id)}
                        className="text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1.5 rounded-lg"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
