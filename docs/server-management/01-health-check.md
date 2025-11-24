# 🔍 Health Check - Kiểm Tra Tình Trạng Hệ Thống

> **Mục đích:** Kiểm tra nhanh tình trạng server, PM2 apps, và MongoDB  
> **Thời gian:** 2-5 phút  
> **Tần suất:** Hàng ngày hoặc khi nghi ngờ có vấn đề

---

## 📋 **MỤC LỤC**

1. [Quick Health Check (30 giây)](#quick-health-check)
2. [Kiểm Tra Server](#kiểm-tra-server)
3. [Kiểm Tra PM2 Backend](#kiểm-tra-pm2-backend)
4. [Kiểm Tra MongoDB](#kiểm-tra-mongodb)
5. [Kiểm Tra Network & Ports](#kiểm-tra-network--ports)
6. [Kiểm Tra API Endpoints](#kiểm-tra-api-endpoints)
7. [Script Tự Động](#script-tự-động)

---

## ⚡ **QUICK HEALTH CHECK**

### **Chạy 1 lệnh để kiểm tra tất cả:**

```bash
~/giaobanbv-be/docs/server-management/scripts/check-system.sh
```

**Output mong đợi:**

```
==========================================
🔍 KIỂM TRA HỆ THỐNG - Sat Nov 16 10:30:00 2025
==========================================

📊 THÔNG TIN SERVER:
--------------------
Uptime: up 15 days, 3 hours, 42 minutes
OS: Ubuntu 22.04.3 LTS
CPU: Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz

💾 TÀI NGUYÊN:
--------------------
Mem:           7.8Gi       2.1Gi       3.2Gi
Swap:          2.0Gi       0.0Gi       2.0Gi
Disk Usage: 25G / 100G (26%)

🚀 SERVICES STATUS:
--------------------
✅ Backend (PM2): Running
✅ MongoDB: Running

🌐 NETWORK & PORTS:
--------------------
✅ Port 3000 (Backend): Open
✅ Port 27017 (MongoDB): Open

🏥 HEALTH CHECK:
--------------------
✅ Backend API: Healthy
==========================================
✅ Kiểm tra hoàn tất!
==========================================
```

---

## 🖥️ **KIỂM TRA SERVER**

### **1. Uptime (Server chạy được bao lâu)**

```bash
uptime
```

**Output:**

```
10:30:15 up 15 days,  3:42,  2 users,  load average: 0.52, 0.58, 0.59
```

**Giải thích:**

- `up 15 days, 3:42` - Server đã chạy 15 ngày 3 giờ 42 phút
- `2 users` - Có 2 users đang login (SSH sessions)
- `load average: 0.52, 0.58, 0.59` - CPU load 1/5/15 phút
  - **Tốt:** < số CPU cores
  - **Cảnh báo:** > số CPU cores
  - Check số cores: `nproc`

---

### **2. OS Version**

```bash
cat /etc/os-release | grep PRETTY_NAME
```

**Output:**

```
PRETTY_NAME="Ubuntu 22.04.3 LTS"
```

---

### **3. CPU Info**

```bash
# Xem tổng quan
lscpu | grep -E "Model name|CPU\(s\):|Thread"

# Hoặc chi tiết hơn
cat /proc/cpuinfo | grep "model name" | head -1
```

**Output:**

```
Model name:          Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz
CPU(s):              4
Thread(s) per core:  2
```

---

### **4. Memory (RAM)**

```bash
free -h
```

**Output:**

```
               total        used        free      shared  buff/cache   available
Mem:           7.8Gi       2.1Gi       3.2Gi       128Mi       2.5Gi       5.4Gi
Swap:          2.0Gi          0B       2.0Gi
```

**Giải thích:**

- `Mem total: 7.8Gi` - Tổng RAM
- `Mem used: 2.1Gi` - RAM đang dùng (27%)
- `Mem available: 5.4Gi` - RAM khả dụng (69%)
- `Swap: 0B` - Chưa dùng swap (tốt!)

**⚠️ Cảnh báo khi:**

- `available` < 500MB → Sắp hết RAM
- `Swap used` > 0 → Đang dùng swap (chậm)

---

### **5. Disk Space**

```bash
df -h
```

**Output:**

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        99G   25G   70G  26% /
/dev/sda2        50G   15G   33G  32% /home
```

**Giải thích:**

- `/` (root): Dùng 25G/99G (26%) - OK
- `/home`: Dùng 15G/50G (32%) - OK

**⚠️ Cảnh báo khi:**

- Use% > 80% → Sắp đầy
- Use% > 90% → GẤP: Phải xóa files

**Check thư mục nào chiếm nhiều:**

```bash
sudo du -sh /* 2>/dev/null | sort -hr | head -10
```

---

### **6. Network Connectivity**

```bash
# Ping Google DNS
ping -c 3 8.8.8.8

# Check DNS resolution
nslookup google.com
```

**Output tốt:**

```
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=1.23 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=117 time=1.19 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=117 time=1.25 ms

--- 8.8.8.8 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
```

---

## 🚀 **KIỂM TRA PM2 BACKEND**

### **1. PM2 Status**

```bash
pm2 status
```

**Output tốt:**

```
┌─────┬──────────────────┬─────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name             │ mode    │ ↺       │ status  │ cpu      │ memory │
├─────┼──────────────────┼─────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ giaobanbv-be     │ fork    │ 15      │ online  │ 0.3%     │ 145MB  │
└─────┴──────────────────┴─────────┴─────────┴─────────┴──────────┴────────┘
```

**Giải thích:**

- `status: online` ✅ - App đang chạy
- `↺: 15` - Đã restart 15 lần (bình thường nếu uptime lâu)
- `cpu: 0.3%` - CPU usage thấp (tốt)
- `memory: 145MB` - RAM usage (tùy app)

**⚠️ Cảnh báo khi:**

- `status: stopped` 🔴 - App đã dừng
- `status: errored` 🔴 - App bị lỗi
- `↺` tăng liên tục - App crash liên tục
- `cpu > 80%` - CPU cao bất thường
- `memory` tăng dần không ngừng - Memory leak

---

### **2. PM2 Info Chi Tiết**

```bash
pm2 info giaobanbv-be
```

**Output:**

```
 Describing process with id 0 - name giaobanbv-be
┌───────────────────┬──────────────────────────────────────┐
│ status            │ online                                │
│ name              │ giaobanbv-be                          │
│ version           │ 1.0.0                                 │
│ restarts          │ 15                                    │
│ uptime            │ 15D                                   │
│ script path       │ /home/user/giaobanbv-be/app.js       │
│ script args       │ N/A                                   │
│ error log path    │ ~/.pm2/logs/giaobanbv-be-error.log   │
│ out log path      │ ~/.pm2/logs/giaobanbv-be-out.log     │
│ pid path          │ ~/.pm2/pids/giaobanbv-be-0.pid       │
│ interpreter       │ node                                  │
│ interpreter args  │ N/A                                   │
│ script id         │ 0                                     │
│ exec cwd          │ /home/user/giaobanbv-be              │
│ exec mode         │ fork_mode                             │
│ node.js version   │ 18.17.0                               │
│ node env          │ production                            │
│ watch & reload    │ ✘                                     │
│ unstable restarts │ 0                                     │
│ created at        │ 2025-11-01T02:15:30.123Z             │
└───────────────────┴──────────────────────────────────────┘
```

**Check các điểm:**

- ✅ `status: online`
- ✅ `uptime: 15D` (lâu = ổn định)
- ✅ `unstable restarts: 0` (không crash gần đây)
- ✅ `node env: production`

---

### **3. PM2 Monitoring Realtime**

```bash
pm2 monit
```

**Output:** Interactive dashboard

```
┌─ Process list ────────────────────┐┌─ Global Logs ─────────────────┐
│[ 0] giaobanbv-be    Mem: 145 MB   ││                                │
│                     CPU: 0.3 %    ││ PM2      | [2025-11-16 10:30] │
│                                    ││          | App started        │
└────────────────────────────────────┘└────────────────────────────────┘
┌─ Custom metrics ──────────────────┐┌─ Metadata ────────────────────┐
│ Heap Size              52.1 MB    ││ App Name       giaobanbv-be   │
│ Heap Usage             65.3 %     ││ Version        1.0.0          │
│ Used Heap Size         34.1 MB    ││ Restarts       15             │
│ Active requests        0          ││ Uptime         15D            │
│ Active handles         4          ││ Script         app.js         │
└────────────────────────────────────┘└────────────────────────────────┘
```

**Nhấn `Ctrl+C` để thoát**

---

### **4. Xem Logs Nhanh**

```bash
# Xem 50 dòng logs gần nhất
pm2 logs giaobanbv-be --lines 50

# Chỉ xem errors
pm2 logs giaobanbv-be --err --lines 20

# Realtime logs
pm2 logs giaobanbv-be
# Nhấn Ctrl+C để dừng
```

---

## 🗄️ **KIỂM TRA MONGODB**

### **1. MongoDB Service Status**

```bash
sudo systemctl status mongod
```

**Output tốt:**

```
● mongod.service - MongoDB Database Server
     Loaded: loaded (/lib/systemd/system/mongod.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2025-11-01 02:15:00 UTC; 2 weeks 1 days ago
       Docs: https://docs.mongodb.org/manual
   Main PID: 12345 (mongod)
     Memory: 512.5M
        CPU: 3h 25min 12.345s
     CGroup: /system.slice/mongod.service
             └─12345 /usr/bin/mongod --config /etc/mongod.conf

Nov 01 02:15:00 server systemd[1]: Started MongoDB Database Server.
Nov 01 02:15:00 server mongod[12345]: {"t":{"$date":"2025-11-01T02:15:00.123Z"},"s":"I",  "c":"CONTROL",  "id":23285, ...
```

**Giải thích:**

- `Active: active (running)` ✅ - Đang chạy
- `since Mon 2025-11-01` - Uptime 15 ngày
- `Memory: 512.5M` - RAM usage
- `enabled` - Auto-start khi boot

**⚠️ Nếu thấy `Active: inactive (dead)` → MongoDB đã stopped!**

---

### **2. Kết Nối MongoDB Shell**

```bash
mongosh
```

**Output tốt:**

```
Current Mongosh Log ID: 654abc123def456789012345
Connecting to:          mongodb://127.0.0.1:27017/?directConnection=true
Using MongoDB:          7.0.2
Using Mongosh:          2.0.1

For mongosh info see: https://docs.mongodb.com/mongodb-shell/

test>
```

**Các lệnh test trong mongo shell:**

```javascript
// 1. Kiểm tra server hoạt động
db.adminCommand('ping')
// Output: { ok: 1 }

// 2. Show databases
show dbs
// Output:
// admin          40.00 KiB
// config         72.00 KiB
// giaobanbv      1.25 GiB
// local          80.00 KiB

// 3. Chuyển sang database của app
use giaobanbv

// 4. Xem collections
show collections
// Output:
// nhanvien
// congviec
// binhluan
// ...

// 5. Đếm số documents trong collection
db.nhanvien.countDocuments()
// Output: 150

// 6. Xem 1 document mẫu
db.nhanvien.findOne()

// 7. Thoát
exit
```

---

### **3. Kiểm Tra MongoDB từ Command Line**

```bash
# Ping MongoDB
mongosh --eval "db.adminCommand('ping')"

# Xem databases
mongosh --eval "db.adminCommand('listDatabases')"

# Xem server status
mongosh --eval "db.serverStatus().connections"

# Output:
# {
#   current: 5,
#   available: 51195,
#   totalCreated: 234
# }
```

---

### **4. Kiểm Tra MongoDB Log**

```bash
# Xem 20 dòng cuối
sudo tail -20 /var/log/mongodb/mongod.log

# Xem realtime
sudo tail -f /var/log/mongodb/mongod.log
# Nhấn Ctrl+C để dừng

# Tìm errors
sudo grep -i error /var/log/mongodb/mongod.log | tail -10

# Tìm warnings
sudo grep -i warning /var/log/mongodb/mongod.log | tail -10
```

---

## 🌐 **KIỂM TRA NETWORK & PORTS**

### **1. Xem Ports Đang Listen**

```bash
sudo netstat -tlnp | grep -E '3000|27017'
```

**Output tốt:**

```
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      12345/node
tcp        0      0 127.0.0.1:27017         0.0.0.0:*               LISTEN      67890/mongod
```

**Giải thích:**

- Port **3000** - Backend Node.js
  - `0.0.0.0:3000` - Listen tất cả interfaces (OK nếu muốn access từ ngoài)
  - Process: node
- Port **27017** - MongoDB
  - `127.0.0.1:27017` ✅ - Chỉ listen localhost (BẢO MẬT)
  - `0.0.0.0:27017` ⚠️ - Listen tất cả interfaces (NGUY HIỂM nếu không có auth!)

**⚠️ QUAN TRỌNG:** MongoDB nên chỉ bind `127.0.0.1` (localhost only)

---

### **2. Kiểm Tra Port Có Mở Không**

```bash
# Từ chính server
nc -zv localhost 3000
nc -zv localhost 27017

# Output tốt:
# Connection to localhost 3000 port [tcp/*] succeeded!
# Connection to localhost 27017 port [tcp/*] succeeded!
```

---

### **3. Kiểm Tra Firewall**

```bash
sudo ufw status
```

**Output mẫu:**

```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
3000/tcp                   ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
3000/tcp (v6)              ALLOW       Anywhere (v6)
```

**⚠️ QUAN TRỌNG:**

- Port 27017 KHÔNG NÊN có trong firewall rules (MongoDB chỉ internal)
- Nếu thấy `27017  ALLOW  Anywhere` → NGUY HIỂM!

---

## 🔗 **KIỂM TRA API ENDPOINTS**

### **1. Health Check Endpoint**

```bash
curl http://localhost:3000/api/health
```

**Output tốt:**

```json
{
  "status": "OK",
  "timestamp": "2025-11-16T10:30:00.123Z",
  "uptime": 1312345,
  "database": "connected"
}
```

**Với HTTP status code:**

```bash
curl -i http://localhost:3000/api/health
```

**Output:**

```
HTTP/1.1 200 OK
Content-Type: application/json
...

{"status":"OK",...}
```

---

### **2. Test Từ Bên Ngoài (Nếu Có Domain)**

```bash
# Thay your-domain.com bằng domain thật
curl https://your-domain.com/api/health

# Hoặc test với IP public
curl http://YOUR_SERVER_IP:3000/api/health
```

---

### **3. Kiểm Tra Response Time**

```bash
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/health
```

**Output:**

```json
{"status":"OK",...}
Time: 0.045s
```

**Đánh giá:**

- < 0.1s: Tốt ✅
- 0.1s - 0.5s: Chấp nhận được 🟡
- > 0.5s: Chậm ⚠️
- > 2s: Có vấn đề 🔴

---

## 📜 **SCRIPT TỰ ĐỘNG**

### **Script: `check-system.sh`**

Đã tạo script all-in-one tại: `~/giaobanbv-be/docs/server-management/scripts/check-system.sh`

**Cách dùng:**

```bash
# 1. Đảm bảo script có quyền execute
chmod +x ~/giaobanbv-be/docs/server-management/scripts/check-system.sh

# 2. Chạy
~/giaobanbv-be/docs/server-management/scripts/check-system.sh

# 3. Hoặc tạo alias cho tiện
echo "alias health-check='~/giaobanbv-be/docs/server-management/scripts/check-system.sh'" >> ~/.bashrc
source ~/.bashrc

# Sau đó chỉ cần gõ:
health-check
```

---

## 📊 **BẢNG ĐÁNH GIÁ NHANH**

| Thành phần        | Lệnh check                       | Trạng thái tốt   | Cảnh báo          |
| ----------------- | -------------------------------- | ---------------- | ----------------- |
| **Server Uptime** | `uptime`                         | Load < số cores  | Load > số cores   |
| **RAM**           | `free -h`                        | Available > 1GB  | Available < 500MB |
| **Disk**          | `df -h`                          | Use% < 80%       | Use% > 90%        |
| **PM2**           | `pm2 status`                     | status: online   | status: errored   |
| **MongoDB**       | `systemctl status mongod`        | active (running) | inactive (dead)   |
| **Port 3000**     | `nc -zv localhost 3000`          | succeeded        | failed            |
| **Port 27017**    | `nc -zv localhost 27017`         | succeeded        | failed            |
| **API**           | `curl localhost:3000/api/health` | HTTP 200         | HTTP 500/timeout  |

---

## ✅ **CHECKLIST DAILY HEALTH CHECK**

Copy checklist này và thực hiện hàng ngày:

```bash
# ══════════════════════════════════════════════
# DAILY HEALTH CHECK CHECKLIST
# ══════════════════════════════════════════════

# 1️⃣ PM2 Backend
echo "1. Kiểm tra PM2..."
pm2 status
# ✅ Status phải là "online"

# 2️⃣ MongoDB
echo "2. Kiểm tra MongoDB..."
sudo systemctl status mongod | grep Active
# ✅ Phải thấy "active (running)"

# 3️⃣ Disk Space
echo "3. Kiểm tra Disk..."
df -h / | grep -v Filesystem
# ✅ Use% phải < 80%

# 4️⃣ Memory
echo "4. Kiểm tra Memory..."
free -h | grep Mem
# ✅ available > 500MB

# 5️⃣ API Health
echo "5. Kiểm tra API..."
curl -s http://localhost:3000/api/health | grep status
# ✅ Phải thấy "status":"OK"

# 6️⃣ Recent Errors
echo "6. Kiểm tra Errors gần đây..."
pm2 logs giaobanbv-be --err --lines 5

echo "✅ Daily check completed!"
```

**Lưu thành alias:**

```bash
# Thêm vào ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# Daily health check
alias daily-check='
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
echo "📋 DAILY HEALTH CHECK - $(date)";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
echo "1️⃣ PM2 Status:"; pm2 status;
echo "2️⃣ MongoDB:"; sudo systemctl is-active mongod;
echo "3️⃣ Disk:"; df -h / | grep -v Filesystem;
echo "4️⃣ Memory:"; free -h | grep Mem;
echo "5️⃣ API:"; curl -s http://localhost:3000/api/health;
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
echo "✅ Check completed!";
'
EOF

source ~/.bashrc
```

Sau đó chỉ cần gõ: `daily-check`

---

## 🆘 **KHI CÓ VẤN ĐỀ**

Nếu health check phát hiện vấn đề:

1. **PM2 app stopped/errored:**

   - Xem [03-pm2-management.md](03-pm2-management.md)
   - Hoặc [09-troubleshooting.md](09-troubleshooting.md)

2. **MongoDB inactive:**

   - Xem [04-mongodb-management.md](04-mongodb-management.md)
   - Hoặc [09-troubleshooting.md](09-troubleshooting.md)

3. **Disk đầy:**

   - Xem [02-resource-monitoring.md](02-resource-monitoring.md)
   - Chạy `~/docs/server-management/scripts/cleanup-logs.sh`

4. **API không response:**
   - Check logs: `pm2 logs giaobanbv-be --err`
   - Restart: `pm2 restart giaobanbv-be`

---

## 📝 **GHI CHÚ**

- Chạy health check **mỗi ngày** ít nhất 1 lần
- Nếu có alert system, setup check tự động mỗi 5-10 phút
- Lưu output của health check để track trends
- Nếu thấy bất thường (CPU/RAM tăng đột ngột), investigate ngay

---

**⬅️ Quay lại:** [README](00-README.md)  
**➡️ Tiếp theo:** [Resource Monitoring](02-resource-monitoring.md)
