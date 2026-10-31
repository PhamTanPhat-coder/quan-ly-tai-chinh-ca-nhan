import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  // State Form
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  const loadData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/categories`),
      ]);
      setTransactions(transRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Xử lý Thác Nước
  const submitTransaction = async (
    acceptSavings = false,
    acceptEmergency = false,
  ) => {
    if (!amount || amount <= 0) return alert("Vui lòng nhập số tiền hợp lệ");

    try {
      await axios.post(`${API_URL}/transactions`, {
        amount: parseInt(amount),
        category_id: categoryId,
        note,
        acceptSavings,
        acceptEmergency,
      });

      setAmount("");
      setNote("");
      loadData(); // Tải lại danh sách sau khi thêm thành công
    } catch (err) {
      if (err.response && err.response.status === 400) {
        const { code, message } = err.response.data;
        // Hỏi ý kiến người dùng khi hụt tiền quỹ Chi Tiêu
        if (code === "NEED_SAVINGS") {
          if (window.confirm(message)) submitTransaction(true, false);
        } else if (code === "NEED_EMERGENCY") {
          if (window.confirm(message)) submitTransaction(true, true);
        }
      } else {
        alert("Lỗi hệ thống: " + err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Bạn có chắc muốn xóa giao dịch này và hoàn tiền vào Quỹ Chi Tiêu?",
      )
    ) {
      await axios.delete(`${API_URL}/transactions/${id}`);
      loadData();
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Ghi Chép Giao Dịch
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột Form Thêm Mới */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-bold mb-4">Thêm Chi Tiêu</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Số tiền (VNĐ)
              </label>
              <input
                type="number"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Danh mục
              </label>
              <select
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Mua sách, cafe..."
              />
            </div>
            <button
              onClick={() => submitTransaction(false, false)}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
            >
              Thêm Giao Dịch
            </button>
          </div>
        </div>

        {/* Cột Lịch Sử */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Lịch Sử Giao Dịch</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Ngày</th>
                  <th className="p-3">Danh mục</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3">Số tiền</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-3">
                        {new Date(t.transaction_date).toLocaleDateString(
                          "vi-VN",
                        )}
                      </td>
                      <td className="p-3 font-semibold">{t.category_name}</td>
                      <td className="p-3">{t.note}</td>
                      <td className="p-3 text-red-500 font-bold">
                        -{t.amount?.toLocaleString()} đ
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                          Xóa & Hoàn Tiền
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
