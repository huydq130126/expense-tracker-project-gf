# 💰 Expense Tracker

Ứng dụng quản lý chi tiêu cá nhân — theo dõi thu nhập, chi tiêu và phân tích tài chính.

**Bài thực hành số 2** — Tư Duy Tính Toán

## 📋 Mô tả

Expense Tracker là ứng dụng web cho phép người dùng:
- Đăng nhập/đăng ký bằng **Email** hoặc **Google** (Firebase Authentication)
- Thêm các khoản **thu nhập** và **chi tiêu**
- Xem **dashboard** tổng quan với biểu đồ phân tích
- Lọc, sắp xếp và xóa giao dịch
- Xuất dữ liệu ra file **CSV**
- Chế độ **Dark Mode**

## 🏗️ Cấu trúc dự án

```
expense-tracker-project/
├── backend/
│   ├── main.py                  # Entry point FastAPI
│   └── app/
│       ├── core/
│       │   ├── config.py        # Cấu hình environment variables
│       │   └── firebase.py      # Khởi tạo Firebase Admin SDK & Pyrebase
│       ├── routers/
│       │   ├── auth.py          # API xác thực (login, signup, Google OAuth)
│       │   └── expenses.py      # API quản lý chi tiêu (CRUD)
│       └── schemas/
│           ├── auth.py          # Pydantic models cho auth
│           └── expense.py       # Pydantic models cho expense
├── frontend/
│   ├── index.html               # Giao diện chính
│   ├── script.js                # Logic frontend, gọi API
│   └── style.css                # Styling, dark mode, responsive
├── requirements.txt             # Dependencies
├── .gitignore
└── README.md
```

## ⚙️ Cài đặt Environment

### Yêu cầu
- Python 3.10+
- Tài khoản Firebase (đã tạo project)

### Bước 1: Clone repository

```bash
git clone https://github.com/huydq130126/expense-tracker-project.git
cd expense-tracker-project
```

### Bước 2: Tạo môi trường ảo và cài đặt dependencies

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Bước 3: Cấu hình Firebase

1. Vào [Firebase Console](https://console.firebase.google.com/), tạo project mới (hoặc dùng project có sẵn).
2. Bật **Authentication** → chọn provider **Email/Password** và **Google**.
3. Tạo **Firestore Database** ở chế độ test.
4. Vào **Project Settings → Service Accounts** → Generate new private key → lưu file thành `firebase_service_account.json` ở thư mục gốc project.
5. Tạo file `backend/.env` với nội dung:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5500/frontend/index.html
```

> ⚠️ **Lưu ý:** Không commit `firebase_service_account.json` và `.env` lên GitHub (đã được thêm vào `.gitignore`).

## 🚀 Chạy Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend chạy tại: **http://localhost:8000**

Swagger API docs: **http://localhost:8000/docs**

### Các API Endpoints

| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/` | Trang chào |
| GET | `/health` | Kiểm tra trạng thái server |
| POST | `/auth/signup` | Đăng ký tài khoản |
| POST | `/auth/login` | Đăng nhập |
| GET | `/auth/me` | Thông tin user hiện tại |
| GET | `/auth/google/start` | Bắt đầu đăng nhập Google |
| GET | `/auth/google/callback` | Callback Google OAuth |
| POST | `/expenses/` | Thêm khoản thu/chi |
| GET | `/expenses/` | Lấy danh sách giao dịch |
| DELETE | `/expenses/{id}` | Xóa giao dịch |

## 🌐 Chạy Frontend

Mở file `frontend/index.html` bằng **Live Server** (extension trong VS Code):

1. Cài extension **Live Server** trong VS Code.
2. Chuột phải vào `frontend/index.html` → **Open with Live Server**.
3. Trình duyệt sẽ tự mở tại `http://127.0.0.1:5500`.

> Hoặc mở trực tiếp file `index.html` trong trình duyệt cũng được.

## 🎬 Video Demo

📹 [Link video demo](https://youtu.be/YOUR_VIDEO_LINK)

## 🛠️ Công nghệ sử dụng

- **Backend:** FastAPI, Python
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Authentication:** Firebase Authentication (Email/Password + Google)
- **Database:** Cloud Firestore
- **SDK:** Firebase Admin SDK, Pyrebase4