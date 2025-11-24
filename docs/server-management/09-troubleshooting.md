# ⚠️ Xử Lý Các Lỗi Thường Gặp

> **Mục đích:** Hướng dẫn xử lý các lỗi phổ biến khi vận hành hệ thống

---

## 📋 MỤC LỤC

1. [Lỗi PM2](#lỗi-pm2)
2. [Lỗi MongoDB](#lỗi-mongodb)
3. [Lỗi Hệ Thống](#lỗi-hệ-thống)
4. [Lỗi Ứng Dụng](#lỗi-ứng-dụng)

---

## 🚀 LỖI PM2

### **1. PM2 App Status: "errored"**

**Triệu chứng:**

```bash
pm2 status
# Status: errored (màu đỏ)
```

**Nguyên nhân thường gặp:**

1. Port 3000 đã được sử dụng
2. MongoDB connection failed
3. Missing environment variables
4. Syntax error trong code

**Cách xử lý:**

```bash
# Bước 1: Xem logs để tìm nguyên nhân
pm2 logs giaobanbv-be --err --lines 50

# Bước 2: Kiểm tra port
sudo netstat -tlnp | grep 3000
# Nếu port đã được dùng bởi process khác:
sudo kill -9 <PID>

# Bước 3: Kiểm tra MongoDB
mongosh --eval "db.adminCommand('ping')"

# Bước 4: Kiểm tra .env file
cat ~/giaobanbv-be/.env | grep -E "MONGODB_URI|PORT"

# Bước 5: Delete và start lại
pm2 delete giaobanbv-be
cd ~/giaobanbv-be
pm2 start ecosystem.config.js

# Bước 6: Xem logs realtime
pm2 logs giaobanbv-be
```

---

### **2. PM2 App Restart Liên Tục**

**Triệu chứng:**

```bash
pm2 list
# Cột "↺" tăng liên tục (10, 20, 30...)
```

**Nguyên nhân:**

- App crash ngay sau khi start
- Thường do lỗi khởi tạo (database connection, missing config, etc.)

**Cách xử lý:**

```bash
# Bước 1: Stop app tạm thời
pm2 stop giaobanbv-be

# Bước 2: Xem logs chi tiết
pm2 logs giaobanbv-be --err --lines 100

# Bước 3: Test run trực tiếp (không qua PM2)
cd ~/giaobanbv-be
node app.js
# Xem lỗi gì hiện ra

# Bước 4: Fix lỗi trong code

# Bước 5: Start lại
pm2 start giaobanbv-be
```

---

### **3. Error: EADDRINUSE (Port Already in Use)**

**Lỗi:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cách xử lý:**

```bash
# Tìm process đang dùng port 3000
sudo lsof -i :3000
# Hoặc
sudo netstat -tlnp | grep 3000

# Kill process
sudo kill -9 <PID>

# Hoặc kill tất cả node processes
pkill -9 node

# Start lại PM2
pm2 restart giaobanbv-be
```

---

### **4. PM2 Daemon Not Responding**

**Triệu chứng:**

```bash
pm2 list
# Timeout hoặc không response
```

**Cách xử lý:**

```bash
# Kill PM2 daemon
pm2 kill

# Resurrect apps từ saved list
pm2 resurrect

# Hoặc start lại từ đầu
cd ~/giaobanbv-be
pm2 start ecosystem.config.js
pm2 save
```

---

## 🗄️ LỖI MONGODB

### **1. MongoDB Không Start**

**Triệu chứng:**

```bash
sudo systemctl status mongod
# Active: inactive (dead)
```

**Cách xử lý:**

```bash
# Bước 1: Xem logs
sudo tail -50 /var/log/mongodb/mongod.log

# Bước 2: Kiểm tra các nguyên nhân phổ biến

# A. Port 27017 đã được dùng
sudo netstat -tlnp | grep 27017
# Nếu có process khác → kill nó

# B. Disk full
df -h
# Nếu > 95% → Xóa files không cần thiết

# C. Lock file tồn tại
ls -la /var/lib/mongodb/mongod.lock
# Nếu file này tồn tại VÀ MongoDB không chạy:
sudo rm /var/lib/mongodb/mongod.lock

# D. Permission issues
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock

# Bước 3: Start lại
sudo systemctl start mongod

# Bước 4: Kiểm tra
sudo systemctl status mongod
```

---

### **2. Connection Refused**

**Lỗi:**

```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**Cách xử lý:**

```bash
# Kiểm tra MongoDB có chạy không
sudo systemctl status mongod

# Nếu không chạy
sudo systemctl start mongod

# Kiểm tra bindIp
sudo cat /etc/mongod.conf | grep bindIp
# Nên thấy: bindIp: 127.0.0.1

# Kiểm tra port
sudo netstat -tlnp | grep 27017

# Test kết nối
mongosh
```

---

### **3. Authentication Failed**

**Lỗi:**

```
MongoServerError: Authentication failed
```

**Cách xử lý:**

```bash
# Kiểm tra username/password
mongosh -u giaobanbv_app -p --authenticationDatabase giaobanbv

# Nếu quên password, reset:
# 1. Tạm tắt auth
sudo nano /etc/mongod.conf
# Comment dòng: # authorization: enabled

sudo systemctl restart mongod

# 2. Đổi password
mongosh
use giaobanbv
db.changeUserPassword("giaobanbv_app", "new_password")
exit

# 3. Bật lại auth
sudo nano /etc/mongod.conf
# Uncomment: authorization: enabled

sudo systemctl restart mongod

# 4. Update connection string trong .env
nano ~/giaobanbv-be/.env
# Update MONGODB_URI với password mới

# 5. Restart app
pm2 restart giaobanbv-be
```

---

### **4. MongoDB Slow Queries**

**Triệu chứng:**

- App chậm
- Timeout errors

**Cách xử lý:**

```bash
# Bước 1: Enable profiling
mongosh
use giaobanbv
db.setProfilingLevel(1, { slowms: 100 })

# Bước 2: Xem slow queries
db.system.profile.find().limit(10).sort({ ts: -1 }).pretty()

# Bước 3: Analyze query
db.collection.find({ field: value }).explain("executionStats")

# Bước 4: Tạo index nếu cần
# Ví dụ:
db.congviec.createIndex({ NguoiChinhID: 1, TrangThai: 1 })

# Bước 5: Test lại query
db.collection.find({ field: value }).explain("executionStats")
# Kiểm tra: totalDocsExamined giảm, executionTimeMillis giảm
```

---

## 💻 LỖI HỆ THỐNG

### **1. Disk Full**

**Triệu chứng:**

```bash
df -h
# Use% = 100%
```

**Cách xử lý:**

```bash
# Bước 1: Tìm thư mục lớn
sudo du -sh /* 2>/dev/null | sort -hr | head -10

# Bước 2: Xóa logs cũ
# PM2 logs
pm2 flush

# System logs
sudo journalctl --vacuum-time=7d

# MongoDB logs
sudo find /var/log/mongodb -name "*.log.*" -mtime +7 -delete

# Bước 3: Xóa node_modules cũ (nếu có backup)
find ~/ -name "node_modules" -type d -prune

# Bước 4: Xóa backups cũ
find ~/backups -mtime +30 -delete

# Bước 5: Clean apt cache
sudo apt clean
sudo apt autoclean
```

---

### **2. Out of Memory**

**Triệu chứng:**

```bash
free -h
# Mem available < 100MB
# Swap đang được dùng
```

**Cách xử lý:**

```bash
# Bước 1: Xem process nào ngốn RAM
ps aux --sort=-%mem | head -10

# Bước 2: Restart các services
pm2 restart all
sudo systemctl restart mongod

# Bước 3: Clear cache
sync; echo 3 | sudo tee /proc/sys/vm/drop_caches

# Bước 4: Nếu vẫn không đủ → Upgrade RAM
```

---

### **3. High CPU Load**

**Triệu chứng:**

```bash
uptime
# load average > số CPU cores
```

**Cách xử lý:**

```bash
# Bước 1: Xem process nào ngốn CPU
top
# Hoặc
htop

# Bước 2: Nếu là node process
pm2 monit
# Xem app nào CPU cao

# Bước 3: Xem logs
pm2 logs giaobanbv-be

# Bước 4: Thường do:
# - Infinite loop trong code
# - Slow database queries
# - Heavy computation

# Bước 5: Restart tạm thời
pm2 restart giaobanbv-be

# Bước 6: Investigate và fix code
```

---

## 🌐 LỖI ỨNG DỤNG

### **1. HTTP 500 Internal Server Error**

**Cách xử lý:**

```bash
# Xem logs
pm2 logs giaobanbv-be --err --lines 50

# Thường do:
# - Unhandled exceptions
# - Database query errors
# - Missing data/null references

# Test API trực tiếp
curl -v http://localhost:3000/api/endpoint

# Fix code và deploy lại
```

---

### **2. CORS Errors (Vì không dùng Nginx)**

**Lỗi:**

```
Access to fetch at 'http://...' from origin 'http://...'
has been blocked by CORS policy
```

**Cách xử lý:**

```javascript
// Trong Express app (app.js hoặc server.js)
const cors = require("cors");

app.use(
  cors({
    origin: ["http://localhost:8080", "https://your-domain.com"],
    credentials: true,
  })
);
```

---

### **3. JWT Token Invalid/Expired**

**Cách xử lý:**

```bash
# Check JWT_SECRET trong .env
cat ~/giaobanbv-be/.env | grep JWT_SECRET

# Regenerate tokens cho users

# Clear cookies/localStorage trên browser
```

---

## 🆘 EMERGENCY RESTART

**Khi mọi thứ đều fail:**

```bash
#!/bin/bash
# Emergency restart tất cả services

echo "🆘 Emergency restart..."

# Stop tất cả
pm2 stop all
sudo systemctl stop mongod

# Wait
sleep 5

# Start lại
sudo systemctl start mongod
sleep 3

pm2 resurrect

# Check
pm2 status
sudo systemctl status mongod

echo "✅ Services restarted"
```

Lưu script này tại: `~/docs/server-management/scripts/emergency-restart.sh`

---

## 📝 LOGGING & DEBUGGING

### **Enable Debug Mode**

```bash
# Trong .env
NODE_ENV=development
DEBUG=*

# Restart
pm2 restart giaobanbv-be --update-env

# Xem logs chi tiết
pm2 logs giaobanbv-be
```

---

## 🔍 USEFUL DEBUGGING COMMANDS

```bash
# System info
uname -a
cat /etc/os-release

# Network
sudo netstat -tlnp
sudo ss -tlnp
ping -c 3 8.8.8.8

# Disk
df -h
du -sh ~/* | sort -hr

# Memory
free -h
ps aux --sort=-%mem | head -10

# CPU
top
htop

# Processes
ps aux | grep node
ps aux | grep mongod

# Ports
sudo lsof -i :3000
sudo lsof -i :27017

# Logs
pm2 logs
sudo tail -f /var/log/mongodb/mongod.log
sudo tail -f /var/log/syslog
```

---

**💡 TIP:** Khi gặp lỗi mới, Google với format: `[error message] + ubuntu + mongodb/pm2/node`

**⬅️ Quay lại:** [README](00-README.md)
