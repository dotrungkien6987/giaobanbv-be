# 🔧 MongoDB Transaction Configuration Guide

## ❌ Lỗi Hiện Tại

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

**Nguyên nhân**: MongoDB đang chạy ở chế độ **standalone** (single server), không hỗ trợ transactions.

---

## ✅ Giải Pháp Đã Áp Dụng

### **Development**: Bỏ Transaction

- File: `modules/workmanagement/controllers/kpi.controller.js`
- Functions modified:
  - ✅ `huyDuyetKPI` (Hủy duyệt KPI)
  - ✅ `duyetKPITieuChi` (Duyệt KPI)
- Thay đổi: Bỏ `session.startTransaction()` và `session.commitTransaction()`
- Sử dụng: `await danhGiaKPI.save()` thay vì `await danhGiaKPI.save({ session })`

**Ưu điểm**:

- ✅ Hoạt động ngay trên MongoDB standalone
- ✅ Không cần cấu hình thêm
- ✅ Phù hợp cho development và small projects

**Nhược điểm**:

- ❌ Không đảm bảo atomicity (nếu có nhiều operations)
- ❌ Có thể bị data inconsistency nếu lỗi giữa chừng

---

## 🚀 Production: Sử dụng MongoDB Replica Set

### **Option A: Convert Standalone → Replica Set (Local Development)**

#### Step 1: Stop MongoDB

```bash
# Windows
net stop MongoDB

# Linux/Mac
sudo systemctl stop mongod
```

#### Step 2: Edit mongod.cfg

```yaml
# File: C:\Program Files\MongoDB\Server\6.0\bin\mongod.cfg (Windows)
# File: /etc/mongod.conf (Linux)

replication:
  replSetName: "rs0"
```

#### Step 3: Start MongoDB

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

#### Step 4: Initialize Replica Set

```bash
mongosh
```

```javascript
// Inside mongosh
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }],
});

// Check status
rs.status();
```

#### Step 5: Update Connection String

```javascript
// config/dbConfig.js
const MONGODB_URI = "mongodb://localhost:27017/yourdb?replicaSet=rs0";
```

---

### **Option B: Conditional Transaction (Hybrid Approach)**

Sử dụng transaction nếu MongoDB hỗ trợ, bỏ qua nếu không:

```javascript
// Helper function
const isReplicaSet = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ isMaster: 1 });
    return info.setName !== undefined;
  } catch (error) {
    return false;
  }
};

// In controller
kpiController.huyDuyetKPI = catchAsync(async (req, res, next) => {
  // ... validation and permission checks ...

  const useTransaction = await isReplicaSet();
  let session = null;

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const historyEntry = {
      /* ... */
    };

    danhGiaKPI.TrangThai = "CHUA_DUYET";
    danhGiaKPI.NgayDuyet = null;
    danhGiaKPI.LichSuHuyDuyet.push(historyEntry);

    // Save with or without session
    await danhGiaKPI.save(session ? { session } : {});

    if (useTransaction) {
      await session.commitTransaction();
    }

    // ... response ...
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});
```

---

### **Option C: MongoDB Atlas (Cloud - Recommended for Production)**

1. Tạo free cluster tại https://cloud.mongodb.com
2. Atlas tự động cung cấp replica set (hỗ trợ transactions)
3. Lấy connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/yourdb
   ```
4. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/yourdb
   ```

**Ưu điểm Atlas**:

- ✅ Replica set sẵn có (hỗ trợ transactions)
- ✅ Automatic backups
- ✅ Free tier 512MB
- ✅ High availability
- ✅ Không cần setup server

---

## 📊 So Sánh Giải Pháp

| Giải pháp             | Dev Time   | Production Ready | Atomicity  | Complexity    |
| --------------------- | ---------- | ---------------- | ---------- | ------------- |
| **No Transaction**    | ⚡ Instant | ⚠️ Risky         | ❌ No      | ⭐ Simple     |
| **Local Replica Set** | 🕐 30 mins | ✅ Yes           | ✅ Yes     | ⭐⭐⭐ Medium |
| **Conditional**       | 🕐 15 mins | ✅ Yes           | ⚠️ Depends | ⭐⭐ Easy     |
| **MongoDB Atlas**     | ⚡ 10 mins | ✅✅ Best        | ✅ Yes     | ⭐ Simple     |

---

## 🎯 Khuyến Nghị

### Development (Current)

✅ **Sử dụng No Transaction** (đã áp dụng)

- Đơn giản, nhanh chóng
- Phù hợp với single-document update như `huyDuyetKPI`

### Staging/Production

🚀 **Sử dụng MongoDB Atlas hoặc Local Replica Set**

- Enable transactions cho data integrity
- Update code để dùng lại transactions

---

## 🔄 Rollback to Transaction (Khi có Replica Set)

```javascript
// Uncomment và restore transaction code:
const session = await mongoose.startSession();
session.startTransaction();

try {
  // ... operations ...
  await danhGiaKPI.save({ session });
  await session.commitTransaction();
  // ... response ...
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## ✅ Kết Luận

**Hiện tại**: Code đã sửa để hoạt động **không cần transactions** trên MongoDB standalone.

**Tương lai**: Nếu deploy production với replica set/Atlas, có thể enable lại transactions để đảm bảo **ACID properties**.

**Lưu ý**: `huyDuyetKPI` chỉ update 1 document nên risk thấp. Transactions quan trọng hơn khi có multiple-document operations (ví dụ: update DanhGiaKPI + NhiemVuThuongQuy + ChuKy cùng lúc).
