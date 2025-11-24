# 🗄️ Quản Lý MongoDB

> **⚠️ CẢNH BÁO:** MongoDB hiện tại CHƯA có authentication - Rủi ro bảo mật cao!  
> **Ưu tiên:** Setup authentication NGAY

---

## 📋 MỤC LỤC

1. [⚠️ SETUP AUTHENTICATION - URGENT](#setup-authentication)
2. [MongoDB Service Management](#mongodb-service-management)
3. [MongoDB Shell Commands](#mongodb-shell-commands)
4. [Performance Monitoring](#performance-monitoring)
5. [Index Management](#index-management)
6. [Troubleshooting](#troubleshooting)

---

## ⚠️ **SETUP AUTHENTICATION - URGENT**

### **Tại Sao Cần Authentication?**

**Rủi ro hiện tại:**

- ❌ Ai cũng có thể đọc/ghi database nếu truy cập được port 27017
- ❌ Data có thể bị xóa, sửa, đánh cắp
- ❌ Vi phạm compliance (GDPR, etc.)

### **Kiểm Tra Hiện Tại**

```bash
# 1. Kiểm tra MongoDB bind address
sudo cat /etc/mongod.conf | grep bindIp

# ✅ TỐT: bindIp: 127.0.0.1 (chỉ localhost)
# ❌ NGUY HIỂM: bindIp: 0.0.0.0 (tất cả interfaces)

# 2. Kiểm tra port có expose ra ngoài không
sudo netstat -tlnp | grep 27017

# ✅ TỐT: 127.0.0.1:27017 (chỉ local)
# ❌ NGUY HIỂM: 0.0.0.0:27017 (public)

# 3. Thử kết nối không cần password
mongosh

# Nếu vào được → Chưa có authentication
```

---

### **CÁCH 1: Setup Authentication Thủ Công**

#### **Bước 1: Tạo Admin User**

```bash
# 1. Kết nối MongoDB
mongosh

# 2. Switch sang admin database
use admin

# 3. Tạo admin user
db.createUser({
  user: "admin",
  pwd: "YOUR_STRONG_PASSWORD_HERE",  // ⚠️ THAY ĐỔI PASSWORD MẠNH
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "clusterAdmin", db: "admin" }
  ]
})

# Output: { ok: 1 }

# 4. Thoát
exit
```

#### **Bước 2: Tạo App User cho Database**

```bash
# 1. Kết nối lại (chưa cần auth vì chưa enable)
mongosh

# 2. Switch sang database của app
use giaobanbv

# 3. Tạo user cho app
db.createUser({
  user: "giaobanbv_app",
  pwd: "YOUR_APP_PASSWORD_HERE",  // ⚠️ PASSWORD KHÁC VỚI ADMIN
  roles: [
    { role: "readWrite", db: "giaobanbv" }
  ]
})

# 4. Thoát
exit
```

#### **Bước 3: Enable Authentication**

```bash
# 1. Backup config trước
sudo cp /etc/mongod.conf /etc/mongod.conf.backup

# 2. Edit config
sudo nano /etc/mongod.conf

# 3. Thêm hoặc uncomment section này:
security:
  authorization: enabled

# 4. Save (Ctrl+O, Enter, Ctrl+X)

# 5. Restart MongoDB
sudo systemctl restart mongod

# 6. Kiểm tra status
sudo systemctl status mongod
```

#### **Bước 4: Test Authentication**

```bash
# 1. Thử kết nối KHÔNG có auth (phải fail)
mongosh

# Output: MongoServerError: command requires authentication

# 2. Kết nối VỚI auth (phải thành công)
mongosh -u admin -p --authenticationDatabase admin

# Nhập password admin đã tạo
# Output: Connected successfully

# 3. Test app user
mongosh -u giaobanbv_app -p giaobanbv --authenticationDatabase giaobanbv

# Nhập password app đã tạo
# Output: Connected successfully
```

#### **Bước 5: Update Connection String Trong App**

```bash
# 1. Edit file .env hoặc config
cd ~/giaobanbv-be
nano .env

# 2. Update MONGODB_URI
# CŨ:
# MONGODB_URI=mongodb://localhost:27017/giaobanbv

# MỚI:
# MONGODB_URI=mongodb://giaobanbv_app:YOUR_APP_PASSWORD@localhost:27017/giaobanbv?authSource=giaobanbv

# 3. Save và restart PM2
pm2 restart giaobanbv-be

# 4. Check logs
pm2 logs giaobanbv-be
```

---

### **CÁCH 2: Dùng Script Tự Động**

```bash
# Chạy script có sẵn
~/giaobanbv-be/docs/server-management/scripts/setup-mongodb-auth.sh

# Script sẽ:
# 1. Hỏi passwords
# 2. Tạo users
# 3. Enable authentication
# 4. Restart MongoDB
# 5. Test kết nối
```

---

### **Kiểm Tra Authentication Đã Hoạt Động**

```bash
# 1. Thử kết nối không auth
mongosh

# Phải thấy error: "command requires authentication"

# 2. Kết nối với auth
mongosh -u admin -p --authenticationDatabase admin

# Phải vào được

# 3. Check trong app
curl http://localhost:3000/api/health

# Phải thấy "database": "connected"
```

---

## 🔧 MONGODB SERVICE MANAGEMENT

### **Status**

```bash
sudo systemctl status mongod
```

### **Start/Stop/Restart**

```bash
# Start
sudo systemctl start mongod

# Stop
sudo systemctl stop mongod

# Restart
sudo systemctl restart mongod

# Reload config
sudo systemctl reload mongod
```

### **Enable/Disable Auto-Start**

```bash
# Enable (auto-start on boot)
sudo systemctl enable mongod

# Disable
sudo systemctl disable mongod

# Check
systemctl is-enabled mongod
```

### **View Logs**

```bash
# Xem logs
sudo tail -f /var/log/mongodb/mongod.log

# Tìm errors
sudo grep -i error /var/log/mongodb/mongod.log | tail -20

# Tìm slow queries
sudo grep -i slow /var/log/mongodb/mongod.log | tail -20
```

---

## 💻 MONGODB SHELL COMMANDS

### **Kết Nối**

```bash
# Không auth (nếu chưa enable)
mongosh

# Với auth
mongosh -u admin -p --authenticationDatabase admin

# Hoặc với connection string
mongosh "mongodb://giaobanbv_app:password@localhost:27017/giaobanbv?authSource=giaobanbv"
```

### **Trong Mongo Shell**

```javascript
// ════════════════════════════════════
// DATABASE COMMANDS
// ════════════════════════════════════

// Xem databases
show dbs

// Switch database
use giaobanbv

// Xem database hiện tại
db.getName()

// Xem collections
show collections

// Database stats
db.stats()

// ════════════════════════════════════
// COLLECTION COMMANDS
// ════════════════════════════════════

// Đếm documents
db.nhanvien.countDocuments()

// Xem 1 document mẫu
db.nhanvien.findOne()

// Xem 5 documents
db.nhanvien.find().limit(5)

// Collection stats
db.nhanvien.stats()

// ════════════════════════════════════
// INDEX COMMANDS
// ════════════════════════════════════

// Xem indexes
db.nhanvien.getIndexes()

// Tạo index
db.nhanvien.createIndex({ Email: 1 })

// Drop index
db.nhanvien.dropIndex("Email_1")

// ════════════════════════════════════
// PERFORMANCE
// ════════════════════════════════════

// Current operations
db.currentOp()

// Server status
db.serverStatus()

// Connection stats
db.serverStatus().connections

// ════════════════════════════════════
// USER MANAGEMENT (Với auth)
// ════════════════════════════════════

// Xem users
use admin
db.getUsers()

// Tạo user mới
db.createUser({
  user: "backup_user",
  pwd: "backup_password",
  roles: ["backup", "restore"]
})

// Đổi password user
db.changeUserPassword("giaobanbv_app", "new_password")

// Xóa user
db.dropUser("username")

// ════════════════════════════════════
// UTILITIES
// ════════════════════════════════════

// Ping database
db.adminCommand('ping')

// Version
db.version()

// Server info
db.hostInfo()

// Thoát
exit
```

---

## 📊 PERFORMANCE MONITORING

### **1. Kiểm Tra Connections**

```bash
# Trong mongosh
db.serverStatus().connections

# Output:
# {
#   current: 5,        // Số connections hiện tại
#   available: 51195,  // Số connections khả dụng
#   totalCreated: 234  // Tổng số đã tạo
# }
```

**⚠️ Cảnh báo nếu:** `current` gần bằng `available`

### **2. Kiểm Tra Memory**

```bash
db.serverStatus().mem

# Output:
# {
#   resident: 512,     // RAM đang dùng (MB)
#   virtual: 1024,     // Virtual memory
#   mapped: 256        // Mapped memory
# }
```

### **3. Kiểm Tra Slow Queries**

```bash
# Enable profiling (level 1 = slow queries only)
db.setProfilingLevel(1, { slowms: 100 })

# Xem slow queries
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()

# Disable profiling
db.setProfilingLevel(0)
```

### **4. Kiểm Tra Operations Hiện Tại**

```bash
db.currentOp()

# Hoặc chỉ operations đang chạy lâu
db.currentOp({ "active": true, "secs_running": { "$gt": 3 } })
```

### **5. Database Size**

```bash
# Tổng quan
db.stats()

# Chi tiết từng collection
db.nhanvien.stats()
db.congviec.stats()
```

---

## 🎯 INDEX MANAGEMENT

### **Xem Indexes Hiện Tại**

```bash
# Tất cả collections
db.getCollectionNames().forEach(function(collection) {
   print("Indexes for " + collection + ":");
   printjson(db[collection].getIndexes());
});

# 1 collection cụ thể
db.nhanvien.getIndexes()
```

### **Tạo Index**

```bash
# Single field index
db.nhanvien.createIndex({ Email: 1 })

# Compound index
db.congviec.createIndex({ NguoiChinhID: 1, TrangThai: 1 })

# Text index (cho search)
db.nhanvien.createIndex({ Ten: "text", Email: "text" })

# Unique index
db.nhanvien.createIndex({ Email: 1 }, { unique: true })
```

### **Analyze Query Performance**

```bash
# Explain query
db.nhanvien.find({ Email: "test@example.com" }).explain("executionStats")

# Kiểm tra:
# - executionTimeMillis < 100ms: Tốt
# - totalDocsExamined ≈ nReturned: Index được dùng hiệu quả
# - stage: "IXSCAN" (dùng index) vs "COLLSCAN" (full scan - chậm)
```

---

## 🔧 TROUBLESHOOTING

### **MongoDB Không Start**

```bash
# 1. Xem logs
sudo tail -50 /var/log/mongodb/mongod.log

# 2. Thường do:
# - Port 27017 đã được dùng
# - Disk full
# - Permission issues
# - Lock file còn tồn tại

# 3. Check port
sudo netstat -tlnp | grep 27017

# 4. Check disk space
df -h

# 5. Check lock file
ls -la /var/lib/mongodb/mongod.lock

# 6. Nếu lock file tồn tại và MongoDB không chạy
sudo rm /var/lib/mongodb/mongod.lock
sudo systemctl start mongod
```

### **Connection Refused**

```bash
# 1. Check MongoDB đang chạy
sudo systemctl status mongod

# 2. Check port
sudo netstat -tlnp | grep 27017

# 3. Check bindIp trong config
sudo cat /etc/mongod.conf | grep bindIp

# 4. Check firewall
sudo ufw status | grep 27017
```

### **Slow Queries**

```bash
# 1. Enable profiling
mongosh
use giaobanbv
db.setProfilingLevel(1, { slowms: 100 })

# 2. Xem slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10)

# 3. Analyze và tạo index nếu cần
db.collection.createIndex({ field: 1 })
```

### **High Memory Usage**

```bash
# 1. Check memory
free -h

# 2. MongoDB memory usage
mongosh --eval "db.serverStatus().mem"

# 3. Restart MongoDB (giải phóng memory)
sudo systemctl restart mongod

# 4. Nếu vấn đề tiếp diễn, cân nhắc:
# - Tăng RAM server
# - Optimize indexes
# - Archive old data
```

---

## 📋 DAILY CHECKLIST

```bash
# 1. Check service status
sudo systemctl status mongod

# 2. Check connections
mongosh -u admin -p --eval "db.serverStatus().connections" --authenticationDatabase admin

# 3. Check disk usage
df -h /var/lib/mongodb

# 4. Check logs for errors
sudo grep -i error /var/log/mongodb/mongod.log | tail -5

# 5. Check slow queries
mongosh -u admin -p --eval "db.system.profile.find().limit(5).sort({ts:-1})" giaobanbv --authenticationDatabase admin
```

---

## 🎯 BEST PRACTICES

1. **✅ Enable Authentication** - QUAN TRỌNG NHẤT
2. **✅ Backup Thường Xuyên** - Hàng ngày tối thiểu
3. **✅ Monitor Performance** - Connections, Memory, Slow queries
4. **✅ Index Optimization** - Tạo index cho queries thường dùng
5. **✅ Limit bindIp** - Chỉ 127.0.0.1 trừ khi cần thiết
6. **✅ Update MongoDB** - Security patches
7. **✅ Archive Old Data** - Giữ database size nhỏ

---

## 🆘 EMERGENCY COMMANDS

```bash
# Restart MongoDB
sudo systemctl restart mongod

# Kill MongoDB process (last resort)
sudo killall -9 mongod
sudo rm /var/lib/mongodb/mongod.lock
sudo systemctl start mongod

# Repair database (nếu bị corrupt - MẤT THỜI GIAN)
sudo systemctl stop mongod
sudo mongod --repair --dbpath /var/lib/mongodb
sudo systemctl start mongod
```

---

**⚠️ NHẮC NHỞ:** Nếu chưa setup authentication, hãy làm NGAY BÂY GIỜ!

**⬅️ Quay lại:** [PM2 Management](03-pm2-management.md)  
**➡️ Tiếp theo:** [Logs Analysis](05-logs-analysis.md)
