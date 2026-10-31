import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = localStorage.getItem("fullName") || "Thành viên nhóm";

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
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-wide">
            💰 SmartFinance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Xin chào,{" "}
            <span className="text-blue-400 font-semibold">{fullName}</span>
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
