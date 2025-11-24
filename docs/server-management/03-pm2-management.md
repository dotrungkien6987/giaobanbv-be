# 🚀 Quản Lý PM2 - Process Manager

> **PM2:** Production Process Manager cho Node.js  
> **Website:** https://pm2.keymetrics.io/

---

## 📋 MỤC LỤC

1. [PM2 Basics](#pm2-basics)
2. [Start/Stop/Restart](#startstoprestart)
3. [Logs Management](#logs-management)
4. [Monitoring](#monitoring)
5. [Configuration](#configuration)
6. [Cluster Mode](#cluster-mode)
7. [Auto-Start on Boot](#auto-start-on-boot)
8. [Troubleshooting](#troubleshooting)

---

## ⚡ PM2 BASICS

### **Xem Tất Cả Apps**

```bash
pm2 list
# hoặc
pm2 ls
# hoặc
pm2 status
```

### **Xem Chi Tiết 1 App**

```bash
pm2 info giaobanbv-be
```

### **Xem Monitoring Dashboard**

```bash
pm2 monit
# Nhấn Ctrl+C để thoát
```

---

## 🔄 START/STOP/RESTART

### **Start App**

```bash
# Cách 1: Start từ file
cd ~/giaobanbv-be
pm2 start app.js --name giaobanbv-be

# Cách 2: Start từ ecosystem config
pm2 start ecosystem.config.js

# Cách 3: Start với env variables
pm2 start app.js --name giaobanbv-be --env production
```

### **Stop App**

```bash
pm2 stop giaobanbv-be

# Stop tất cả
pm2 stop all
```

### **Restart App**

```bash
# Restart (downtime ngắn)
pm2 restart giaobanbv-be

# Reload (zero downtime) - Chỉ với cluster mode
pm2 reload giaobanbv-be

# Restart tất cả
pm2 restart all
```

### **Delete App**

```bash
pm2 delete giaobanbv-be

# Delete tất cả
pm2 delete all
```

---

## 📝 LOGS MANAGEMENT

### **Xem Logs Realtime**

```bash
# Tất cả logs (stdout + stderr)
pm2 logs giaobanbv-be

# Chỉ errors
pm2 logs giaobanbv-be --err

# Chỉ output
pm2 logs giaobanbv-be --out

# Tất cả apps
pm2 logs
```

### **Xem N Dòng Logs Gần Nhất**

```bash
pm2 logs giaobanbv-be --lines 100
```

### **Xem Logs với Timestamp**

```bash
pm2 logs --timestamp
```

### **Clear Logs**

```bash
pm2 flush
# hoặc
pm2 flush giaobanbv-be
```

### **Log Files Location**

```bash
# Xem đường dẫn
pm2 info giaobanbv-be | grep log

# Thường ở:
~/.pm2/logs/giaobanbv-be-out.log
~/.pm2/logs/giaobanbv-be-error.log
```

---

## 📊 MONITORING

### **Real-time Monitor**

```bash
pm2 monit
```

### **Process Info**

```bash
pm2 show giaobanbv-be
```

### **CPU & Memory Usage**

```bash
pm2 list
# Cột cpu và memory
```

### **PM2 Plus (Cloud Monitoring - Optional)**

```bash
# Đăng ký tại: https://app.pm2.io/
pm2 link <secret_key> <public_key>
```

---

## ⚙️ CONFIGURATION

### **Ecosystem Config File**

Tạo file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "giaobanbv-be",
      script: "./app.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "~/.pm2/logs/giaobanbv-be-error.log",
      out_file: "~/.pm2/logs/giaobanbv-be-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
```

**Start với config:**

```bash
pm2 start ecosystem.config.js
```

---

## 🔢 CLUSTER MODE (Scale App)

### **Khi Nào Dùng Cluster Mode?**

- Nhiều users đồng thời
- CPU nhiều cores (> 2 cores)
- Cần zero-downtime deployment

### **Start Cluster Mode**

```bash
# Start với 4 instances
pm2 start app.js -i 4

# Start với số instances = số CPU cores
pm2 start app.js -i max

# Hoặc trong ecosystem.config.js:
# instances: 'max',
# exec_mode: 'cluster'
```

### **Reload Zero-Downtime**

```bash
# Chỉ hoạt động với cluster mode
pm2 reload giaobanbv-be
```

### **Scale Up/Down**

```bash
# Scale lên 4 instances
pm2 scale giaobanbv-be 4

# Scale xuống 2 instances
pm2 scale giaobanbv-be 2
```

---

## 🔐 AUTO-START ON BOOT

### **Setup PM2 Startup Script**

```bash
# 1. Generate startup script
pm2 startup

# Output sẽ cho 1 command, copy và chạy nó
# Ví dụ:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u user --hp /home/user

# 2. Save current PM2 process list
pm2 save

# 3. Verify
sudo systemctl status pm2-user
```

### **Update Startup List**

```bash
# Sau khi thay đổi apps, save lại
pm2 save
```

### **Remove Startup**

```bash
pm2 unstartup
```

---

## 🔧 TROUBLESHOOTING

### **App Status: "errored"**

```bash
# 1. Xem logs
pm2 logs giaobanbv-be --err --lines 50

# 2. Delete và start lại
pm2 delete giaobanbv-be
cd ~/giaobanbv-be
pm2 start ecosystem.config.js

# 3. Xem logs ngay lập tức
pm2 logs giaobanbv-be
```

### **App Restart Liên Tục**

```bash
# Xem số lần restart
pm2 list

# Nếu "↺" tăng liên tục:
# 1. Xem logs để tìm lỗi
pm2 logs giaobanbv-be --err

# 2. Thường do:
# - Port đã được dùng (EADDRINUSE)
# - MongoDB connection failed
# - Missing environment variables
# - Syntax error

# 3. Stop app, fix lỗi, rồi start lại
pm2 stop giaobanbv-be
# Fix code...
pm2 start giaobanbv-be
```

### **Memory Leak (RAM tăng dần)**

```bash
# 1. Monitor memory
pm2 monit

# 2. Restart khi memory > threshold
# Trong ecosystem.config.js:
# max_memory_restart: '500M'

# 3. Investigate memory leak trong code
# - Sử dụng heap profiler
# - Check database connections không close
# - Check event listeners không remove
```

### **CPU 100%**

```bash
# 1. Xem process nào ngốn CPU
pm2 monit

# 2. Xem logs có lỗi gì
pm2 logs giaobanbv-be

# 3. Thường do:
# - Infinite loop trong code
# - Heavy computation
# - Slow database queries

# 4. Restart tạm thời
pm2 restart giaobanbv-be

# 5. Fix code và deploy lại
```

---

## 🎯 BEST PRACTICES

### **1. Luôn Dùng Ecosystem Config**

```bash
# Thay vì:
pm2 start app.js

# Nên dùng:
pm2 start ecosystem.config.js
```

### **2. Set Max Memory Restart**

```javascript
// ecosystem.config.js
max_memory_restart: "500M";
```

### **3. Save Process List**

```bash
# Sau mọi thay đổi
pm2 save
```

### **4. Monitor Logs Thường Xuyên**

```bash
# Daily check
pm2 logs giaobanbv-be --lines 50 | grep -i error
```

### **5. Zero-Downtime Deployment**

```bash
# Với cluster mode
pm2 reload giaobanbv-be

# Không phải cluster
pm2 restart giaobanbv-be
```

---

## 📚 USEFUL COMMANDS CHEATSHEET

```bash
# Status
pm2 status
pm2 info giaobanbv-be
pm2 monit

# Start/Stop
pm2 start ecosystem.config.js
pm2 stop giaobanbv-be
pm2 restart giaobanbv-be
pm2 reload giaobanbv-be  # cluster mode only

# Logs
pm2 logs
pm2 logs giaobanbv-be
pm2 logs --err
pm2 flush

# Cluster
pm2 start app.js -i max
pm2 scale giaobanbv-be 4

# Startup
pm2 startup
pm2 save
pm2 resurrect

# Maintenance
pm2 update          # Update PM2
pm2 reset giaobanbv-be  # Reset restart counter
```

---

## 🆘 EMERGENCY COMMANDS

```bash
# Restart tất cả
pm2 restart all

# Kill PM2 daemon và restart
pm2 kill
pm2 resurrect

# Force kill process
pm2 delete giaobanbv-be
pm2 start ecosystem.config.js --force
```

---

**⬅️ Quay lại:** [Health Check](01-health-check.md)  
**➡️ Tiếp theo:** [MongoDB Management](04-mongodb-management.md)
