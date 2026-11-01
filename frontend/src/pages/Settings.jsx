import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Settings() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");

  const handleResetData = async () => {
    if (confirmText !== "XOA") {
      return alert(
        'Vui lòng gõ chính xác chữ "XOA" để xác nhận reset toàn bộ dữ liệu!',
      );
    }

    try {
      await axios.delete(`http://localhost:5000/api/reset-data/${userId}`);
      alert("Đã reset toàn bộ dữ liệu hệ thống về 0 thành công.");
      localStorage.setItem("hasSetup", "false");
      // Ép trình duyệt tải lại toàn bộ trang web để dọn sạch state cũ, chuyển hướng về setup
      window.location.href = "/setup";
    } catch (err) {
      alert("Lỗi khi xóa dữ liệu: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-6">
        <h1 className="text-2xl font-black text-slate-900">
          ⚙️ Cài Đặt Hệ Thống & Tài Khoản
        </h1>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-bold text-rose-600">
            Vùng Nguy Hiểm (Xóa Toàn Bộ Dữ Liệu)
          </h3>
          <p className="text-sm text-slate-500">
            Hành động này sẽ xóa sạch lịch sử thu/chi, công nợ và đưa số dư các
            quỹ về 0. Gõ chữ <strong>XOA</strong> để kích hoạt:
          </p>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Gõ XOA vào đây"
              className="border p-3 rounded-xl outline-none font-bold"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <button
              onClick={handleResetData}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-3 rounded-xl transition"
            >
              Xóa Toàn Bộ Dữ Liệu
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleLogout}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Đăng Xuất Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
}
