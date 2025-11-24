# 🚀 Tài Liệu Quản Trị Server Ubuntu - GiaoBanBV

> **Hệ thống:** Full-Stack (Backend + MongoDB) trên Ubuntu Server  
> **Tech Stack:** Node.js, PM2, MongoDB  
> **Cập nhật:** 16/11/2025

---

## 📋 **MỤC LỤC**

| #   | Tài liệu                                                   | Mô tả                        | Độ ưu tiên  |
| --- | ---------------------------------------------------------- | ---------------------------- | ----------- |
| 1   | [**Health Check**](01-health-check.md)                     | Kiểm tra tình trạng hệ thống | 🔴 Critical |
| 2   | [**Resource Monitoring**](02-resource-monitoring.md)       | Giám sát CPU, RAM, Disk      | 🟡 High     |
| 3   | [**PM2 Management**](03-pm2-management.md)                 | Quản lý ứng dụng Node.js     | 🔴 Critical |
| 4   | [**MongoDB Management**](04-mongodb-management.md)         | Quản lý database + bảo mật   | 🔴 Critical |
| 5   | [**Logs Analysis**](05-logs-analysis.md)                   | Phân tích logs để debug      | 🟡 High     |
| 6   | [**Backup & Restore**](06-backup-restore.md)               | Sao lưu & phục hồi dữ liệu   | 🔴 Critical |
| 7   | [**Deploy & Update**](07-deploy-update.md)                 | Deploy code mới lên server   | 🟡 High     |
| 8   | [**Security & Firewall**](08-security-firewall.md)         | Bảo mật server               | 🔴 Critical |
| 9   | [**Troubleshooting**](09-troubleshooting.md)               | Xử lý lỗi thường gặp         | 🟡 High     |
| 10  | [**Automation & Monitoring**](10-automation-monitoring.md) | Tự động hóa tasks            | 🟢 Medium   |

---

## ⚡ **QUICK START - 10 LỆNH QUAN TRỌNG NHẤT**

### **1. Kiểm tra tổng quan hệ thống**

```bash
~/docs/server-management/scripts/check-system.sh
```

### **2. Xem trạng thái PM2**

```bash
pm2 status
```

### **3. Xem logs Backend realtime**

```bash
pm2 logs giaobanbv-be
```

### **4. Restart Backend**

```bash
pm2 restart giaobanbv-be
```

### **5. Kiểm tra MongoDB**

```bash
sudo systemctl status mongod
```

### **6. Kết nối MongoDB Shell**

```bash
mongosh
```

### **7. Xem disk usage**

```bash
df -h
```

### **8. Xem RAM usage**

```bash
free -h
```

### **9. Backup MongoDB**

```bash
~/docs/server-management/scripts/backup-mongo.sh
```

### **10. Deploy code mới**

```bash
~/docs/server-management/scripts/deploy.sh
```

---

## 🏗️ **KIẾN TRÚC HỆ THỐNG**

```
┌─────────────────────────────────────────────────────────┐
│                    Ubuntu Server                         │
│                                                          │
│  ┌──────────────────┐        ┌──────────────────┐      │
│  │   PM2 Process    │───────▶│    MongoDB       │      │
│  │   Manager        │        │    Database      │      │
│  │                  │        │                  │      │
│  │  - giaobanbv-be  │        │  - Port: 27017   │      │
│  │  - Port: 3000    │        │  - No Auth (⚠️)  │      │
│  │  - Node.js       │        │                  │      │
│  └──────────────────┘        └──────────────────┘      │
│           ▲                                              │
│           │                                              │
│           │ HTTP/HTTPS                                   │
│           │                                              │
│      ┌────┴────┐                                        │
│      │ Clients │                                        │
│      └─────────┘                                        │
└─────────────────────────────────────────────────────────┘

Lưu ý:
- KHÔNG dùng Nginx (Backend expose trực tiếp port 3000)
- MongoDB CHƯA có authentication (cần setup gấp!)
- PM2 quản lý lifecycle của Backend
```

---

## ⚠️ **CẢNH BÁO BẢO MẬT - ĐỌC NGAY**

### **🔴 NGUY HIỂM: MongoDB chưa có authentication!**

**Rủi ro:**

- Ai cũng có thể đọc/ghi database nếu truy cập được port 27017
- Mất dữ liệu, dữ liệu bị thay đổi

