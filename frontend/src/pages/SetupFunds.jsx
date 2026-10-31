import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function SetupFunds() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  // Lưu giá trị thô (number) để gửi lên backend
  const [funds, setFunds] = useState({
    spending: "",
    savings: "",
    emergency: "",
  });
  const [loading, setLoading] = useState(false);

  // Hàm format hiển thị dạng 100.000
  const formatInputMoney = (val) => {
    if (!val) return "";
    const cleanNum = val.toString().replace(/\D/g, "");
    return Number(cleanNum).toLocaleString("vi-VN");
  };

  const handleChange = (field, e) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFunds({ ...funds, [field]: rawVal });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`http://localhost:5000/api/balances/${userId}`, {
        spending: parseFloat(funds.spending) || 0,
        savings: parseFloat(funds.savings) || 0,
        emergency: parseFloat(funds.emergency) || 0,
      });
      localStorage.setItem("hasSetup", "true");
      navigate("/");
    } catch (err) {
      alert("Lỗi lưu số dư: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">
            CÀI ĐẶT SỐ DƯ TÀI SẢN BAN ĐẦU
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Vui lòng điền chính xác số tiền thực tế để hệ thống kích hoạt bộ lọc
            tài chính.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                1. Quỹ Chi Tiêu Tháng Này
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  placeholder="VD: 3.000.000"
                  value={formatInputMoney(funds.spending)}
                  onChange={(e) => handleChange("spending", e)}
                />
                <span className="font-bold text-slate-500">VNĐ</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                2. Quỹ Tiết Kiệm (Có thể rút bù trừ)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  placeholder="VD: 1.000.000"
                  value={formatInputMoney(funds.savings)}
                  onChange={(e) => handleChange("savings", e)}
                />
                <span className="font-bold text-slate-500">VNĐ</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                3. Quỹ Dự Phòng Khẩn Cấp (Ốm đau, sự cố lớn)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  placeholder="VD: 5.000.000"
                  value={formatInputMoney(funds.emergency)}
                  onChange={(e) => handleChange("emergency", e)}
                />
                <span className="font-bold text-slate-500">VNĐ</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200"
          >
            {loading ? "Đang khởi tạo..." : "LƯU THÔNG TIN & BẮT ĐẦU SỬ DỤNG ➔"}
          </button>
        </form>
      </div>
    </div>
  );
}
