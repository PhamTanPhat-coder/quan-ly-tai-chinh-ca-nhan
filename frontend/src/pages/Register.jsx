import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "", // Thêm trường email
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const hasLength = formData.password.length >= 8;
  const hasLower = /[a-z]/.test(formData.password);
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSpecial = /[@$!%*?&]/.test(formData.password);

  const strengthScore = [
    hasLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const getStrengthColor = () => {
    if (strengthScore <= 2) return "bg-red-500";
    if (strengthScore <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strengthScore <= 2) return "Yếu 🔴";
    if (strengthScore <= 4) return "Trung bình 🟡";
    return "Mạnh 🟢";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp!");
      return;
    }

    if (strengthScore < 5) {
      setError("Mật khẩu chưa đáp ứng đủ các tiêu chuẩn bảo mật bên dưới!");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        "https://finance-backend-6wv7.onrender.com/api/register",
        {
          full_name: formData.fullName,
          username: formData.username,
          email: formData.email, // Gửi email xuống Backend
          password: formData.password,
        },
      );

      setSuccess("Đăng ký thành công! Đang chuyển hướng về trang đăng nhập...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.error || "Đăng ký thất bại! Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Tạo Tài Khoản Mới
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý tài chính cá nhân thông minh
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 rounded-xl mb-4 text-sm font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-3 rounded-xl mb-4 text-sm font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 text-xs uppercase font-bold mb-1 ml-1">
                Họ và tên
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                placeholder="VD: Tấn Phát"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 text-xs uppercase font-bold mb-1 ml-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                placeholder="VD: phatpham"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Ô nhập Email mới thêm vào */}
          <div>
            <label className="block text-slate-700 text-xs uppercase font-bold mb-1 ml-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
              placeholder="email.cua.ban@gmail.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">
              * Email dùng để lấy lại mật khẩu khi quên.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 text-xs uppercase font-bold mb-1 ml-1">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium tracking-widest"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />

            {formData.password && (
              <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
                  <span>Độ mạnh:</span>
                  <span>{getStrengthText()}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <p
                    className={
                      hasLength
                        ? "text-emerald-600 font-bold"
                        : "text-slate-400"
                    }
                  >
                    {hasLength ? "✅" : "❌"} Ít nhất 8 ký tự
                  </p>
                  <p
                    className={
                      hasLower ? "text-emerald-600 font-bold" : "text-slate-400"
                    }
                  >
                    {hasLower ? "✅" : "❌"} Có chữ thường
                  </p>
                  <p
                    className={
                      hasUpper ? "text-emerald-600 font-bold" : "text-slate-400"
                    }
                  >
                    {hasUpper ? "✅" : "❌"} Có chữ hoa
                  </p>
                  <p
                    className={
                      hasNumber
                        ? "text-emerald-600 font-bold"
                        : "text-slate-400"
                    }
                  >
                    {hasNumber ? "✅" : "❌"} Có chữ số
                  </p>
                  <p
                    className={
                      hasSpecial
                        ? "text-emerald-600 font-bold"
                        : "text-slate-400 col-span-2"
                    }
                  >
                    {hasSpecial ? "✅" : "❌"} Có ký tự đặc biệt (!@#$...)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 text-xs uppercase font-bold mb-1 ml-1">
              Nhập lại mật khẩu
            </label>
            <input
              type="password"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium tracking-widest"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
            {formData.confirmPassword && (
              <p
                className={`text-[10px] mt-1.5 ml-1 font-bold ${formData.password === formData.confirmPassword ? "text-emerald-600" : "text-rose-500"}`}
              >
                {formData.password === formData.confirmPassword
                  ? "✅ Mật khẩu khớp"
                  : "❌ Mật khẩu không khớp"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white py-3.5 rounded-xl font-bold transition shadow-lg mt-2 ${isLoading ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"}`}
          >
            {isLoading ? "Đang xử lý..." : "Đăng Ký Tài Khoản"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Đã có tài khoản?{" "}
          <Link className="text-blue-600 font-bold hover:underline" to="/login">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