**Cần làm NGAY:**

1. **Kiểm tra MongoDB có bind ra internet không:**

```bash
sudo netstat -tlnp | grep 27017
# Nếu thấy 0.0.0.0:27017 → NGUY HIỂM!
# Chỉ nên thấy 127.0.0.1:27017 (localhost only)
```

2. **Kiểm tra firewall:**

```bash
sudo ufw status
# Đảm bảo port 27017 KHÔNG open ra ngoài
```

3. **Setup authentication:**

```bash
~/docs/server-management/scripts/setup-mongodb-auth.sh
```

👉 **Xem chi tiết:** [04-mongodb-management.md](04-mongodb-management.md)

---

## 📊 **CHECKLIST HÀNG NGÀY**

```bash
# Copy checklist này vào terminal để chạy tất cả

echo "=========================================="
echo "📋 DAILY HEALTH CHECK - $(date)"
echo "=========================================="

# 1. PM2 Status
echo "1️⃣ PM2 Status:"
pm2 status

# 2. Disk Space
echo "2️⃣ Disk Space:"
df -h / | grep -v Filesystem

# 3. Memory
echo "3️⃣ Memory:"
free -h | grep -E "Mem|Swap"

# 4. MongoDB Status
echo "4️⃣ MongoDB:"
sudo systemctl is-active mongod && echo "✅ Running" || echo "❌ Stopped"

# 5. Backend API
echo "5️⃣ Backend API:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/api/health

# 6. Recent Errors (PM2)
echo "6️⃣ Recent Errors:"
pm2 logs giaobanbv-be --err --lines 5

echo "=========================================="
echo "✅ Daily check completed!"
echo "=========================================="
```

---

## 📅 **CHECKLIST HÀNG TUẦN**

- [ ] Review system resources (CPU, RAM, Disk trends)
- [ ] Kiểm tra backup có chạy thành công không
- [ ] Review error logs chi tiết
- [ ] Check for npm package updates: `npm outdated`
- [ ] Xóa logs cũ: `pm2 flush`
- [ ] Restart PM2 app (để clear memory): `pm2 restart giaobanbv-be`

---

## 📅 **CHECKLIST HÀNG THÁNG**

- [ ] Full system audit: `~/docs/server-management/scripts/check-system.sh`
- [ ] Test backup restore: `mongorestore --db giaobanbv_test ~/backups/latest/`
- [ ] Update OS packages: `sudo apt update && sudo apt upgrade`
- [ ] Review MongoDB indexes performance
- [ ] Check SSL certificate expiry (nếu có)
- [ ] Review firewall rules: `sudo ufw status numbered`

---

## 🆘 **KHẨN CẤP - KHI HỆ THỐNG DOWN**

### **Backend không phản hồi:**

```bash
# 1. Kiểm tra PM2
pm2 status

# 2. Nếu errored/stopped, xem logs
pm2 logs giaobanbv-be --err --lines 50

# 3. Restart
pm2 restart giaobanbv-be

# 4. Nếu vẫn không được, kill và start lại
pm2 delete giaobanbv-be
cd ~/giaobanbv-be
pm2 start ecosystem.config.js
```

### **MongoDB không hoạt động:**

```bash
# 1. Kiểm tra status
sudo systemctl status mongod

# 2. Xem logs
sudo tail -50 /var/log/mongodb/mongod.log

# 3. Restart
sudo systemctl restart mongod

# 4. Nếu không start được, kiểm tra disk space
df -h
```

### **Server chạy chậm:**

```bash
# 1. Kiểm tra CPU/Memory
htop

# 2. Tìm process ngốn nhiều tài nguyên
ps aux --sort=-%cpu | head -10

# 3. Restart PM2 app
pm2 restart giaobanbv-be

# 4. Nếu vẫn chậm, reboot server (last resort)
sudo reboot
```

### **Disk đầy:**

```bash
# 1. Kiểm tra disk usage
df -h

# 2. Tìm thư mục lớn
sudo du -sh /* 2>/dev/null | sort -hr | head -10

# 3. Clean logs
~/docs/server-management/scripts/cleanup-logs.sh

# 4. Xóa PM2 logs cũ
pm2 flush
```

👉 **Chi tiết:** [09-troubleshooting.md](09-troubleshooting.md)

---

## 📞 **LIÊN HỆ & HỖ TRỢ**

### **Escalation Process**

