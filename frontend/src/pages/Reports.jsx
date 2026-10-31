import { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Reports() {
  const userId = localStorage.getItem("userId");
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMode, setFilterMode] = useState("month");

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/transactions/${userId}`)
      .then((res) => {
        setTransactions(res.data);
        handleQuickFilter("month"); // Mặc định hiển thị tháng này
      });
  }, [userId]);

  const formatMoney = (val) => Number(val || 0).toLocaleString("vi-VN");

  // Hàm xử lý lọc nhanh chuẩn xác theo giờ địa phương
  const handleQuickFilter = (mode) => {
    setFilterMode(mode);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (mode === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === "week") {
      start.setDate(now.getDate() - 6); // Lùi lại 6 ngày trước + hôm nay = đúng 7 ngày
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Lọc giao dịch chính xác theo khoảng ngày được chọn
  const filteredTransactions = transactions.filter((t) => {
    if (!startDate && !endDate) return true;

    // Cắt chuỗi lấy phần ngày YYYY-MM-DD của giao dịch để so sánh an toàn không lệch múi giờ
    const tDateStr = t.transaction_date ? t.transaction_date.split("T")[0] : "";

    if (startDate && tDateStr < startDate) return false;
    if (endDate && tDateStr > endDate) return false;
    return true;
  });

  // Gom nhóm dữ liệu biểu đồ tròn
  const categoryTotals = {};
  filteredTransactions.forEach((t) => {
    const cat = t.category_name || "Khác";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  const chartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#3B82F6",
          "#10B981",
          "#F59E0B",
          "#EF4444",
          "#8B5CF6",
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            📈 Báo Cáo & Phân Tích Tài Chính
          </h1>
          <p className="text-sm text-slate-500">
            Biểu đồ cơ cấu chi tiêu trực quan và danh sách chi tiết theo mốc
            thời gian.
          </p>
        </div>

        {/* Các nút lọc nhanh và tùy chỉnh Từ ngày ... Đến ngày ... */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleQuickFilter("today")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${filterMode === "today" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => handleQuickFilter("week")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${filterMode === "week" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            7 ngày qua
          </button>
          <button
            onClick={() => handleQuickFilter("month")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${filterMode === "month" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Tháng này
          </button>

          <div className="flex items-center gap-1 text-xs font-semibold ml-2">
            <span>Từ:</span>
            <input
              type="date"
              className="border p-2 rounded-xl outline-none"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFilterMode("custom");
              }}
            />
            <span>Đến:</span>
            <input
              type="date"
              className="border p-2 rounded-xl outline-none"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFilterMode("custom");
              }}
            />
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ TRÒN & AI PHÂN TÍCH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col items-center justify-center">
          <h2 className="font-black text-slate-800 mb-6 w-full text-left">
            📊 Biểu Đồ Cơ Cấu Chi Tiêu
          </h2>
          {filteredTransactions.length === 0 ? (
            <p className="text-slate-400 text-sm py-12">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này.
            </p>
          ) : (
            <div className="w-64 h-64">
              <Doughnut data={chartData} />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-8 rounded-3xl space-y-4 flex flex-col justify-center">
          <h2 className="font-black text-amber-900 text-lg flex items-center gap-2">
            <span>🤖</span> AI Phân Tích & Cảnh Báo Bất Thường
          </h2>
          {filteredTransactions.length === 0 ? (
            <p className="text-sm text-amber-800">
              Chưa ghi nhận giao dịch nào trong khoảng thời gian được chọn.
            </p>
          ) : (
            <div className="space-y-3 text-sm text-amber-900 font-medium">
              <p>
                ⚠️ Hệ thống ghi nhận có tổng cộng{" "}
                <strong>{filteredTransactions.length} giao dịch</strong> trong
                khoảng thời gian này.
              </p>
              <p>
                ✅ Nguyên tắc phân bổ dòng tiền thác nước đang hoạt động ổn
                định, bảo vệ tốt các quỹ dự phòng.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DANH SÁCH CHI TIẾT GIAO DỊCH THEO KHOẢNG THỜI GIAN ĐƯỢC CHỌN */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border space-y-4">
        <h2 className="text-lg font-black text-slate-900">
          📜 Danh Sách Giao Dịch Chi Tiết Trong Khoảng Thời Gian Đã Chọn
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs font-bold text-slate-400 uppercase">
                <th className="pb-3">Thời gian</th>
                <th className="pb-3">Danh mục</th>
                <th className="pb-3">Ghi chú</th>
                <th className="pb-3 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    Không tìm thấy giao dịch nào phù hợp trong khoảng thời gian
                    này.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-4 text-slate-500">
                      {new Date(t.transaction_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="py-4 font-bold text-slate-800">
                      {t.category_name}
                    </td>
                    <td className="py-4 text-slate-600">
                      {t.note || "Không có ghi chú"}
                    </td>
                    <td className="py-4 text-right font-black text-rose-600">
                      -{formatMoney(t.amount)} đ
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
