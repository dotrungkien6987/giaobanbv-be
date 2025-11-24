# 💾 Backup & Restore MongoDB

> **QUAN TRỌNG:** Backup thường xuyên là bảo hiểm cho dữ liệu!

---

## 📋 MỤC LỤC

1. [Backup Strategies](#backup-strategies)
2. [Manual Backup](#manual-backup)
3. [Automated Backup](#automated-backup)
4. [Restore Database](#restore-database)
5. [Best Practices](#best-practices)

---

## 📊 BACKUP STRATEGIES

### **Tần suất đề xuất:**

- ✅ **Hàng ngày:** Automated backup lúc 2-3h sáng
- ✅ **Trước mỗi deployment:** Manual backup
- ✅ **Hàng tuần:** Full backup lưu ra external storage
- ✅ **Hàng tháng:** Archive backup cho compliance

### **Retention policy:**

- Keep daily backups: 7 ngày
- Keep weekly backups: 4 tuần
- Keep monthly backups: 12 tháng

---

## 🔧 MANUAL BACKUP

### **Backup Toàn Bộ Database**

```bash
# Cú pháp cơ bản
mongodump --db giaobanbv --out ~/backups/mongo-$(date +%Y%m%d-%H%M%S)

# Với compression
mongodump --db giaobanbv --gzip --archive=~/backups/giaobanbv-$(date +%Y%m%d).gz

# Với authentication (nếu đã setup)
mongodump --db giaobanbv \
  -u giaobanbv_app \
  -p YOUR_PASSWORD \
  --authenticationDatabase giaobanbv \
  --gzip \
  --archive=~/backups/giaobanbv-$(date +%Y%m%d).gz
```

### **Backup 1 Collection Cụ Thể**

```bash
# Backup collection nhanvien
mongodump --db giaobanbv \
  --collection nhanvien \
  --out ~/backups/nhanvien-$(date +%Y%m%d)

# Với compression
mongodump --db giaobanbv \
  --collection nhanvien \
  --gzip \
  --archive=~/backups/nhanvien-$(date +%Y%m%d).gz
```

### **Backup Với Query Filter**

```bash
# Chỉ backup documents match query
mongodump --db giaobanbv \
  --collection congviec \
  --query '{"TrangThai": "COMPLETED"}' \
  --out ~/backups/congviec-completed
```

---

## ⚙️ AUTOMATED BACKUP

### **Sử Dụng Script Có Sẵn**

```bash
# Script đã tạo sẵn
~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh

# Test chạy
bash ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh
```

### **Setup Cron Job (Chạy Tự Động)**

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau (backup lúc 2h sáng hàng ngày):
0 2 * * * ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh >> ~/logs/backup.log 2>&1

# Hoặc backup mỗi 6 giờ:
0 */6 * * * ~/giaobanbv-be/docs/server-management/scripts/backup-mongo.sh >> ~/logs/backup.log 2>&1

# Save và thoát (Ctrl+X, Y, Enter)

# Verify cron job
crontab -l

# Xem logs
tail -f ~/logs/backup.log
```

### **Kiểm Tra Backup Có Chạy Không**

```bash
# Xem danh sách backups
ls -lh ~/backups/mongodb/

# Xem backup mới nhất
ls -lt ~/backups/mongodb/ | head -5

# Kiểm tra backup log
tail -50 ~/logs/backup.log
```

---

## 🔄 RESTORE DATABASE

### **⚠️ QUAN TRỌNG: Backup Trước Khi Restore!**

```bash
# Backup database hiện tại trước khi restore
mongodump --db giaobanbv --gzip --archive=~/backups/pre-restore-$(date +%Y%m%d-%H%M%S).gz
```

### **Restore Toàn Bộ Database**

```bash
# Từ folder backup
mongorestore --db giaobanbv ~/backups/mongo-20251116-100000/giaobanbv

# Từ archive
mongorestore --db giaobanbv \
  --gzip \
  --archive=~/backups/giaobanbv-20251116.gz

# Với authentication
mongorestore --db giaobanbv \
  -u giaobanbv_app \
  -p YOUR_PASSWORD \
  --authenticationDatabase giaobanbv \
  --gzip \
  --archive=~/backups/giaobanbv-20251116.gz
```

### **Restore VÀ Drop Database Cũ**

```bash
# ⚠️ CẨN THẬN: Sẽ xóa database hiện tại!
mongorestore --db giaobanbv \
  --drop \
  --gzip \
  --archive=~/backups/giaobanbv-20251116.gz
```

### **Restore 1 Collection Cụ Thể**

```bash
# Restore chỉ collection nhanvien
mongorestore --db giaobanbv \
  --collection nhanvien \
  ~/backups/nhanvien-20251116/giaobanbv/nhanvien.bson

# Với drop collection cũ
mongorestore --db giaobanbv \
  --collection nhanvien \
  --drop \
  ~/backups/nhanvien-20251116/giaobanbv/nhanvien.bson
```

### **Restore Sang Database Khác (Test)**

```bash
# Restore vào database test
mongorestore --db giaobanbv_test \
  --gzip \
  --archive=~/backups/giaobanbv-20251116.gz

# Verify
mongosh
use giaobanbv_test
show collections
db.nhanvien.countDocuments()
```

---

## 📋 RESTORE WORKFLOW

### **Quy Trình Restore An Toàn:**

```bash
# Bước 1: Stop application
pm2 stop giaobanbv-be

# Bước 2: Backup current database
mongodump --db giaobanbv \
  --gzip \
  --archive=~/backups/pre-restore-$(date +%Y%m%d-%H%M%S).gz

# Bước 3: Verify backup file exists
ls -lh ~/backups/giaobanbv-20251116.gz

# Bước 4: Restore
mongorestore --db giaobanbv \
  --drop \
  --gzip \
  --archive=~/backups/giaobanbv-20251116.gz

# Bước 5: Verify restore
mongosh
use giaobanbv
db.nhanvien.countDocuments()
db.congviec.countDocuments()
exit

# Bước 6: Start application
pm2 start giaobanbv-be

# Bước 7: Test application
curl http://localhost:3000/api/health

# Bước 8: Monitor logs
pm2 logs giaobanbv-be --lines 50
```

---

## 🎯 BEST PRACTICES

### **1. Test Restore Thường Xuyên**

```bash
# Hàng tháng, test restore vào database test
mongorestore --db giaobanbv_test \
  --gzip \
  --archive=~/backups/giaobanbv-latest.gz

# Verify data
mongosh giaobanbv_test --eval "db.stats()"

# Cleanup
mongosh giaobanbv_test --eval "db.dropDatabase()"
```

### **2. Backup Sang External Storage**

```bash
# Sao chép backups sang external drive
rsync -av ~/backups/ /mnt/external-drive/backups/

# Hoặc upload lên cloud (AWS S3 example)
aws s3 sync ~/backups/ s3://your-bucket/backups/
```

### **3. Monitor Backup Size**

```bash
# Xem size của tất cả backups
du -sh ~/backups/mongodb/

# Xem trend size tăng/giảm
ls -lh ~/backups/mongodb/ | tail -10
```

### **4. Encrypt Sensitive Backups**

```bash
# Encrypt backup file
gpg --symmetric --cipher-algo AES256 ~/backups/giaobanbv-20251116.gz

# Decrypt khi cần restore
gpg --decrypt ~/backups/giaobanbv-20251116.gz.gpg > ~/backups/giaobanbv-20251116.gz
```

---

## 📊 BACKUP MONITORING

### **Check Backup Script**

```bash
# Xem backup log
tail -f ~/logs/backup.log

# Kiểm tra cron job có chạy không
grep CRON /var/log/syslog | grep backup

# Verify latest backup
LATEST=$(ls -t ~/backups/mongodb/*.gz | head -1)
echo "Latest backup: $LATEST"
ls -lh $LATEST
```

### **Alert Nếu Backup Fail**

```bash
# Thêm vào script backup-mongo.sh (đã có trong script)
# Nếu backup fail, send email hoặc Slack notification
if [ $? -ne 0 ]; then
    # Send alert
    echo "Backup failed!" | mail -s "Backup Alert" admin@example.com
fi
```

---

## 🆘 DISASTER RECOVERY

### **Kịch Bản: Database Bị Corrupt**

```bash
# 1. Stop MongoDB
sudo systemctl stop mongod

# 2. Backup data hiện tại (dù corrupt)
sudo cp -r /var/lib/mongodb /var/lib/mongodb.corrupt

# 3. Repair database
sudo mongod --repair --dbpath /var/lib/mongodb

# 4. Start MongoDB
sudo systemctl start mongod

# 5. Nếu repair fail, restore từ backup
mongorestore --db giaobanbv \
  --drop \
  --gzip \
  --archive=~/backups/giaobanbv-latest.gz

# 6. Verify
mongosh
use giaobanbv
db.stats()
```

### **Kịch Bản: Accidental Data Deletion**

```bash
# Tìm backup gần nhất TRƯỚC khi xóa
ls -lt ~/backups/mongodb/ | head -10

# Restore collection bị xóa
mongorestore --db giaobanbv \
  --collection nhanvien \
  ~/backups/mongo-20251116/giaobanbv/nhanvien.bson
```

---

## 📝 CHECKLIST

### **Hàng Ngày:**

- [ ] Verify automated backup chạy thành công
- [ ] Check backup log: `tail ~/logs/backup.log`
- [ ] Verify disk space cho backups: `df -h ~/backups`

### **Hàng Tuần:**

- [ ] Test restore vào test database
- [ ] Copy backups sang external storage
- [ ] Review backup retention (xóa cũ nếu cần)

### **Hàng Tháng:**

- [ ] Full disaster recovery drill
- [ ] Archive monthly backup
- [ ] Update backup documentation

---

## 🔧 USEFUL COMMANDS

```bash
# Xem size database
mongosh --eval "db.stats().dataSize / 1024 / 1024 + ' MB'"

# Xem size từng collection
mongosh giaobanbv --eval "
  db.getCollectionNames().forEach(function(c) {
    var stats = db[c].stats();
    print(c + ': ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
  });
"

# List tất cả backups
ls -lht ~/backups/mongodb/ | head -20

# Remove backups cũ hơn 30 ngày
find ~/backups/mongodb/ -name "*.gz" -mtime +30 -delete
```

---

**⚠️ NHẮC NHỞ:**

- Backup không có giá trị nếu không test restore!
- Lưu backup ở nhiều nơi (local + cloud/external drive)
- Document password để decrypt backups (nếu có encrypt)

**⬅️ Quay lại:** [MongoDB Management](04-mongodb-management.md)  
**➡️ Tiếp theo:** [Deploy & Update](07-deploy-update.md)
