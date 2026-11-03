import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Settings() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();

  const [confirmText, setConfirmText] = useState("");

  // State Thông tin cá nhân (Email)
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState({ type: "", message: "" });

  // State Các Quỹ
  const [funds, setFunds] = useState({ spending: 0, savings: 0, emergency: 0 });
  const [fundStatus, setFundStatus] = useState({ type: "", message: "" });

  // State Đổi mật khẩu
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Load dữ liệu khi vào trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, balRes] = await Promise.all([
          axios.get(
            `https://finance-backend-6wv7.onrender.com/api/user/${userId}`,
          ),
          axios.get(
            `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
          ),
        ]);
        setEmail(userRes.data.email || "");
        setFunds({
          spending: balRes.data.spending_balance || 0,
          savings: balRes.data.savings_balance || 0,
          emergency: balRes.data.emergency_balance || 0,
        });
      } catch (err) {
        console.error("Lỗi tải dữ liệu cài đặt", err);
      }
    };
    fetchData();
  }, [userId]);

  // 1. Hàm Đổi Email
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailStatus({ type: "", message: "" });
    try {
      const res = await axios.put(
        "https://finance-backend-6wv7.onrender.com/api/change-email",
        {
          userId,
          newEmail: email,
        },
      );
      setEmailStatus({ type: "success", message: res.data.message });
    } catch (err) {
      setEmailStatus({
        type: "error",
        message: err.response?.data?.error || "Lỗi cập nhật Email!",
      });
    }
  };

  // 2. Hàm Cập nhật các quỹ
  const handleUpdateFunds = async (e) => {
    e.preventDefault();
    setFundStatus({ type: "", message: "" });
    try {
      await axios.put(
        `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
        {
          spending: funds.spending,
          savings: funds.savings,
          emergency: funds.emergency,
        },
      );
      setFundStatus({
        type: "success",
        message: "Đã cập nhật lại số dư các quỹ thành công!",
      });
    } catch (err) {
      setFundStatus({
        type: "error",
        message: err.response?.data?.error || "Lỗi cập nhật Quỹ!",
      });
    }
  };

  // 3. Hàm Đổi Mật Khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassStatus({ type: "", message: "" });

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setPassStatus({
        type: "error",
        message: "Mật khẩu mới không khớp nhau!",
      });
    }
    if (passwords.newPassword.length < 8) {
      return setPassStatus({
        type: "error",
        message: "Mật khẩu mới phải dài ít nhất 8 ký tự!",
      });
    }

    setIsChangingPass(true);
    try {
      const res = await axios.post(
        "https://finance-backend-6wv7.onrender.com/api/change-password",
        {
          userId,
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword,
        },
      );
      setPassStatus({ type: "success", message: res.data.message });
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPassStatus({
        type: "error",
        message: err.response?.data?.error || "Lỗi đổi mật khẩu!",
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  // 4. Xóa dữ liệu & Đăng xuất
  const handleResetData = async () => {
    if (confirmText !== "XOA")
      return alert('Gõ chính xác "XOA" để xóa dữ liệu!');
    try {
      await axios.delete(
        `https://finance-backend-6wv7.onrender.com/api/reset-data/${userId}`,
      );
      alert("Đã reset toàn bộ dữ liệu hệ thống về 0 thành công.");
      localStorage.setItem("hasSetup", "false");
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Tiêu đề trang */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Trung Tâm Cài Đặt
          </h1>
          <p className="text-sm text-slate-500">
            Quản lý tài khoản, mật khẩu và cấu hình quỹ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* CỘT TRÁI */}
        <div className="space-y-6 md:space-y-8">
          {/* Đổi Email */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4 relative z-10">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Tài Khoản & Email
            </h3>
            {emailStatus.message && (
              <div
                className={`p-3 rounded-xl text-xs font-bold mb-4 relative z-10 ${emailStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {emailStatus.message}
              </div>
            )}
            <form
              onSubmit={handleUpdateEmail}
              className="space-y-4 relative z-10"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                  Địa chỉ Email nhận thư khôi phục
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 p-3.5 rounded-2xl outline-none text-sm font-medium focus:border-blue-500 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3.5 rounded-2xl transition border border-blue-100 hover:border-blue-600"
              >
                Lưu Địa Chỉ Email
              </button>
            </form>
          </div>

          {/* Đổi Mật Khẩu */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-indigo-500"
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
              Đổi Mật Khẩu
            </h3>
            {passStatus.message && (
              <div
                className={`p-3 rounded-xl text-xs font-bold mb-4 ${passStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {passStatus.message}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                  Mật khẩu cũ
                </label>
                <input
                  type="password"
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 p-3.5 rounded-2xl outline-none text-sm tracking-widest focus:border-indigo-500 transition"
                  value={passwords.oldPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, oldPassword: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 p-3.5 rounded-2xl outline-none text-sm tracking-widest focus:border-indigo-500 transition"
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 ml-1">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 p-3.5 rounded-2xl outline-none text-sm tracking-widest focus:border-indigo-500 transition"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={isChangingPass}
                className={`w-full text-white font-bold py-3.5 rounded-2xl transition shadow-md ${isChangingPass ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"}`}
              >
                {isChangingPass ? "Đang xử lý..." : "Cập Nhật Mật Khẩu"}
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-6 md:space-y-8">
          {/* Cập nhật các Quỹ bằng Form */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-6 md:p-8 rounded-[2rem] shadow-sm border border-emerald-100">
            <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Thiết Lập Lại Các Quỹ
            </h3>
            <p className="text-xs text-emerald-700/70 mb-5">
              Nhập trực tiếp số tiền để cân bằng lại hệ thống quỹ thác nước của
              bạn.
            </p>

            {fundStatus.message && (
              <div
                className={`p-3 rounded-xl text-xs font-bold mb-4 ${fundStatus.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
              >
                {fundStatus.message}
              </div>
            )}

            <form onSubmit={handleUpdateFunds} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1.5 ml-1">
                  💰 Quỹ Chi Tiêu (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/80 focus:bg-white border border-emerald-200 p-3.5 rounded-2xl outline-none text-base font-black text-slate-800 focus:border-emerald-500 transition"
                  value={funds.spending}
                  onChange={(e) =>
                    setFunds({ ...funds, spending: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1.5 ml-1">
                  🏦 Quỹ Tiết Kiệm (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/80 focus:bg-white border border-emerald-200 p-3.5 rounded-2xl outline-none text-base font-black text-slate-800 focus:border-emerald-500 transition"
                  value={funds.savings}
                  onChange={(e) =>
                    setFunds({ ...funds, savings: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1.5 ml-1">
                  🚑 Quỹ Dự Phòng Khẩn Cấp (VNĐ)
                </label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/80 focus:bg-white border border-emerald-200 p-3.5 rounded-2xl outline-none text-base font-black text-slate-800 focus:border-emerald-500 transition"
                  value={funds.emergency}
                  onChange={(e) =>
                    setFunds({ ...funds, emergency: Number(e.target.value) })
                  }
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl mt-2 transition shadow-lg shadow-emerald-600/20"
              >
                Lưu Số Dư Mới
              </button>
            </form>
          </div>

          {/* Vùng nguy hiểm & Đăng xuất */}
          <div className="bg-rose-50/50 p-6 md:p-8 rounded-[2rem] shadow-sm border border-rose-100">
            <h3 className="font-bold text-rose-700 text-lg flex items-center gap-2 mb-2">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Khu Vực Nguy Hiểm
            </h3>
            <p className="text-xs text-rose-600/70 mb-4">
              Xóa vĩnh viễn toàn bộ lịch sử, giao dịch và đưa các quỹ về 0. Gõ{" "}
              <strong className="bg-rose-200/50 px-1 rounded text-rose-800">
                XOA
              </strong>{" "}
              để kích hoạt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Gõ XOA vào đây..."
                className="flex-1 bg-white border border-rose-200 focus:border-rose-400 p-3.5 rounded-2xl outline-none text-sm font-bold text-rose-800 text-center sm:text-left transition"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <button
                onClick={handleResetData}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3.5 rounded-2xl transition shadow-lg shadow-rose-600/20 whitespace-nowrap"
              >
                Xóa Toàn Bộ
              </button>
            </div>

            <hr className="border-rose-100 my-6" />

            <button
              onClick={handleLogout}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Đăng Xuất Khỏi Thiết Bị
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
