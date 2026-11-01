import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // State cho phần Quên Mật Khẩu
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState({ type: "", message: "" });
  const [isSendingMail, setIsSendingMail] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("fullName", res.data.user.fullName);
      localStorage.setItem(
        "hasSetup",
        res.data.user.hasSetup ? "true" : "false",
      );
      if (!res.data.user.hasSetup) {
        navigate("/setup");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Sai tên đăng nhập hoặc mật khẩu!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSendingMail(true);
    setForgotStatus({ type: "", message: "" });

    try {
      const res = await axios.post(
        "http://localhost:5000/api/forgot-password",
        { email: forgotEmail },
      );
      setForgotStatus({ type: "success", message: res.data.message });
      setForgotEmail(""); // Clear input sau khi gửi thành công
    } catch (err) {
      setForgotStatus({
        type: "error",
        message: err.response?.data?.error || "Có lỗi xảy ra!",
      });
    } finally {
      setIsSendingMail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      {/* POP-UP QUÊN MẬT KHẨU */}
      {showForgotPopup && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl border flex flex-col relative">
            <button
              onClick={() => setShowForgotPopup(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full transition"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
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
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              Khôi phục mật khẩu
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Nhập địa chỉ Email bạn đã dùng để đăng ký. Hệ thống sẽ cấp mật
              khẩu mới và gửi vào hộp thư của bạn.
            </p>

            {forgotStatus.message && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold ${forgotStatus.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
              >
                {forgotStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 p-3.5 rounded-xl outline-none font-medium transition"
                  placeholder="Nhập Email của bạn..."
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isSendingMail}
                />
              </div>
              <button
                type="submit"
                disabled={isSendingMail}
                className={`w-full text-white py-3.5 rounded-xl font-bold transition shadow-lg ${isSendingMail ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"}`}
              >
                {isSendingMail ? "Đang gửi Email..." : "Gửi Mật Khẩu Mới"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FORM ĐĂNG NHẬP CHÍNH */}
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Đăng Nhập</h2>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-5 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 p-3.5 rounded-xl outline-none font-medium transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPopup(true)}
                className="text-[10px] font-bold text-blue-600 hover:text-indigo-700 transition"
              >
                Quên mật khẩu?
              </button>
            </div>
            <input
              type="password"
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 p-3.5 rounded-xl outline-none font-medium tracking-widest transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white p-3.5 rounded-xl font-bold transition mt-2 shadow-lg ${isLoading ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:-translate-y-0.5"}`}
          >
            {isLoading ? "Đang xử lý..." : "Đăng Nhập Khám Phá"}
          </button>
        </form>

        <p className="text-center text-xs mt-8 text-slate-500">
          Chưa có tài khoản?{" "}
          <Link
            className="text-blue-600 font-bold hover:underline"
            to="/register"
          >
            Đăng ký hệ thống
          </Link>
        </p>
      </div>
    </div>
  );
}
