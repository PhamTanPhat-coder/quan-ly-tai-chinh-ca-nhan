import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Các điều kiện validate mật khẩu real-time
  const hasLength = formData.password.length >= 8;
  const hasLower = /[a-z]/.test(formData.password);
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSpecial = /[@$!%*?&]/.test(formData.password);

  // Tính điểm độ mạnh mật khẩu (0 -> 5)
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

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp!");
      return;
    }

    if (strengthScore < 5) {
      setError("Mật khẩu chưa đáp ứng đủ các tiêu chuẩn bảo mật bên dưới!");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/register", {
        full_name: formData.fullName,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setSuccess("Đăng ký thành công! Đang chuyển hướng về trang đăng nhập...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.error || "Đăng ký thất bại! Vui lòng thử lại.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Tạo Tài Khoản Mới
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống quản lý tài chính cá nhân thông minh
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="Ví dụ: Phạm Tấn Phát"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="Ví dụ: phatpham"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />

            {/* Thanh đo độ mạnh mật khẩu */}
            {formData.password && (
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Độ mạnh:</span>
                  <span>{getStrengthText()}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  ></div>
                </div>

                {/* Danh sách check-list điều kiện */}
                <div className="grid grid-cols-2 gap-1 text-xs mt-2 text-gray-600">
                  <p
                    className={
                      hasLength
                        ? "text-green-600 font-semibold"
                        : "text-red-500"
                    }
                  >
                    {hasLength ? "✅" : "❌"} Ít nhất 8 ký tự
                  </p>
                  <p
                    className={
                      hasLower ? "text-green-600 font-semibold" : "text-red-500"
                    }
                  >
                    {hasLower ? "✅" : "❌"} Có chữ thường (a-z)
                  </p>
                  <p
                    className={
                      hasUpper ? "text-green-600 font-semibold" : "text-red-500"
                    }
                  >
                    {hasUpper ? "✅" : "❌"} Có chữ hoa (A-Z)
                  </p>
                  <p
                    className={
                      hasNumber
                        ? "text-green-600 font-semibold"
                        : "text-red-500"
                    }
                  >
                    {hasNumber ? "✅" : "❌"} Có chữ số (0-9)
                  </p>
                  <p
                    className={
                      hasSpecial
                        ? "text-green-600 font-semibold"
                        : "text-red-500"
                    }
                  >
                    {hasSpecial ? "✅" : "❌"} Có ký tự đặc biệt (!@#$...)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">
              Nhập lại mật khẩu
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
            {formData.confirmPassword && (
              <p
                className={`text-xs mt-1 font-semibold ${formData.password === formData.confirmPassword ? "text-green-600" : "text-red-500"}`}
              >
                {formData.password === formData.confirmPassword
                  ? "✅ Mật khẩu khớp"
                  : "❌ Mật khẩu không khớp"}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition duration-200 mt-2"
          >
            Đăng Ký Tài Khoản
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Đã có tài khoản?{" "}
          <Link className="text-blue-600 font-bold hover:underline" to="/login">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
