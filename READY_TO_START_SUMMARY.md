# ✅ KPI REFACTOR - READY TO START SUMMARY

**Ngày:** 17/10/2025  
**Status:** 🟢 APPROVED & READY TO IMPLEMENT

---

## 📌 QUYẾT ĐỊNH CUỐI CÙNG

### 1. MucDoKho Data Type

- ✅ **Cho phép thập phân:** 1.0 - 10.0 (tối đa 1 chữ số: 5.5, 7.2)
- ✅ **Validation:** `Math.round(v * 10) === v * 10`
- ✅ **UI Input:** `<TextField type="number" step="0.1" min="1" max="10" />`

### 2. Default MucDoKho Strategy

- ✅ **Bắt buộc user nhập manually** khi gán nhiệm vụ
- ✅ UI pre-fill từ `MucDoKhoDefault` (editable)
- ✅ Backend: Required field, không default value

### 3. API Architecture

- ✅ **APIs riêng biệt** (theo plan)
- ✅ `POST /gan-theo-chu-ky`, `POST /copy-chu-ky`
- ✅ `GET /assignments?chuKyId=...`

### 4. UI Strategy

- ✅ **Thay thế form cũ hoàn toàn**
- ✅ GanNhiemVuTheoChuKyDialog thay thế flow cũ
- ✅ Backward compatible: `ChuKyDanhGiaID: null` = vĩnh viễn

### 5. Index Migration

- ✅ Drop old unique index manually
- ✅ New composite index: `{ NhanVienID, NhiemVuThuongQuyID, ChuKyDanhGiaID }`
- ✅ `partialFilterExpression: { isDeleted: { $ne: true } }`

---

## 📂 TÀI LIỆU THAM KHẢO

### Main Documents:

1. **REFACTOR_PLAN_KPI_SYSTEM.md** - Chi tiết từng module, code examples
2. **IMPLEMENTATION_STEPS_KPI_REFACTOR.md** - Step-by-step checklist
3. **Copilot Instructions** - Architecture patterns

### File Locations:

```
Backend:
├── models/
│   ├── NhiemVuThuongQuy.js (rename MucDoKho → MucDoKhoDefault)
│   └── NhanVienNhiemVu.js (add ChuKyDanhGiaID, MucDoKho, indexes)
├── controllers/
│   ├── giaoNhiemVu.controller.js (new methods)
│   └── kpi.controller.js (update getChamDiemDetail)
├── services/
│   └── giaoNhiemVu.service.js (ganTheoChuKy, copyChuKy)
├── validators/
│   └── giaoNhiemVu.validator.js (NEW - Joi schemas)
└── routes/
    └── giaoNhiemVu.api.js (new endpoints)

Frontend:
├── features/GiaoNhiemVu/
│   ├── GanNhiemVuTheoChuKyDialog.js (NEW)
│   ├── CopyChuKyDialog.js (NEW)
│   └── giaoNhiemVuSlice.js (new actions)
└── features/KPI/
    └── ChamDiemKPIDialog.js (minor updates)
```

---

## ⏱️ TIMELINE ESTIMATE

| Phase     | Tasks                      | Time          | Status |
| --------- | -------------------------- | ------------- | ------ |
| 0         | Pre-setup (branch, backup) | 15 min        | ⏳     |
| 1         | Backend Models             | 2 hours       | ⏳     |
| 2         | Backend APIs               | 4 hours       | ⏳     |
| 3         | Backend KPI Integration    | 2 hours       | ⏳     |
| 4         | Frontend Assignment UI     | 6 hours       | ⏳     |
| 5         | Frontend KPI UI            | 1 hour        | ⏳     |
| 6         | Testing & Deployment       | 2 hours       | ⏳     |
| **TOTAL** |                            | **~17 hours** |        |

**Suggested Schedule:**

- Day 1 (4h): Phase 0-1 (Models + DB migration)
- Day 2 (4h): Phase 2 (Backend APIs)
- Day 3 (3h): Phase 3 (KPI Integration)
- Day 4 (6h): Phase 4-5 (Frontend)
- Day 5 (2h): Phase 6 (Testing)

---

## 🚨 CRITICAL MANUAL STEPS

### ⚠️ BEFORE Starting Phase 1:

```bash
# 1. Create feature branch
git checkout -b feature/kpi-cycle-based-assignment

# 2. Backup MongoDB
mongodump --db your_database_name --out ./backup-$(date +%Y%m%d)

# 3. Create .env backup
cp .env .env.backup
```

