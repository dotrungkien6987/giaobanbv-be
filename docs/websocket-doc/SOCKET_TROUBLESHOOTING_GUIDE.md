# 📚 HƯỚNG DẪN HỆ THỐNG THÔNG BÁO REAL-TIME

## Socket.io + WebSocket trong Hospital Management System

> **Tài liệu này giải thích:** Tại sao thông báo hoạt động trên LAN nhưng không hoạt động trên server production, và cách khắc phục.

---

## 📖 MỤC LỤC

1. [Khái niệm cơ bản](#1️⃣-khái-niệm-cơ-bản)
2. [Kiến trúc hệ thống](#2️⃣-kiến-trúc-hệ-thống)
3. [Luồng hoạt động chi tiết](#3️⃣-luồng-hoạt-động-chi-tiết)
4. [Vấn đề hiện tại](#4️⃣-vấn-đề-hiện-tại)
5. [Hướng dẫn cấu hình từng bước](#5️⃣-hướng-dẫn-cấu-hình-từng-bước)
6. [Kiểm tra và xử lý sự cố](#6️⃣-kiểm-tra-và-xử-lý-sự-cố)

---

## 1️⃣ KHÁI NIỆM CƠ BẢN

### 🔹 WebSocket là gì?

**WebSocket** là giao thức truyền thông **2 chiều** (bidirectional) giữa client và server qua một kết nối duy nhất.

```
HTTP Truyền thống (Request-Response):
┌─────────┐                           ┌─────────┐
│ Client  │──── Request ────>         │ Server  │
│ (Trình  │                           │         │
│  duyệt) │<─── Response ────         │         │
└─────────┘                           └─────────┘
   ⏱️ Mỗi lần cần dữ liệu phải gửi request mới

WebSocket (Kết nối liên tục):
┌─────────┐                           ┌─────────┐
│ Client  │<════════════════════════> │ Server  │
│         │   Kết nối mở liên tục     │         │
│         │  Gửi/nhận bất cứ lúc nào  │         │
└─────────┘                           └─────────┘
   ✅ Server có thể chủ động gửi dữ liệu (push)
```

**Ưu điểm:**

- ✅ Server có thể **chủ động gửi** thông báo đến client (không cần client hỏi)
- ✅ **Thời gian thực** (real-time): Độ trễ thấp (~ms)
- ✅ Tiết kiệm băng thông: Không cần gửi HTTP headers mỗi lần

**Ví dụ thực tế:**

- 💬 Chat (nhận tin nhắn mới ngay lập tức)
- 🔔 Thông báo (chuông đổ chuông khi có tin mới)
- 📊 Dashboard cập nhật số liệu real-time

---

### 🔹 Socket.io là gì?

**Socket.io** là thư viện JavaScript **bọc ngoài WebSocket** để:

- ✅ Tự động **fallback** sang polling nếu WebSocket bị chặn
- ✅ Tự động **reconnect** khi mất kết nối
- ✅ Hỗ trợ **rooms** (phát tin đến nhóm user cụ thể)
- ✅ Dễ sử dụng hơn WebSocket thuần

```
               Socket.io
    ┌─────────────────────────────┐
    │                             │
    │  ┌─────────┐   ┌─────────┐ │
    │  │WebSocket│   │ Polling │ │ <- Tự động chọn
    │  └─────────┘   └─────────┘ │
    │                             │
    │  ┌──────────────────────┐  │
    │  │ Auto Reconnect       │  │
    │  │ Room Support         │  │
    │  │ Event-based API      │  │
    │  └──────────────────────┘  │
    └─────────────────────────────┘
```

---

### 🔹 CORS là gì?

**CORS** (Cross-Origin Resource Sharing) = Chính sách bảo mật của trình duyệt.

**Vấn đề:**

```
Frontend chạy ở:  http://frontend.com
Backend chạy ở:   http://backend.com  <- Khác domain!

❌ Trình duyệt sẽ CHẶN kết nối (bảo vệ người dùng)
```

**Giải pháp:** Backend phải **cho phép** cụ thể domain nào được kết nối.

```
Backend CORS Config:
┌─────────────────────────────────────┐
│ Whitelist (danh sách cho phép):    │
│  ✅ http://frontend.com             │
│  ✅ http://192.168.5.200:3000       │
│  ❌ http://hacker.com (bị chặn)     │
└─────────────────────────────────────┘
```

---

### 🔹 Environment Variables (.env) là gì?

File `.env` chứa **cấu hình riêng** cho từng môi trường (local, production).

```
.env (Local - chạy trên máy cá nhân):
┌──────────────────────────────────────┐
│ REACT_APP_BACKEND_API=               │
│   http://192.168.5.200:8000/api      │
│ MONGODB_URI=                         │
│   mongodb://192.168.1.248:27017/test │
└──────────────────────────────────────┘

.env (Production - chạy trên server thật):
┌──────────────────────────────────────┐
│ REACT_APP_BACKEND_API=               │
│   http://api.bvdkphutho.io.vn:778/api│
│ MONGODB_URI=                         │
│   mongodb://production-server/db     │
└──────────────────────────────────────┘
```

**⚠️ Lỗi thường gặp:** Quên đổi URL khi deploy → app kết nối sai server!

---

## 2️⃣ KIẾN TRÚC HỆ THỐNG

### 📐 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MÁY TÍNH NGƯỜI DÙNG                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  TRÌNH DUYỆT (Chrome/Edge/Firefox)                          │ │
│  │                                                               │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  FRONTEND (React App)                                  │ │ │
│  │  │                                                         │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │ │
│  │  │  │              │  │              │  │             │ │ │ │
│  │  │  │  Giao diện   │  │   Quả chuông │  │   Toast     │ │ │ │
│  │  │  │  (UI)        │  │   thông báo  │  │   popup     │ │ │ │
│  │  │  │              │  │     🔔 (5)   │  │   💬        │ │ │ │
│  │  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │ │ │
│  │  │         │                  │                  │        │ │ │
│  │  │         └──────────────────┴──────────────────┘        │ │ │
│  │  │                            │                           │ │ │
│  │  │                    ┌───────▼───────┐                  │ │ │
│  │  │                    │ SocketContext │                  │ │ │
│  │  │                    │ (Quản lý      │                  │ │ │
│  │  │                    │  kết nối)     │                  │ │ │
│  │  │                    └───────┬───────┘                  │ │ │
│  │  │                            │                           │ │ │
│  │  │                    ┌───────▼───────┐                  │ │ │
│  │  │                    │ Socket.io     │                  │ │ │
│  │  │                    │ Client        │                  │ │ │
│  │  │                    └───────┬───────┘                  │ │ │
│  │  └────────────────────────────┼──────────────────────────┘ │ │
│  └───────────────────────────────┼────────────────────────────┘ │
└────────────────────────────────────┼──────────────────────────────┘
                                    │
                    ════════════════╪════════════════
                         INTERNET / LAN
                    ════════════════╪════════════════
                                    │
┌────────────────────────────────────┼──────────────────────────────┐
│                         SERVER (Backend)                          │
│                                    │                              │
│  ┌─────────────────────────────────▼───────────────────────────┐ │
│  │  Node.js Application (Express)                              │ │
│  │                                                              │ │
│  │  ┌──────────────┐         ┌──────────────┐                 │ │
│  │  │ Socket.io    │         │ Notification │                 │ │
│  │  │ Server       │◄────────│ Service      │                 │ │
│  │  │              │         │              │                 │ │
│  │  │ - Nhận kết   │         │ - Tạo thông  │                 │ │
│  │  │   nối client │         │   báo mới    │                 │ │
│  │  │ - Gửi tin    │         │ - Gửi qua    │                 │ │
│  │  │   đến user   │         │   socket     │                 │ │
│  │  └──────┬───────┘         └──────▲───────┘                 │ │
│  │         │                        │                          │ │
│  │         │                 ┌──────┴───────┐                 │ │
│  │         │                 │ Controllers  │                 │ │
│  │         │                 │ (Công việc,  │                 │ │
│  │         │                 │  Sự cố, v.v.)│                 │ │
│  │         │                 └──────────────┘                 │ │
│  │         │                                                   │ │
│  │  ┌──────▼─────────────────────────────────────────┐        │ │
│  │  │         CORS Configuration                     │        │ │
│  │  │  (Kiểm soát ai được phép kết nối)             │        │ │
│  │  │                                                 │        │ │
│  │  │  Whitelist:                                    │        │ │
│  │  │   - http://192.168.5.200:3000 ✅               │        │ │
│  │  │   - http://bvdktphutho.net ✅                  │        │ │
│  │  │   - http://hacker.com ❌ (bị chặn)             │        │ │
│  │  └─────────────────────────────────────────────────┘        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  MongoDB Database                                            │ │
│  │  - Lưu thông báo                                             │ │
│  │  - Lưu user, công việc, v.v.                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ LUỒNG HOẠT ĐỘNG CHI TIẾT

### 🔄 Bước 1: Kết nối Socket (Khi user đăng nhập)

```
┌──────────┐                                              ┌──────────┐
│ Frontend │                                              │ Backend  │
│  React   │                                              │  Node.js │
└────┬─────┘                                              └────┬─────┘
     │                                                          │
     │ 1. User đăng nhập thành công                            │
     │    → Nhận JWT token                                     │
     │    → useAuth() lưu token + user info                    │
     │                                                          │
     │ 2. SocketContext phát hiện user authenticated           │
     │    → Tạo Socket.io client                               │
     │    → Kết nối đến SOCKET_URL                            │
     │                                                          │
     │ 3. Socket connection request                            │
     │────(WebSocket Handshake + JWT token)─────────────────>│
     │                                                          │
     │                                              4. Kiểm tra:│
     │                                              - CORS origin│
     │                                              - JWT token │
     │                                              - User hợp lệ│
     │                                                          │
     │ 5. Connection success!                                   │
     │<────────────(socket ID: abc123)──────────────────────────│
     │                                                          │
     │                                       6. Lưu tracking:   │
     │                                          User X online   │
     │                                          Socket ID: abc123│
     │                                          Join room:      │
     │                                          "user:X"        │
     │                                                          │
     │ 7. Frontend console.log:                                │
     │    "[Socket] Connected! ID: abc123"                     │
     │                                                          │
     │ 8. Quả chuông 🔔 sẵn sàng nhận thông báo!              │
     │                                                          │
```

**Code tương ứng:**

**Frontend:** `fe-bcgiaobanbvt/src/contexts/SocketContext.js`

```javascript
// Tạo kết nối
const socket = io(SOCKET_URL, {
  auth: { token: accessToken }, // Gửi JWT
  transports: ["websocket", "polling"],
});

// Lắng nghe kết nối thành công
socket.on("connect", () => {
  console.log("[Socket] Connected! ID:", socket.id);
});
```

**Backend:** `giaobanbv-be/services/socketService.js`

```javascript
// Xác thực token
socket.use(async ([event, ...args], next) => {
  const token = socket.handshake.auth.token;
  const payload = jwt.verify(token, JWT_SECRET);
  socket.userId = payload.userId;
  next();
});

// Join room riêng cho user
socket.on("connection", () => {
  socket.join(`user:${socket.userId}`);
  onlineUsers.set(userId, socketId);
});
```

---

### 🔄 Bước 2: Gửi thông báo (Khi có sự kiện nghiệp vụ)

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Controller │         │ Notification │         │    Socket    │
│  (Tạo công  │         │   Service    │         │   Service    │
│   việc mới) │         │              │         │              │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                        │
       │ 1. Gọi API tạo        │                        │
       │    công việc mới      │                        │
       │    (POST /congviec)   │                        │
       │                       │                        │
       │ 2. Lưu vào DB         │                        │
       │    thành công         │                        │
       │                       │                        │
       │ 3. Gửi thông báo:     │                        │
       │ notificationService   │                        │
       │   .send({             │                        │
       │     type: "YÊUCAU_MỚI"│                        │
       │     data: {...}       │                        │
       │   })                  │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │ 4. Load template từ DB │
       │                       │    "Bạn có yêu cầu mới"│
       │                       │                        │
       │                       │ 5. Build recipients:   │
       │                       │    NhanVienID → UserID │
       │                       │                        │
       │                       │ 6. Render template:    │
       │                       │    Thay {{ten_cv}}     │
       │                       │                        │
       │                       │ 7. Lưu Notification    │
       │                       │    vào MongoDB         │
       │                       │    {                   │
       │                       │      title: "...",     │
       │                       │      body: "...",      │
       │                       │      recipientId: X    │
       │                       │    }                   │
       │                       │                        │
       │                       │ 8. Emit qua socket:    │
       │                       │ socketService          │
       │                       │   .emitToUser(         │
       │                       │     userX,             │
       │                       │     "notification:new",│
       │                       │     data               │
       │                       │   )                    │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │                        │ 9. Kiểm tra:
       │                       │                        │    User X online?
       │                       │                        │    ✅ Có!
       │                       │                        │
       │                       │                        │ 10. Gửi đến room:
       │                       │                        │  io.to("user:X")
       │                       │                        │    .emit(...)
       │                       │                        │
       ▼                       ▼                        ▼

   Frontend của User X nhận được event "notification:new"! ⬇️
```

---

### 🔄 Bước 3: Nhận thông báo ở Frontend

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend của User X (React App đang chạy)                       │
└──────────────────────────────────────────────────────────────────┘

     Socket Client                NotificationBell
          │                              │
          │ 1. Nhận event:               │
          │    "notification:new"        │
          │    data: {                   │
          │      notification: {         │
          │        title: "Yêu cầu mới", │
          │        body: "...",          │
          │        priority: "normal"    │
          │      }                       │
          │    }                         │
          │                              │
          │ 2. Trigger listener          │
          ├─────────────────────────────>│
          │                              │
          │                              │ 3. Dispatch Redux:
          │                              │    addNotification()
          │                              │    → State: unreadCount++
          │                              │    → Quả chuông: 🔔 (1)
          │                              │
          │                              │ 4. Hiện toast:
          │                              │    toast.info(title)
          │                              │    ┌─────────────────┐
          │                              │    │ 💬 Yêu cầu mới! │
          │                              │    │  (Click để xem) │
          │                              │    └─────────────────┘
          │                              │
          │                              │ 5. Chuông hiển thị:
          │                              │    🔔 (1) ← Badge số
          │                              │
```

**Code tương ứng:**

`fe-bcgiaobanbvt/src/features/Notification/NotificationBell.js`

```javascript
// Lắng nghe event từ socket
const unsubNew = on("notification:new", (data) => {
  // Cập nhật state
  dispatch(addNotification(data.notification));

  // Hiện toast
  if (data.notification.priority === "urgent") {
    toast.warning(data.notification.title);
  } else {
    toast.info(data.notification.title);
  }
});
```

---

### 🔄 So sánh: LAN vs Server

#### ✅ HOẠT ĐỘNG TRÊN LAN (192.168.x.x)

```
┌────────────────────┐              ┌────────────────────┐
│  Máy A (Frontend)  │              │  Máy B (Backend)   │
│  IP: 192.168.5.200 │              │  IP: 192.168.5.200 │
│  Port: 3000        │              │  Port: 8000        │
└─────────┬──────────┘              └─────────┬──────────┘
          │                                   │
          │  Cùng mạng LAN → Kết nối trực tiếp│
          │                                   │
          │ SOCKET_URL:                       │
          │ "http://192.168.5.200:8000"       │
          │◄─────────────────────────────────►│
          │                                   │
          │ CORS: ✅ "192.168.5.200:3000"     │
          │       có trong whitelist          │
          │                                   │
          │ WebSocket: ✅ Không bị chặn       │
          │            (mạng nội bộ)          │
          │                                   │
     ✅ KẾT NỐI THÀNH CÔNG!
     ✅ Toast hiện ra!
     ✅ Chuông cập nhật số!
```

#### ❌ LỖI TRÊN SERVER

```
┌─────────────────────┐                    ┌──────────────────┐
│  User's Browser     │                    │  Server          │
│  (Truy cập từ xa)   │                    │  Domain:         │
│  Domain: ???        │                    │  api.bvdkphutho  │
│                     │                    │  .io.vn:778      │
└──────────┬──────────┘                    └─────────┬────────┘
           │                                         │
           │ ❌ VẤN ĐỀ 1: Frontend không biết      │
           │    domain của mình                     │
           │    → SOCKET_URL sai?                   │
           │                                         │
           │ ❌ VẤN ĐỀ 2: CORS không có             │
           │    domain frontend trong whitelist     │
           │                                         │
           │ ❌ VẤN ĐỀ 3: .env không đúng           │
           │    REACT_APP_BACKEND_API có "/"        │
           │    thừa → derive sai URL               │
           │                                         │
           │ Kết nối request...                     │
           ├────────────────────────────────────────►│
           │                                         │
           │                          ❌ CORS Error!│
           │◄────────────────────────────────────────│
           │  "Origin not allowed"                  │
           │                                         │
     ❌ KHÔNG KẾT NỐI ĐƯỢC!
     ❌ Không có toast!
     ❌ Chuông không cập nhật!

     ℹ️  NHƯNG click chuông thì vẫn thấy thông báo
         → Vì API REST (fetch data) vẫn hoạt động
         → Chỉ Socket real-time bị lỗi!
```

---

## 4️⃣ VẤN ĐỀ HIỆN TẠI

### 🔍 Phân tích lỗi

```
┌────────────────────────────────────────────────────────────────┐
│  TẠI SAO LAN ĐƯỢC MÀ SERVER KHÔNG?                            │
└────────────────────────────────────────────────────────────────┘

LAN (Local):
✅ URL rõ ràng: http://192.168.5.200:8000
✅ CORS có IP trong whitelist
✅ Không có proxy/firewall chặn
✅ Network trực tiếp
───────────────────────────────────────────────────────────────
Server (Production):
❌ URL không rõ: Thiếu REACT_APP_SOCKET_URL
❌ CORS: Không có domain frontend trong whitelist
❌ Có thể có reverse proxy (Nginx) chưa config WebSocket
❌ Port trong .env khác port thực tế (8000 vs 778)
```

### 📋 Checklist vấn đề cụ thể

| #   | Vấn đề                       | File                              | Hiện trạng     |
| --- | ---------------------------- | --------------------------------- | -------------- |
| 1   | Thiếu `REACT_APP_SOCKET_URL` | `fe-bcgiaobanbvt/.env.production` | ❌ Chưa có     |
| 2   | URL API có "/" thừa          | `fe-bcgiaobanbvt/.env.production` | ❌ `.../api/`  |
| 3   | Thiếu `CORS_ORIGINS`         | `giaobanbv-be/.env`               | ❌ Chưa có     |
| 4   | PORT không khớp              | `giaobanbv-be/.env`               | ❌ 8000 vs 778 |
| 5   | Reverse proxy chưa config    | Nginx config                      | ❓ Chưa rõ     |

---

## 5️⃣ HƯỚNG DẪN CẤU HÌNH TỪNG BƯỚC

### 📝 Chuẩn bị

**Thông tin cần thiết** (Bạn cần xác định):

1. **Domain/URL frontend thật sự** (người dùng truy cập qua đâu?)
   - Ví dụ: `http://bvdkphutho.io.vn:8443`
   - Hoặc: `https://bvdktphutho.net`
2. **Domain/IP + Port backend trên server**
   - Hiện tại: `http://api.bvdkphutho.io.vn:778`
3. **Có dùng Nginx/Apache không?**
   - Nếu có: Cần config WebSocket proxy

---

### 🔧 BƯỚC 1: Cấu hình Frontend

#### 1.1. Sửa file `.env.production`

**Đường dẫn:** `fe-bcgiaobanbvt/.env.production`

```bash
# ❌ CŨ (có lỗi):
REACT_APP_BACKEND_API="http://api.bvdkphutho.io.vn:778/api/"
#                                                          ^^^ Xóa dấu / này!

# ✅ MỚI (sửa lại):
REACT_APP_BACKEND_API=http://api.bvdkphutho.io.vn:778/api

# ✅ THÊM dòng này (quan trọng!):
REACT_APP_SOCKET_URL=http://api.bvdkphutho.io.vn:778

# Giữ nguyên các dòng khác:
REACT_APP_CLOUDINARY_CLOUD_NAME=dserfogzu
REACT_APP_CLOUDINARY_UPLOAD_PRESET=bvdktpt2023
REACT_APP_VERSION=0.1.0
```

**Giải thích:**

- `REACT_APP_BACKEND_API`: URL cho các API REST (fetch data)
- `REACT_APP_SOCKET_URL`: URL riêng cho Socket.io connection
- Không có "/" cuối để tránh parse lỗi

#### 1.2. Build lại frontend

```bash
# Chạy trong thư mục frontend:
cd d:\project\webBV\fe-bcgiaobanbvt

# Build production (sẽ dùng .env.production):
npm run build

# Kết quả: Thư mục build/ chứa file static
```

#### 1.3. Deploy file build lên server

```bash
# Copy thư mục build/ lên server
# (Tùy cách bạn deploy: FTP, SCP, Git, v.v.)

# Ví dụ dùng SCP:
scp -r build/* user@server:/var/www/hospital-app/
```

---

### 🔧 BƯỚC 2: Cấu hình Backend

#### 2.1. Tạo/Sửa file `.env` trên server

**⚠️ CHÚ Ý:** File này ở **TRÊN SERVER**, không phải máy local!

```bash
# SSH vào server:
ssh user@api.bvdkphutho.io.vn

# Di chuyển đến thư mục backend:
cd /path/to/giaobanbv-be

# Sửa file .env:
nano .env
```

**Nội dung file `.env` (trên server):**

```bash
# ✅ PORT phải khớp với URL thực tế
PORT=778

# ✅ MongoDB URI trên server (không phải localhost!)
MONGODB_URI=mongodb://localhost:27017/giaoban_bvt
# Hoặc nếu MongoDB ở máy khác:
# MONGODB_URI=mongodb://192.168.x.x:27017/giaoban_bvt

# ✅ JWT Secret (dùng secret mạnh cho production!)
JWT_SECRET_KEY=your_strong_secret_key_here_change_this

# ✅ CORS Origins (QUAN TRỌNG!)
# Liệt kê TẤT CẢ domain frontend có thể truy cập:
CORS_ORIGINS=http://bvdkphutho.io.vn:8443,https://bvdkphutho.io.vn,http://bvdktphutho.net,https://bvdktphutho.net

# ⚠️ Chú ý:
# - Không có khoảng trắng trước/sau dấu phẩy
# - Bao gồm cả http và https nếu hỗ trợ cả 2
# - Bao gồm cả với/không port nếu cần
```

**Giải thích:**

- `PORT=778`: Backend lắng nghe ở port 778 (khớp với URL API)
- `CORS_ORIGINS`: Danh sách domain frontend được phép kết nối
  - Ngăn chặn các domain khác kết nối vào backend
  - Phải liệt kê đầy đủ, chính xác (http/https, có/không port)

#### 2.2. Restart backend

```bash
# Nếu dùng PM2:
pm2 restart hospital-backend

# Hoặc nếu chạy trực tiếp:
npm start

# Hoặc với nodemon (dev):
npm run dev
```

#### 2.3. Kiểm tra backend đã chạy

```bash
# Kiểm tra process:
pm2 list
# hoặc:
ps aux | grep node

# Kiểm tra port:
netstat -tuln | grep 778

# Kiểm tra log:
pm2 logs
# hoặc:
tail -f /path/to/logs/app.log
```

---

### 🔧 BƯỚC 3: Cấu hình Reverse Proxy (Nếu có)

**❓ Làm sao biết có dùng Nginx/Apache?**

```bash
# Kiểm tra Nginx:
nginx -v
# hoặc:
systemctl status nginx

# Kiểm tra Apache:
apache2 -v
# hoặc:
systemctl status apache2
```

#### 3.1. Cấu hình Nginx cho WebSocket

**Tại sao cần?** Nginx mặc định không forward WebSocket, cần config đặc biệt.

**File config:** `/etc/nginx/sites-available/hospital-backend`

```nginx
# Backend API + Socket.io
server {
    listen 778;
    server_name api.bvdkphutho.io.vn;

    location / {
        # Proxy đến Node.js backend
        proxy_pass http://localhost:8000;  # ← Backend chạy local port 8000

        # Headers cơ bản
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ✅ QUAN TRỌNG: Headers cho WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout cho long-running connections
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Giải thích:**

```
User → Nginx (port 778) → Node.js (port 8000)
                ▲
                │
         WebSocket upgrade
         nhờ headers đặc biệt
```

**Apply config:**

```bash
# Kiểm tra syntax:
sudo nginx -t

# Nếu OK, reload:
sudo systemctl reload nginx

# Hoặc restart:
sudo systemctl restart nginx
```

#### 3.2. Cấu hình Frontend với Nginx (Nếu cần)

**File config:** `/etc/nginx/sites-available/hospital-frontend`

```nginx
server {
    listen 8443;
    server_name bvdkphutho.io.vn;

    # Thư mục chứa file build của React
    root /var/www/hospital-app;
    index index.html;

    # React Router: Mọi route đều trả về index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### 🔧 BƯỚC 4: Xác minh cấu hình

#### 4.1. Kiểm tra file .env

```bash
# Frontend (máy local - trước khi build):
cd d:\project\webBV\fe-bcgiaobanbvt
cat .env.production

# Kiểm tra:
# ✅ REACT_APP_SOCKET_URL có đúng không?
# ✅ REACT_APP_BACKEND_API không có "/" thừa?

# Backend (trên server):
ssh user@server
cd /path/to/giaobanbv-be
cat .env

# Kiểm tra:
# ✅ PORT=778?
# ✅ CORS_ORIGINS có domain frontend?
```

#### 4.2. Test kết nối từ browser

**Mở DevTools trong trình duyệt** (F12):

**Tab Console:**

```javascript
// Kiểm tra biến môi trường (trong React app):
console.log(process.env.REACT_APP_SOCKET_URL);
// ✅ Phải ra: http://api.bvdkphutho.io.vn:778

// Kiểm tra socket connection:
// ✅ Phải thấy: [Socket] Connecting to: http://api...
// ✅ Phải thấy: [Socket] Connected! ID: xyz123
```

**Tab Network:**

```
1. Filter: WS (WebSocket)
2. Tìm connection đến backend:
   ✅ Status: 101 Switching Protocols (thành công)
   ❌ Status: 4xx/5xx (lỗi)
3. Click vào connection → Headers:
   ✅ Request URL: đúng domain + port
   ✅ Status Code: 101
```

**Tab Console - Kiểm tra lỗi:**

```
❌ Nếu thấy:
   "CORS error" → Backend CORS_ORIGINS chưa đúng
   "Failed to connect" → URL sai hoặc backend chưa chạy
   "WebSocket handshake failed" → Nginx chưa config
```

---

## 6️⃣ KIỂM TRA VÀ XỬ LÝ SỰ CỐ

### 🧪 Test từng bước

#### Test 1: Backend có chạy không?

```bash
# Trên server:
curl http://localhost:778/api/health
# hoặc:
curl http://localhost:778

# ✅ Phải trả về dữ liệu (không phải "Connection refused")
```

#### Test 2: CORS có hoạt động không?

```bash
# Từ máy local, test CORS:
curl -H "Origin: http://bvdkphutho.io.vn:8443" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://api.bvdkphutho.io.vn:778/api/users

# Kiểm tra response headers:
# ✅ Phải có: Access-Control-Allow-Origin: ...
# ✅ Không có "CORS error"
```

#### Test 3: Socket.io có khả dụng không?

**Mở trình duyệt, vào Console:**

```javascript
// Test kết nối Socket.io thủ công:
const io = window.io || require("socket.io-client");
const socket = io("http://api.bvdkphutho.io.vn:778", {
  auth: { token: "YOUR_JWT_TOKEN" }, // Lấy từ localStorage
});

socket.on("connect", () => {
  console.log("✅ Connected! ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ Error:", err.message);
});
```

#### Test 4: Gửi thông báo thử nghiệm

**Từ backend console hoặc tạo API test:**

```javascript
// Trong backend code, tạo route test:
// routes/test.js

router.post("/test-notification", async (req, res) => {
  const userId = req.body.userId; // User ID để test

  await notificationService.send({
    type: "TEST",
    recipientIds: [userId],
    data: { message: "Test thông báo!" },
  });

  res.json({ success: true });
});

// Gọi API này để test:
// POST http://api.bvdkphutho.io.vn:778/api/test-notification
// Body: { "userId": "64f3cb6035c717ab00d75b8b" }
```

---

### 🐛 Xử lý các lỗi thường gặp

#### Lỗi 1: "CORS policy: No 'Access-Control-Allow-Origin' header"

```
┌──────────────────────────────────────────────┐
│  NGUYÊN NHÂN:                                │
│  Backend không cho phép origin của frontend  │
└──────────────────────────────────────────────┘

✅ GIẢI PHÁP:
1. Xác định domain frontend chính xác:
   - Mở trình duyệt, vào tab Network
   - Xem "Request Headers" → "Origin: ..."
   - Copy chính xác domain đó

2. Thêm vào CORS_ORIGINS trong backend .env:
   CORS_ORIGINS=http://exact-domain.com:port,...

3. Restart backend

4. Hard refresh trình duyệt (Ctrl + Shift + R)
```

#### Lỗi 2: "WebSocket connection failed"

```
┌──────────────────────────────────────────────┐
│  NGUYÊN NHÂN:                                │
│  - URL sai                                   │
│  - Nginx chưa config WebSocket               │
│  - Firewall chặn                             │
└──────────────────────────────────────────────┘

✅ GIẢI PHÁP:
1. Kiểm tra URL trong Console:
   console.log(process.env.REACT_APP_SOCKET_URL)
   → Phải đúng domain + port

2. Nếu dùng Nginx, kiểm tra config:
   sudo nano /etc/nginx/sites-available/...
   → Phải có "Upgrade" và "Connection" headers

3. Test Nginx config:
   sudo nginx -t
   sudo systemctl reload nginx

4. Kiểm tra firewall:
   sudo ufw status
   → Port 778 phải được allow
```

#### Lỗi 3: "Socket connected nhưng không nhận được thông báo"

```
┌──────────────────────────────────────────────┐
│  NGUYÊN NHÂN:                                │
│  - Event listener chưa đăng ký               │
│  - Backend gửi đến sai user ID               │
│  - Room join failed                          │
└──────────────────────────────────────────────┘

✅ GIẢI PHÁP:
1. Kiểm tra backend logs:
   pm2 logs
   → Xem có "[NotificationService] Emitting..." không?
   → User ID có đúng không?

2. Kiểm tra frontend Console:
   → Có log "[Socket] Connected" không?
   → Có đăng ký listener "notification:new" không?

3. Test emit thủ công từ backend console:
   socketService.emitToUser(
     'USER_ID',
     'notification:new',
     { notification: { title: 'Test' } }
   );

4. Kiểm tra Redux DevTools:
   → Action "addNotification" có được dispatch không?
```

#### Lỗi 4: "Toast không hiện ra"

```
┌──────────────────────────────────────────────┐
│  NGUYÊN NHÂN:                                │
│  - ToastContainer chưa render                │
│  - CSS của react-toastify chưa import        │
└──────────────────────────────────────────────┘

✅ GIẢI PHÁP:
1. Kiểm tra App.js có <ToastContainer />:
   import { ToastContainer } from 'react-toastify';
   import 'react-toastify/dist/ReactToastify.css';

   <ToastContainer position="top-right" />

2. Kiểm tra listener có gọi toast.info():
   on("notification:new", (data) => {
     console.log('Received notification:', data);  // Debug
     toast.info(data.notification.title);
   });

3. Test toast thủ công:
   import { toast } from 'react-toastify';
   toast.info('Test message');
```

---

### 📊 Debug Checklist

Copy bảng này để kiểm tra từng mục:

```
Frontend (.env.production):
□ REACT_APP_SOCKET_URL có đúng domain + port
□ REACT_APP_BACKEND_API không có "/" thừa
□ Build lại sau khi đổi .env (npm run build)
□ Deploy thư mục build/ lên server

Backend (.env trên server):
□ PORT khớp với URL API (778)
□ CORS_ORIGINS có đầy đủ domain frontend
□ JWT_SECRET_KEY đủ mạnh
□ MONGODB_URI đúng (không phải localhost nếu DB ở máy khác)
□ Restart backend sau khi đổi .env

Nginx (nếu có):
□ Config có Upgrade và Connection headers
□ nginx -t không báo lỗi
□ Reload/restart Nginx

Network:
□ Firewall allow port 778
□ DNS resolve đúng domain
□ Ping được server từ máy client

Browser (DevTools):
□ Console: [Socket] Connected!
□ Network: WebSocket status 101
□ Không có CORS error
□ Nhận được event "notification:new"

Test thực tế:
□ Tạo công việc mới → Toast hiện ra
□ Quả chuông cập nhật số
□ Click thông báo → Navigate đúng
```

---

## 📚 TÀI LIỆU THAM KHẢO

### 📖 Đọc thêm về các khái niệm

1. **WebSocket:**

   - https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
   - Giao thức truyền thông 2 chiều

2. **Socket.io:**

   - https://socket.io/docs/v4/
   - Client API: https://socket.io/docs/v4/client-api/
   - Server API: https://socket.io/docs/v4/server-api/

3. **CORS:**

   - https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
   - Hiểu về Cross-Origin Resource Sharing

4. **Nginx WebSocket Proxy:**
   - https://nginx.org/en/docs/http/websocket.html
   - Cấu hình reverse proxy cho WebSocket

### 🔧 Tools hữu ích

1. **Postman:** Test REST API
2. **Insomnia:** Test REST + WebSocket
3. **Browser DevTools:** Debug frontend
4. **PM2:** Quản lý Node.js process
5. **PM2 Logs:** `pm2 logs` để xem real-time logs

---

## ✅ TÓM TẮT NHANH

### 3 điều QUAN TRỌNG NHẤT:

```
1. SOCKET_URL: Frontend phải biết chính xác địa chỉ backend
   → Thêm REACT_APP_SOCKET_URL vào .env.production

2. CORS: Backend phải cho phép domain frontend
   → Thêm CORS_ORIGINS với domain chính xác

3. WebSocket Proxy: Nginx phải forward WebSocket
   → Config Upgrade và Connection headers
```

### Quy trình tổng quát:

```
1. Sửa .env.production (frontend) → Build → Deploy
2. Sửa .env (backend trên server) → Restart
3. Config Nginx (nếu có) → Reload
4. Test trong browser DevTools
5. Xử lý lỗi nếu có theo bảng Debug
```

---

## 🎯 KẾT LUẬN

Hệ thống thông báo real-time của bạn hoạt động dựa trên **Socket.io + WebSocket**.

**Trên LAN thành công** vì:

- ✅ URL rõ ràng (192.168.x.x:port)
- ✅ CORS có IP trong whitelist
- ✅ Kết nối trực tiếp không qua proxy

**Trên server thất bại** vì:

1. ❌ Thiếu cấu hình URL chính xác (REACT_APP_SOCKET_URL)
2. ❌ CORS chưa bao gồm domain frontend
3. ❌ Có thể Nginx chưa config WebSocket

**Giải pháp:**

- Làm theo từng bước ở **Phần 5** (Hướng dẫn cấu hình)
- Kiểm tra từng mục trong **Debug Checklist**
- Xem logs để debug chính xác

**Quan trọng nhất:** Kiểm tra Browser DevTools (F12) để xem lỗi cụ thể!

---

**📅 Tài liệu được tạo:** January 7, 2026  
**🔄 Phiên bản:** 1.0  
**📝 Ghi chú:** Cập nhật khi có thay đổi về cấu hình server hoặc domain
