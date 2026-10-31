# Ứng Dụng Quản Lý Tài Chính & Sổ Nợ Cá Nhân (Waterfall Budgeting System)

Hệ thống quản lý tài chính thông minh áp dụng quy tắc phân bổ dòng tiền **Thác Nước (Spending -> Savings -> Emergency)**, kết hợp tính năng quản lý sổ nợ, đếm ngược thời gian trả nợ và báo cáo thống kê trực quan.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN (CHI TIẾT TỪNG BƯỚC)

Dự án này bao gồm 2 phần chạy độc lập: **Backend (Server Node.js)** và **Frontend (Giao diện React)**. Bạn cần mở **2 cửa sổ Terminal song song** để chạy cả hai phần này cùng lúc.

---

### BƯỚC 0: Cài Đặt Node.js (Nếu máy bạn chưa có)

Ứng dụng yêu cầu máy tính phải cài sẵn **Node.js** để chạy được mã nguồn.

1. Truy cập trang chủ chính thức: [https://nodejs.org/](https://nodejs.org/)
2. Tải về phiên bản **LTS** (Phiên bản khuyên dùng cho phần lớn người dùng).
3. Mở file vừa tải về và tiến hành cài đặt (Cứ bấm **Next -> Next -> Install** cho đến khi hoàn tất).
4. Để kiểm tra xem máy đã nhận Node.js chưa, hãy mở Terminal/Cmd lên và gõ:
   ```bash
   node -v
   npm -v
   ```

BƯỚC 1: Tải Mã Nguồn Về Máy (Clone Project)
Mở Terminal/Git Bash tại thư mục bạn muốn lưu dự án và chạy lệnh:

git clone [https://github.com/PhamTanPhat-coder/quan-ly-tai-chinh-ca-nhan.git](https://github.com/PhamTanPhat-coder/quan-ly-tai-chinh-ca-nhan.git)
cd quan-ly-tai-chinh-ca-nhan

BƯỚC 2: Khởi Chạy Backend (PHẢI CHẠY TRƯỚC TIÊN)
Mở cửa sổ Terminal thứ nhất, di chuyển vào thư mục backend, chạy lần lượt 2 lệnh phía dưới:
cd backend
npm install
Sau khi chạy 2 lệnh trên xong thì chạy:
node server.js
👉 Khi thấy dòng chữ Backend đang chạy trên cổng 5000 nghĩa là phần Backend đã sẵn sàng.

BƯỚC 3: Khởi Chạy Frontend (CHẠY SAU KHI BACKEND ĐÃ BẬT)
Mở thêm một cửa sổ Terminal thứ hai (giữ nguyên cửa sổ Terminal thứ nhất đang chạy backend).

Di chuyển về thư mục gốc của dự án
cd frontend
Cài đặt các thư viện cho frontend:
npm install
Khởi động giao diện React:
npm run dev
👉 Terminal sẽ cung cấp cho bạn một đường dẫn local (ví dụ: http://localhost:5173).

BƯỚC 4: Trải Nghiệm Ứng Dụng
Mở trình duyệt web (Chrome, Edge,...) và truy cập vào đường dẫn http://localhost:5173.

Đăng ký tài khoản mới, thiết lập số dư ban đầu cho các quỹ và bắt đầu trải nghiệm!

Cấu Trúc Thư Mục Dự Án
quan-ly-tai-chinh-ca-nhan/
├── backend/ # Chứa API, controllers và cấu hình SQLite
│ ├── server.js # Điểm khởi chạy server Node.js
│ ├── controllers.js# Logic xử lý nghiệp vụ (Thác nước, số dư, sổ nợ)
│ └── db.js # Khởi tạo kết nối cơ sở dữ liệu SQLite
├── src/ # Mã nguồn giao diện Frontend (React)
│ ├── pages/ # Các trang (Dashboard, Debts, Reports, Login, Register, SetupFunds)
│ └── components/ # Các thành phần giao diện chung (Layout,...)
├── package.json
└── README.md

Các Tính Năng Nổi Bật
Quản lý Quỹ Thác Nước: Tự động trích xuất từ Quỹ Tiết Kiệm hoặc Quỹ Khẩn Cấp khi Quỹ Chi Tiêu không đủ, kèm pop-up cảnh báo thông minh.

Chặn âm tiền: Bảo vệ tài khoản, từ chối giao dịch nếu tổng tài sản 3 quỹ không đủ thanh toán.

Sổ Nợ & Ticker Thông Báo: Quản lý danh sách "Tôi nợ người ta" / "Người ta nợ tôi", đếm ngược ngày đến hạn và hiển thị thông báo trượt luân phiên.

Báo Cáo Cơ Cấu Chi Tiêu: Biểu đồ tròn trực quan kèm bộ lọc nhanh (Hôm nay, 7 ngày qua, Tháng này, Tùy chỉnh ngày) hiển thị danh sách giao dịch chi tiết.