1. **Level 1:** Check logs & documentation này
2. **Level 2:** Google error messages
3. **Level 3:** MongoDB/Node.js communities
4. **Level 4:** Professional support

### **Useful Resources**

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **MongoDB Manual:** https://www.mongodb.com/docs/manual/
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
- **Ubuntu Server Guide:** https://ubuntu.com/server/docs

---

## 📦 **SCRIPTS TIỆN ÍCH**

Tất cả scripts nằm trong thư mục `scripts/`:

| Script                  | Mô tả                        | Cách dùng                          |
| ----------------------- | ---------------------------- | ---------------------------------- |
| `check-system.sh`       | All-in-one health check      | `./check-system.sh`                |
| `backup-mongo.sh`       | Backup MongoDB tự động       | `./backup-mongo.sh`                |
| `restore-mongo.sh`      | Restore MongoDB              | `./restore-mongo.sh <backup-file>` |
| `deploy.sh`             | Deploy code mới              | `./deploy.sh`                      |
| `setup-mongodb-auth.sh` | Setup MongoDB authentication | `./setup-mongodb-auth.sh`          |
| `cleanup-logs.sh`       | Xóa logs cũ                  | `./cleanup-logs.sh`                |
| `emergency-restart.sh`  | Restart tất cả services      | `./emergency-restart.sh`           |

**Cách cài đặt scripts:**

```bash
# 1. Vào thư mục scripts
cd ~/giaobanbv-be/docs/server-management/scripts/

# 2. Chmod tất cả scripts
chmod +x *.sh

# 3. Test
./check-system.sh
```

---

## 🎓 **HỌC TỪ ĐÂU?**

### **Kiến thức cơ bản cần có:**

- [ ] Linux basic commands (cd, ls, grep, tail, etc.)
- [ ] SSH & remote server management
- [ ] Git basics (pull, commit, push)
- [ ] Node.js fundamentals
- [ ] MongoDB basics (CRUD operations)

### **Nâng cao:**

- [ ] Shell scripting
- [ ] Cron jobs
- [ ] Networking (ports, firewall)
- [ ] Performance tuning
- [ ] Security hardening

---

## 📝 **GHI CHÚ QUAN TRỌNG**

### **Về cấu hình hiện tại:**

1. **Không dùng Nginx:**

   - Backend expose trực tiếp port 3000
   - Phải config CORS trong Express
   - Phải handle rate limiting trong code
   - Cân nhắc thêm Nginx trong tương lai cho production

2. **MongoDB chưa authentication:**

   - ⚠️ RỦI RO BẢO MẬT CAO
   - Phải setup authentication càng sớm càng tốt
   - Xem [04-mongodb-management.md](04-mongodb-management.md)

3. **PM2 Process Manager:**
   - Quản lý lifecycle của Backend
   - Auto-restart nếu crash
   - Có thể scale với cluster mode

---

## 🔄 **CHANGELOG**

### **Version 1.0.0 - 16/11/2025**

- ✅ Tạo tài liệu ban đầu
- ✅ 10 files hướng dẫn chi tiết
- ✅ 7 scripts tự động hóa
- ✅ Checklist hàng ngày/tuần/tháng

---

## 🎯 **ROADMAP**

### **Cần làm gấp:**

- [ ] Setup MongoDB authentication
- [ ] Setup firewall (UFW)
- [ ] Setup automated backup (cron job)

### **Nên làm:**

- [ ] Setup monitoring (PM2 Plus hoặc custom)
- [ ] Setup alerts (email/Slack khi system down)
- [ ] Setup SSL certificate (nếu expose ra internet)

### **Có thể làm sau:**

- [ ] Cân nhắc thêm Nginx reverse proxy
- [ ] Setup CI/CD pipeline
- [ ] Setup staging environment
- [ ] Docker containerization

---

**📌 BẮT ĐẦU TỪ ĐÂU?**

1. ✅ Đọc file này để hiểu tổng quan
2. ✅ Chạy `check-system.sh` để kiểm tra hệ thống
3. ✅ Đọc [04-mongodb-management.md](04-mongodb-management.md) và setup authentication
4. ✅ Đọc [03-pm2-management.md](03-pm2-management.md) để hiểu PM2
5. ✅ Setup automated backup với [06-backup-restore.md](06-backup-restore.md)

**Chúc anh quản trị server hiệu quả! 🚀**
