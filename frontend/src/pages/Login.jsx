import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      // Lưu toàn bộ thông tin chuẩn xác từ Backend xuống trình duyệt
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("fullName", res.data.user.fullName);
      // Lấy trực tiếp trạng thái hasSetup từ Database lên
      localStorage.setItem(
        "hasSetup",
        res.data.user.hasSetup ? "true" : "false",
      );

      // Nếu chưa setup quỹ thì đá thẳng qua setup, ngược lại vào dashboard
      if (!res.data.user.hasSetup) {
        navigate("/setup");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Sai tên đăng nhập hoặc mật khẩu!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
        <h2 className="text-2xl font-black text-center mb-6 text-slate-900">
          Đăng Nhập Hệ Thống
        </h2>
        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-semibold">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 border p-3 rounded-xl outline-none font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full bg-slate-50 border p-3 rounded-xl outline-none font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-lg shadow-blue-600/20"
          >
            Đăng Nhập
          </button>
        </form>
        <p className="text-center text-sm mt-6 text-slate-600">
          Chưa có tài khoản?{" "}
          <Link
            className="text-blue-600 font-bold hover:underline"
            to="/register"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
