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
      axios.get(`http://localhost:5000/api/transactions/${userId}`),
      axios.get(`http://localhost:5000/api/balances/${userId}`),
      axios.get(`http://localhost:5000/api/debts/${userId}`),
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

  const filteredTransactions = transactions.filter((t) => {
    if (!startDate && !endDate) return true;
    const tDateStr = t.transaction_date ? t.transaction_date.split("T")[0] : "";
    if (startDate && tDateStr < startDate) return false;
    if (endDate && tDateStr > endDate) return false;
    return true;
  });

  useEffect(() => {
    if (!balances) return;

    const fetchAutoAnalysis = async () => {
      setIsAutoAnalyzing(true);
      try {
        const res = await axios.post("http://localhost:5000/api/ai-chat", {
          isAutoAnalyze: true,
          transactions: filteredTransactions,
          balances,
          debts,
        });
        setAutoAnalysisText(res.data.reply);
      } catch (error) {
        setAutoAnalysisText("⚠️ AI đang ngủ. Bạn tải lại trang sau nhé.");
      } finally {
        setIsAutoAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(() => fetchAutoAnalysis(), 800);
    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, balances]);

  const formatAIResponse = (text) => {
    if (!text) return "";
    return text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-white font-black">$1</strong>',
      )
      .replace(/\*(.*?)\*/g, '<em class="text-slate-400">$1</em>')
      .replace(/\n/g, "<br/>");
  };

  const categoryTotals = {};
  filteredTransactions.forEach((t) => {
    const cat = t.category_name || "Khác";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  let totalIOwe = 0;
  let totalOwedToMe = 0;
  debts.forEach((d) => {
    if (d.lender_or_borrower === "Nợ người ta") totalIOwe += d.amount;
    else totalOwedToMe += d.amount;
  });

  const mergedChartLabels = [
    ...Object.keys(categoryTotals),
    "Nợ người ta",
    "Cho mượn",
  ];
  const mergedChartData = [
    ...Object.values(categoryTotals),
    totalIOwe,
    totalOwedToMe,
  ];

  const doughnutData = {
    labels: mergedChartLabels,
    datasets: [
      {
        data: mergedChartData,
        backgroundColor: [
          "#3B82F6",
          "#10B981",
          "#F59E0B",
          "#8B5CF6",
          "#EF4444",
          "#06B6D4",
          "#F43F5E",
          "#EAB308",
        ],
        borderWidth: 0,
      },
    ],
  };

  const dailyTotals = {};
  filteredTransactions.forEach((t) => {
    const dateStr = t.transaction_date.split("T")[0];
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + t.amount;
  });

  const sortedDates = Object.keys(dailyTotals).sort();
  const barChartData = {
    labels: sortedDates.map((d) => new Date(d).toLocaleDateString("vi-VN")),
    datasets: [
      {
        label: "Tổng chi (VNĐ)",
        data: sortedDates.map((d) => dailyTotals[d]),
        backgroundColor: "#3B82F6",
        borderRadius: 4,
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
      const res = await axios.post("http://localhost:5000/api/ai-chat", {
        isAutoAnalyze: false,
        message: userMsg,
        transactions: filteredTransactions,
        balances,
        debts,
      });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
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
      </div>

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
            📊 Tần Suất Chi Tiêu Theo Ngày
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

      {/* NHẬN ĐỊNH NGẮN GỌN TỪ AI */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl text-white">
        <div className="flex items-center gap-3 border-b border-slate-700 pb-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-base">⚡</span>
          </div>
          <h2 className="font-black text-base text-blue-400 uppercase tracking-widest">
            Nhận Định Nhanh
          </h2>
        </div>

        {isAutoAnalyzing ? (
          <div className="space-y-3">
            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/2"></div>
          </div>
        ) : (
          <div
            className="text-sm text-slate-300 leading-relaxed font-medium"
            dangerouslySetInnerHTML={{
              __html: formatAIResponse(autoAnalysisText),
            }}
          />
        )}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-lg font-black text-slate-900">
          📜 Lịch Sử Giao Dịch
        </h2>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-4">Thời gian</th>
                <th className="pb-4">Danh mục</th>
                <th className="pb-4">Ghi chú</th>
                <th className="pb-4 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    Chưa ghi nhận khoản chi nào.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 text-slate-500 font-medium">
                      {new Date(t.transaction_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="py-4 font-bold text-slate-800">
                      {t.category_name}
                    </td>
                    <td className="py-4 text-slate-500 text-xs italic">
                      {t.note || "—"}
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
                Hỏi AI Sổ Sách
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