### ⚠️ AFTER Updating NhanVienNhiemVu Model:

```javascript
// MongoDB Shell or Compass - RUN THIS MANUALLY:
use your_database_name

// Drop old unique index
db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1")

// Verify indexes
db.nhanviennhiemvu.getIndexes()

// Restart Node.js server to create new indexes
```

---

## ✅ PRE-FLIGHT CHECKLIST

**Environment:**

- [ ] Node.js server running
- [ ] MongoDB connected
- [ ] Git clean (no uncommitted changes)
- [ ] Database backup created
- [ ] Postman collection ready

**Dependencies:**

- [ ] `joi` installed (for validators)
- [ ] `mongoose` version compatible
- [ ] All existing APIs working

**Documentation:**

- [x] Plan document finalized
- [x] Implementation steps created
- [x] Code examples ready
- [ ] Team notified

---

## 🎯 FIRST STEPS TO START

### Step 1: Create Branch & Backup (5 min)

```bash
git checkout -b feature/kpi-cycle-based-assignment
mongodump --db bcgiaobanbvt --out ./backup-20251017
git add .
git commit -m "feat: Start KPI refactor - cycle-based assignment"
```

### Step 2: Update NhiemVuThuongQuy Model (15 min)

**File:** `modules/workmanagement/models/NhiemVuThuongQuy.js`

**Change line ~23:**

```javascript
// BEFORE:
MucDoKho: {

// AFTER:
MucDoKhoDefault: {
  type: Number,
  default: 5.0,
  min: 1.0,
  max: 10.0,
  validate: {
    validator: (v) => Math.round(v * 10) === v * 10,
    message: 'Độ khó cho phép tối đa 1 chữ số thập phân'
  },
  description: "Độ khó mặc định (tham khảo)"
},
```

**Test:**

```bash
npm start
# Check console for no errors
```

### Step 3: Update NhanVienNhiemVu Model (30 min)

**See IMPLEMENTATION_STEPS_KPI_REFACTOR.md Phase 1 Step 1.2**

### Step 4: Drop Old Index (MANUAL - 5 min)

```javascript
// MongoDB Shell:
db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1");
```

### Step 5: Restart & Verify (5 min)

```bash
npm start
# Check console: "Index created: unique_assignment_per_cycle"
```

---

## 📞 SUPPORT & ESCALATION

**Nếu gặp vấn đề:**

1. **Model errors:** Check Mongoose version, schema syntax
2. **Index errors:** Use MongoDB Compass to inspect indexes
3. **Validation errors:** Test with Postman first
4. **Frontend errors:** Check Redux DevTools

**Contact:**

- Team Lead: [Your Name]
- Database Admin: [DBA Name]
- Frontend Lead: [FE Lead]

---

## 🎉 SUCCESS CRITERIA

**Phase 1-3 (Backend) Complete When:**

- ✅ Models updated, indexes created
- ✅ APIs tested với Postman (200 OK)
- ✅ getChamDiemDetail filter by cycle works
- ✅ MucDoKho validation passes

**Phase 4-5 (Frontend) Complete When:**

- ✅ Dialog mở được, không crash
- ✅ Gán nhiệm vụ → Toast success
- ✅ Table hiển thị chu kỳ + độ khó đúng
- ✅ Copy chu kỳ hoạt động

**Phase 6 (Testing) Complete When:**

- ✅ E2E test pass (gán → chấm → duyệt)
- ✅ Unique constraint works
- ✅ No data loss
- ✅ Staging deployment success

---

## 📚 NEXT ACTIONS

1. **Anh review 2 documents:**

   - REFACTOR_PLAN_KPI_SYSTEM.md
   - IMPLEMENTATION_STEPS_KPI_REFACTOR.md

2. **Confirm start date & time**

3. **Tôi sẽ:**
   - Hỗ trợ từng bước implementation
   - Review code realtime
   - Debug nếu có lỗi
   - Update progress checklist

---

**🚀 SẴN SÀNG BẮT ĐẦU KHI ANH QUYẾT ĐỊNH!**

**Các tài liệu:**

1. ✅ `REFACTOR_PLAN_KPI_SYSTEM.md` - Plan tổng thể
2. ✅ `IMPLEMENTATION_STEPS_KPI_REFACTOR.md` - Checklist chi tiết
3. ✅ `READY_TO_START_SUMMARY.md` - Document này

**Tất cả đã sẵn sàng. Anh muốn bắt đầu bây giờ hay hẹn lịch?** 🎯
