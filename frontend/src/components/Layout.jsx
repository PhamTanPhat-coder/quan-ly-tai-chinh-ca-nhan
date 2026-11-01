import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = localStorage.getItem("fullName") || "Thành viên nhóm";

  // State quản lý việc đóng/mở Sidebar trên điện thoại
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const menuItems = [
    { path: "/", label: "📊 Tổng quan & Thu Chi" },
    { path: "/debts", label: "📒 Quản lý Sổ Nợ" },
    { path: "/reports", label: "📈 Báo cáo Thống kê" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* 1. LỚP PHỦ ĐEN MỜ (OVERLAY) - Chỉ hiện trên mobile khi mở menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* 2. SIDEBAR (MENU TRÁI) */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl md:shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">
              💰 SmartFinance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Xin chào,{" "}
              <span className="text-blue-400 font-semibold">{fullName}</span>
            </p>
          </div>
          {/* Nút X đóng menu chỉ hiện trên mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white"
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
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              // Khi bấm chọn menu trên mobile thì tự động thu menu vào
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
          >
            Đăng xuất hệ thống
          </button>
        </div>
      </div>

      {/* 3. KHU VỰC NỘI DUNG CHÍNH (MAIN CONTENT) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* MOBILE TOPBAR - Chỉ hiển thị trên điện thoại */}
        <div className="md:hidden bg-white border-b flex items-center p-4 shadow-sm z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-slate-600 hover:text-slate-900 focus:outline-none bg-slate-100 p-2.5 rounded-xl transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-black text-slate-800 tracking-wide ml-4">
            SmartFinance
          </h1>
        </div>

        {/* Khu vực thay đổi nội dung (Outlet) */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
