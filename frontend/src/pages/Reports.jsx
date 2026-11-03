import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

export default function Reports() {
  const userId = localStorage.getItem("userId");

  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState(null);
  const [debts, setDebts] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMode, setFilterMode] = useState("month");

  const [autoAnalysisText, setAutoAnalysisText] = useState("");
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "ai",
      text: "Chào bạn! Mình là Trợ lý AI đa năng. Giờ đây mình đã được kết nối Internet! Bạn có thể hỏi mình về tình hình thu chi, nợ nần, hoặc tra cứu giá cả thị trường (như giá lúa, giá vàng hôm nay...) thoải mái nhé! 🌍",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(
        `https://finance-backend-6wv7.onrender.com/api/transactions/${userId}`,
      ),
      axios.get(
        `https://finance-backend-6wv7.onrender.com/api/balances/${userId}`,
      ),
      axios.get(
        `https://finance-backend-6wv7.onrender.com/api/debts/${userId}`,
      ),
    ]).then(([transRes, balRes, debtsRes]) => {
      setTransactions(transRes.data);
      setBalances(balRes.data);
      setDebts(debtsRes.data.filter((d) => d.status === "Chưa trả"));
      handleQuickFilter("month");
    });
  }, [userId]);

  const formatMoney = (val) => Number(val || 0).toLocaleString("vi-VN");

  const handleQuickFilter = (mode) => {
    setFilterMode(mode);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (mode === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === "week") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const handleCustomDateChange = (type, value) => {
    setFilterMode("custom");
    if (type === "start") setStartDate(value);
    if (type === "end") setEndDate(value);
  };

  // LỌC GIAO DỊCH THEO NGÀY
  const filteredTransactions = transactions.filter((t) => {
    if (!startDate && !endDate) return true;
    const tDateStr = t.transaction_date ? t.transaction_date.split("T")[0] : "";
    if (startDate && tDateStr < startDate) return false;
    if (endDate && tDateStr > endDate) return false;
    return true;
  });

  // LỌC CẢ NỢ NẦN THEO NGÀY (CẢI TIẾN)
  const filteredDebts = debts.filter((d) => {
    if (!startDate && !endDate) return true;
    const dDateStr = d.borrowed_date ? d.borrowed_date.split("T")[0] : "";
    if (startDate && dDateStr < startDate) return false;
    if (endDate && dDateStr > endDate) return false;
    return true;
  });

  useEffect(() => {
    if (!balances) return;

    const fetchAutoAnalysis = async () => {
      setIsAutoAnalyzing(true);
      try {
        const res = await axios.post(
          "https://finance-backend-6wv7.onrender.com/api/ai-chat",
          {
            isAutoAnalyze: true,
            transactions: filteredTransactions,
            balances,
            debts: filteredDebts,
          },
        );
        setAutoAnalysisText(res.data.reply);
      } catch (error) {
        setAutoAnalysisText(
          "⚠️ Lỗi: Không thể kết nối với AI. Vui lòng tải lại trang.",
        );
      } finally {
        setIsAutoAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(() => fetchAutoAnalysis(), 800);
    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, balances]);

  const parseAnalysis = (text) => {
    if (!text) return [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const items = [];

    lines.forEach((line, index) => {
      let cleanLine = line.replace(/^[\d.\-\*]+\s*/, "");
      let type = "default";
      let icon = "💡";
      let title = "Nhận định";
      let colorClass = "bg-slate-800/50 border-slate-700 text-slate-300";

      const lowerLine = cleanLine.toLowerCase();

      if (lowerLine.includes("ngân sách") || lowerLine.includes("tiêu lố")) {
        type = "budget";
        icon = "💰";
        title = "Ngân Sách";
        colorClass = "bg-blue-900/30 border-blue-500/30 text-blue-100";
      } else if (lowerLine.includes("giá cả") || lowerLine.includes("giá")) {
        type = "price";
        icon = "🏷️";
        title = "Giá Cả";
        colorClass = "bg-emerald-900/30 border-emerald-500/30 text-emerald-100";
      } else if (
        lowerLine.includes("sức khỏe") ||
        lowerLine.includes("ngọt") ||
        lowerLine.includes("mỡ")
      ) {
        type = "health";
        icon = "❤️";
        title = "Sức Khỏe";
        colorClass = "bg-rose-900/30 border-rose-500/30 text-rose-100";
      } else if (lowerLine.includes("nợ")) {
        type = "debt";
        icon = "⚠️";
        title = "Nợ Nần";
        colorClass = "bg-amber-900/30 border-amber-500/30 text-amber-100";
      } else {
        title = `Phân tích ${index + 1}`;
      }

      let content = cleanLine.replace(
        /^\*\*(Ngân sách|Giá cả|Sức khỏe|Nợ nần|Giá cả giao dịch)[^:]*:?\*\*\s*/i,
        "",
      );
      content = content.replace(
        /^(Ngân sách|Giá cả|Sức khỏe|Nợ nần|Giá cả giao dịch)[^:]*:\s*/i,
        "",
      );
      content = content.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-white font-bold">$1</strong>',
      );

      items.push({ id: Math.random(), type, icon, title, colorClass, content });
    });
    return items;
  };

  const getCategoryIcon = (name) => {
    const icons = {
      "Ăn uống": "🍚",
      "Hóa đơn & Dịch vụ": "🧾",
      "Nhà cửa": "🏠",
      "Di chuyển": "🛵",
      "Giải trí": "🎮",
      "Mua sắm cá nhân": "🛍️",
      "Giao lưu / Hẹn hò": "🍻",
      "Hiếu hỉ & Quà tặng": "🎁",
      "Mua sắm": "🛒",
      "Tiện ích số & Phần mềm": "💻",
      "Thiết bị Công nghệ": "🎧",
      "Sức khỏe / Y tế": "💊",
      "Học tập & Phát triển": "📚",
      "Bảo hiểm / Tiết kiệm": "🛡️",
    };
    return icons[name] || "📌";
  };

  // =================================================================
  // 1. DỮ LIỆU BIỂU ĐỒ TRÒN (Tính cả Chi tiêu + Nợ theo ngày đang lọc)
  // =================================================================
  const categoryTotals = {};
  filteredTransactions.forEach((t) => {
    const cat = t.category_name || "Khác";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  let totalIOwe = 0;
  let totalOwedToMe = 0;
  filteredDebts.forEach((d) => {
    // Sử dụng filteredDebts thay vì debts
    if (d.lender_or_borrower === "Nợ người ta") totalIOwe += d.amount;
    else totalOwedToMe += d.amount;
  });

  const mergedChartLabels = [...Object.keys(categoryTotals)];
  const mergedChartData = [...Object.values(categoryTotals)];

  if (totalIOwe > 0) {
    mergedChartLabels.push("Nợ người ta");
    mergedChartData.push(totalIOwe);
  }
  if (totalOwedToMe > 0) {
    mergedChartLabels.push("Cho mượn");
    mergedChartData.push(totalOwedToMe);
  }

  const chartColors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EF4444",
    "#06B6D4",
    "#F43F5E",
    "#EAB308",
    "#6366f1",
    "#14b8a6",
    "#f97316",
    "#d946ef",
    "#84cc16",
    "#64748b",
    "#a855f7",
    "#fbbf24",
    "#34d399",
    "#f87171",
    "#38bdf8",
    "#fb923c",
  ];

  const doughnutData = {
    labels: mergedChartLabels,
    datasets: [
      {
        data: mergedChartData,
        backgroundColor: chartColors.slice(0, mergedChartLabels.length),
        borderWidth: 0,
      },
    ],
  };

  // =================================================================
  // 2. DỮ LIỆU BIỂU ĐỒ CỘT THEO NGÀY (Cộng gộp cả Giao dịch + Nợ)
  // =================================================================
  const dailyTotals = {};
  filteredTransactions.forEach((t) => {
    const dateStr = t.transaction_date.split("T")[0];
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + t.amount;
  });
  // Cộng thêm Nợ vào các ngày tương ứng
  filteredDebts.forEach((d) => {
    if (d.borrowed_date) {
      const dateStr = d.borrowed_date.split("T")[0];
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + d.amount;
    }
  });

  const sortedDates = Object.keys(dailyTotals).sort();
  const barChartData = {
    labels: sortedDates.map((d) => new Date(d).toLocaleDateString("vi-VN")),
    datasets: [
      {
        label: "Tổng dòng tiền xuất (VNĐ)",
        data: sortedDates.map((d) => dailyTotals[d]),
        backgroundColor: "#3B82F6",
        borderRadius: 4,
      },
    ],
  };

  // =================================================================
  // 3. BIỂU ĐỒ CỘT SO SÁNH CÁC THÁNG (Cộng gộp toàn bộ Giao dịch + Nợ)
  // =================================================================
  const monthlyTotalsAgg = {};
  transactions.forEach((t) => {
    if (!t.transaction_date) return;
    const d = new Date(t.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotalsAgg[key] = (monthlyTotalsAgg[key] || 0) + t.amount;
  });
  // Cộng thêm toàn bộ Nợ vào các tháng
  debts.forEach((d) => {
    if (!d.borrowed_date) return;
    const dObj = new Date(d.borrowed_date);
    const key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotalsAgg[key] = (monthlyTotalsAgg[key] || 0) + d.amount;
  });

  const sortedMonths = Object.keys(monthlyTotalsAgg).sort();
  const monthlyChartData = {
    labels: sortedMonths.map((k) => {
      const [y, m] = k.split("-");
      return `Tháng ${parseInt(m)}/${y}`;
    }),
    datasets: [
      {
        label: "Tổng dòng tiền xuất tháng (VNĐ)",
        data: sortedMonths.map((k) => monthlyTotalsAgg[k]),
        backgroundColor: "#10B981",
        borderRadius: 6,
      },
    ],
  };

  useEffect(() => {
    if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiThinking, isChatOpen]);

  const handleChatAI = async (e) => {
    if (e) e.preventDefault();
    const userMsg = chatInput;
    if (!userMsg.trim()) return;

    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsAiThinking(true);

    try {
      const res = await axios.post(
        "https://finance-backend-6wv7.onrender.com/api/ai-chat",
        {
          isAutoAnalyze: false,
          message: userMsg,
          transactions: filteredTransactions,
          balances,
          debts: filteredDebts,
        },
      );
      setChatHistory((prev) => [...prev, { role: "ai", text: res.data.reply }]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Lỗi mạng hoặc API. Thử lại sau nhé!" },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative">
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">
              Báo Cáo Sổ Sách
            </h1>
            <p className="text-sm text-slate-500">
              Giám sát dòng tiền nội bộ cực kỳ tinh gọn
            </p>
          </div>
        </div>

        {/* KHU VỰC BỘ LỌC */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
          {/* Lọc nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickFilter("today")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filterMode === "today" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-600"}`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handleQuickFilter("week")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filterMode === "week" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-600"}`}
            >
              7 ngày
            </button>
            <button
              onClick={() => handleQuickFilter("month")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filterMode === "month" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-600"}`}
            >
              Tháng này
            </button>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-200"></div>

          {/* Lọc tùy chỉnh A -> B */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-full md:w-auto"
            />
            <span className="text-slate-400 font-bold">➔</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-full md:w-auto"
            />
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ TRÒN VÀ NGÀY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center col-span-1">
          <h2 className="font-black text-slate-800 mb-6 w-full text-left">
            🍩 Cơ cấu Thu Chi & Nợ
          </h2>
          {mergedChartData.every((v) => v === 0) ? (
            <p className="text-slate-400 text-sm py-12">Chưa có dữ liệu.</p>
          ) : (
            <div className="w-56 h-56">
              <Doughnut data={doughnutData} />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center col-span-1 lg:col-span-2">
          <h2 className="font-black text-slate-800 mb-6 w-full text-left">
            📊 Dòng Tiền Xuất Theo Ngày
          </h2>
          {sortedDates.length === 0 ? (
            <p className="text-slate-400 text-sm py-12">Chưa có dữ liệu.</p>
          ) : (
            <div className="w-full h-56 flex justify-center">
              <Bar
                data={barChartData}
                options={{ maintainAspectRatio: false, responsive: true }}
              />
            </div>
          )}
        </div>
      </div>

      {/* BIỂU ĐỒ SO SÁNH THÁNG MỚI */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center w-full">
        <div className="w-full text-left mb-6">
          <h2 className="font-black text-slate-800 text-lg">
            📈 Tổng Quan Dòng Tiền Xuất Các Tháng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bao gồm toàn bộ giao dịch mua sắm và tiền xuất ra cho vay/mượn nợ
          </p>
        </div>
        {sortedMonths.length === 0 ? (
          <p className="text-slate-400 text-sm py-12">
            Chưa có đủ dữ liệu để thống kê theo tháng.
          </p>
        ) : (
          <div className="w-full h-64 flex justify-center">
            <Bar
              data={monthlyChartData}
              options={{ maintainAspectRatio: false, responsive: true }}
            />
          </div>
        )}
      </div>

      {/* 🌟 GIAO DIỆN NHẬN ĐỊNH AI */}
      <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="font-black text-lg text-white tracking-wide">
              AI PHÂN TÍCH THÔNG MINH
            </h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Đánh giá tự động dựa trên khoảng thời gian đang lọc
            </p>
          </div>
        </div>

        {isAutoAnalyzing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-700/50"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {parseAnalysis(autoAnalysisText).map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border backdrop-blur-md flex gap-4 items-start transition hover:scale-[1.02] ${item.colorClass}`}
              >
                <div className="text-2xl mt-0.5 drop-shadow-md">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1.5 opacity-90 uppercase tracking-wider">
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed opacity-85 font-medium"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LỊCH SỬ GIAO DỊCH */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200">
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
          Lịch Sử Giao Dịch
        </h2>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-4 font-semibold">Thời gian</th>
                <th className="pb-4 font-semibold">Danh mục</th>
                <th className="pb-4 font-semibold">Ghi chú</th>
                <th className="pb-4 text-right font-semibold">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center opacity-70">
                      <span className="text-4xl mb-3">📭</span>
                      <p className="text-slate-800 font-bold text-base">
                        Chưa có giao dịch
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-4 text-slate-500 font-medium">
                      {new Date(t.transaction_date).toLocaleDateString(
                        "vi-VN",
                        { day: "2-digit", month: "2-digit", year: "numeric" },
                      )}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                        <span>{getCategoryIcon(t.category_name)}</span>{" "}
                        {t.category_name}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500 font-medium">
                      {t.note || (
                        <span className="text-slate-300 italic">—</span>
                      )}
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

      {/* CHATBOT WIDGET */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 hover:scale-110 transition-transform z-50"
      >
        {isChatOpen ? (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
              🤖
            </div>
            <div>
              <h2 className="font-black text-white text-base">
                Hỏi AI SmartFinance
              </h2>
              <p className="text-[10px] text-white/80 font-medium">
                Chuyên thống kê tiền bạc
              </p>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 custom-scrollbar">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20" : "bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm"}`}
                >
                  {msg.role === "ai" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.text
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isAiThinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={handleChatAI}
            className="p-3 bg-white border-t border-slate-100 flex gap-2"
          >
            <input
              type="text"
              placeholder="VD: Tháng này tiêu khoản nào nhiều nhất?"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs focus:border-blue-500 transition"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isAiThinking}
            />
            <button
              type="submit"
              disabled={isAiThinking || !chatInput.trim()}
              className="bg-blue-600 text-white w-10 rounded-xl flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
