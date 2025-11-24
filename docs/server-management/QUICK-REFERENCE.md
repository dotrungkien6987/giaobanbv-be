# ⚡ Quick Reference - Các Lệnh Thường Dùng

> **Cheat Sheet** cho việc quản trị hàng ngày

---

## 🔍 HEALTH CHECK (2 phút)

```bash
# All-in-one check
~/giaobanbv-be/docs/server-management/scripts/check-system.sh

# Hoặc manual:
pm2 status                              # PM2 apps
sudo systemctl status mongod            # MongoDB
df -h                                   # Disk space
free -h                                 # Memory
curl http://localhost:3000/api/health   # API health
```

---

## 🚀 PM2

```bash
# Status & Info
pm2 status
pm2 info giaobanbv-be
pm2 monit

# Logs
pm2 logs giaobanbv-be
pm2 logs --err
pm2 flush

# Control
pm2 restart giaobanbv-be
pm2 stop giaobanbv-be
pm2 delete giaobanbv-be
pm2 save
```

---

## 🗄️ MONGODB

```bash
# Service
sudo systemctl status mongod
sudo systemctl restart mongod

# Shell
mongosh
# Trong shell:
show dbs
use giaobanbv
show collections
db.nhanvien.countDocuments()
exit

# Quick stats
mongosh --eval "db.serverStatus().connections"
```

---

## 💾 BACKUP & RESTORE

```bash
# Backup (manual)
mongodump --db giaobanbv --gzip --archive=~/backups/giaobanbv-$(date +%Y%m%d).gz

# Backup (script)
~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh

# Restore
mongorestore --db giaobanbv --gzip --archive=~/backups/giaobanbv-20251116.gz

# List backups
ls -lht ~/backups/mongodb/ | head -10
```

---

## 🚀 DEPLOYMENT

```bash
# Deploy script
~/giaobanbv-be/docs/server-management/scripts/deploy.sh

# Manual:
cd ~/giaobanbv-be
git pull origin main
npm install
pm2 restart giaobanbv-be
pm2 logs --lines 50
```

---

## 📊 MONITORING

```bash
# System resources
htop                    # CPU, RAM (interactive)
df -h                   # Disk
free -h                 # Memory
uptime                  # Load average

# Network & Ports
sudo netstat -tlnp | grep -E '3000|27017'
sudo ss -tlnp

# Processes
ps aux --sort=-%cpu | head -10  # Top CPU
ps aux --sort=-%mem | head -10  # Top Memory
```

---

## 🔧 TROUBLESHOOTING

```bash
# PM2 app errored
pm2 logs giaobanbv-be --err --lines 50
pm2 delete giaobanbv-be
pm2 start ecosystem.config.js

# MongoDB not starting
sudo tail -50 /var/log/mongodb/mongod.log
sudo rm /var/lib/mongodb/mongod.lock
sudo systemctl start mongod

# Port already in use
sudo lsof -i :3000
sudo kill -9 <PID>

# Disk full
pm2 flush
sudo journalctl --vacuum-time=7d
find ~/backups -mtime +30 -delete

# Emergency restart
pm2 restart all
sudo systemctl restart mongod
```

---

## 🔐 SECURITY

```bash
# Setup MongoDB auth (URGENT!)
~/giaobanbv-be/docs/server-management/scripts/setup-mongodb-auth.sh

# Firewall
sudo ufw status
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable

# Check MongoDB binding
sudo cat /etc/mongod.conf | grep bindIp
# Phải là: 127.0.0.1
```

---

## 📝 LOGS

```bash
# PM2 logs
pm2 logs giaobanbv-be
pm2 logs --err
pm2 logs --lines 100

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
sudo grep -i error /var/log/mongodb/mongod.log | tail -20

# System logs
sudo tail -f /var/log/syslog
sudo tail -f /var/log/auth.log
```

---

## 🔄 CRON JOBS

```bash
# Edit crontab
crontab -e

# Useful cron jobs:
# Backup lúc 2h sáng hàng ngày
0 2 * * * ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh >> ~/logs/backup.log 2>&1

# Health check mỗi 5 phút
*/5 * * * * ~/giaobanbv-be/docs/server-management/scripts/check-system.sh >> ~/logs/health.log 2>&1

# List cron jobs
crontab -l
```

---

## 🆘 EMERGENCY

```bash
# All services down?
pm2 kill
pm2 resurrect

# MongoDB corrupt?
sudo systemctl stop mongod
sudo mongod --repair --dbpath /var/lib/mongodb
sudo systemctl start mongod

# Restore from backup
mongorestore --db giaobanbv --drop --gzip --archive=~/backups/latest.gz
```

---

## 📞 COMMON ISSUES

| Issue                 | Quick Fix                                        |
| --------------------- | ------------------------------------------------ |
| PM2 app errored       | `pm2 restart giaobanbv-be`                       |
| MongoDB down          | `sudo systemctl restart mongod`                  |
| Port in use           | `sudo lsof -i :3000; sudo kill -9 <PID>`         |
| Disk full             | `pm2 flush; sudo journalctl --vacuum-time=7d`    |
| Out of memory         | `pm2 restart all; sudo systemctl restart mongod` |
| API timeout           | `pm2 logs giaobanbv-be --err`                    |
| Can't connect MongoDB | Check `mongosh` and firewall                     |

---

## 🎯 DAILY TASKS (5 phút)

```bash
# Morning check
pm2 status
df -h
curl http://localhost:3000/api/health

# Review errors
pm2 logs giaobanbv-be --err --lines 10
sudo grep -i error /var/log/mongodb/mongod.log | tail -5

# Verify backup
ls -lht ~/backups/mongodb/ | head -3
```

---

## 📚 FULL DOCUMENTATION

Xem chi tiết tại: `~/giaobanbv-be/docs/server-management/`

- [00-README.md](00-README.md) - Tổng quan
- [01-health-check.md](01-health-check.md) - Kiểm tra hệ thống
- [03-pm2-management.md](03-pm2-management.md) - Quản lý PM2
- [04-mongodb-management.md](04-mongodb-management.md) - Quản lý MongoDB
- [06-backup-restore.md](06-backup-restore.md) - Backup & Restore
- [09-troubleshooting.md](09-troubleshooting.md) - Xử lý lỗi

---

**💡 TIP:** Bookmark file này để tra cứu nhanh!
