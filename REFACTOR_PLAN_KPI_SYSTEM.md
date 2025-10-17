# 📋 KẾ HOẠCH REFACTOR HỆ THỐNG KPI - CHU KỲ & ĐỘ KHÓ THỰC TẾ

**Ngày tạo:** 17/10/2025  
**Người tạo:** Development Team  
**Mục đích:** Refactor hệ thống KPI để hỗ trợ gán nhiệm vụ theo chu kỳ và độ khó thực tế  
**Trạng thái:** ✅ APPROVED - Ready to implement

---

## 🔧 QUYẾT ĐỊNH KỸ THUẬT (FINALIZED)

### ✅ Decision 1: MucDoKho Data Type

- **Type:** `Number` với 1 chữ số thập phân
- **Range:** 1.0 - 10.0 (VD: 5.5, 7.2, 8.0)
- **Validation:** Math.round(v _ 10) === v _ 10
- **UI Input:** `<TextField type="number" step="0.1" min="1" max="10" />`

### ✅ Decision 2: Default MucDoKho Strategy

- **Rule:** Bắt buộc user nhập manually khi gán nhiệm vụ
- **UI:** Pre-fill với `NhiemVuThuongQuy.MucDoKhoDefault` (editable)
- **Backend:** Required field, không có default value tự động

### ✅ Decision 3: API Architecture

- **Approach:** APIs riêng biệt (Option A - theo plan)
- **Endpoints:**
  - `POST /api/workmanagement/giao-nhiem-vu/gan-theo-chu-ky`
  - `POST /api/workmanagement/giao-nhiem-vu/copy-chu-ky`
  - `GET /api/workmanagement/giao-nhiem-vu/assignments` (with `?chuKyId` filter)
- **Reason:** Clear separation of concerns, easier to maintain

### ✅ Decision 4: UI Strategy

- **Approach:** Thay thế form cũ hoàn toàn
- **Implementation:** GanNhiemVuTheoChuKyDialog thay thế toàn bộ flow cũ
- **Backward Compatibility:** `ChuKyDanhGiaID: null` = gán vĩnh viễn

### ✅ Decision 5: Index Migration

- **Action:** Drop old unique index `{ NhanVienID, NhiemVuThuongQuyID }`
- **New Index:** Composite `{ NhanVienID, NhiemVuThuongQuyID, ChuKyDanhGiaID }` with partialFilterExpression
- **Manual Step:** `db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1")`

---

## 🎯 TỔNG QUAN

### Vấn đề hiện tại:

1. **Gán nhiệm vụ vĩnh viễn** → Không linh hoạt khi nhiệm vụ thay đổi theo tháng/quý
2. **Độ khó cố định** từ template → Không phản ánh năng lực thực tế của từng nhân viên
3. **Rebuild logic** mỗi lần fetch → Mất dữ liệu điểm đã chấm

### Giải pháp:

1. Thêm `ChuKyDanhGiaID` vào `NhanVienNhiemVu` (gán theo chu kỳ)
2. Thêm `MucDoKho` (actual) vào `NhanVienNhiemVu` (độ khó thực tế)
3. Rename `NhiemVuThuongQuy.MucDoKho` → `MucDoKhoDefault` (chỉ tham khảo)
4. Fix logic `getChamDiemDetail` (differential sync, không rebuild)

---

## 📊 PHẠM VI THAY ĐỔI

### Backend:

- **3 Models:** NhiemVuThuongQuy, NhanVienNhiemVu, DanhGiaNhiemVuThuongQuy
- **2 Controllers:** assignment.controller.js, kpi.controller.js
- **5 APIs mới:** ganNhiemVuTheoChuKy, copyChuKy, layDanhSachTheoChuKy, etc.

### Frontend:

- **2 Dialogs mới:** GanNhiemVuTheoChuKyDialog, CopyChuKyDialog
- **2 Redux slices:** giaoNhiemVuSlice, kpiSlice
- **3 Components update:** NhiemVuThuongQuyForm, ChamDiemKPIDialog, NhiemVuTable

### Database:

- **0 Migration scripts** (assume no existing KPI data)
- **2 New indexes:** Composite unique index on NhanVienNhiemVu

---

## 🗂️ CHI TIẾT TỪNG MODULE

---

## MODULE 1: Model `NhiemVuThuongQuy`

### 📍 File: `modules/workmanagement/models/NhiemVuThuongQuy.js`

### Hiện tại:

```javascript
const schema = new Schema({
  TenNhiemVu: { type: String, required: true },
  MoTa: String,
  MucDoKho: { type: Number, default: 5 }, // ← Dùng để chấm điểm (SAI)
  TrangThaiHoatDong: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
});
```

### Cần sửa:

```javascript
const schema = new Schema({
  TenNhiemVu: { type: String, required: true },
  MoTa: String,
  MucDoKhoDefault: {
    type: Number,
    default: 5.0,
    min: 1.0,
    max: 10.0,
    validate: {
      validator: (v) => Math.round(v * 10) === v * 10,
      message: "Độ khó cho phép tối đa 1 chữ số thập phân (VD: 5.5)",
    },
    description: "Độ khó mặc định (tham khảo), cho phép 1 chữ số thập phân",
  }, // ✅ Rename: chỉ tham khảo
  TrangThaiHoatDong: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
});
```

### Impact:

- ✅ **Low:** Chỉ đổi tên field
- ⚠️ **Breaking Change:** Tất cả API/UI đang dùng `MucDoKho` phải đổi thành `MucDoKhoDefault`

### Files ảnh hưởng:

**Backend:**

- `modules/workmanagement/controllers/nhiemvu.controller.js` (CRUD)
- `modules/workmanagement/controllers/kpi.controller.js` (getChamDiemDetail - line 950)

**Frontend:**

- `src/features/NhiemVuThuongQuy/NhiemVuThuongQuyForm.js`
- `src/features/NhiemVuThuongQuy/NhiemVuThuongQuyTable.js`
- `src/features/NhiemVuThuongQuy/nhiemVuSlice.js`

### Test cases:

- [ ] CRUD nhiệm vụ thường quy hiển thị đúng label "Độ khó mặc định (tham khảo)"
- [ ] API trả về `MucDoKhoDefault` thay vì `MucDoKho`
- [ ] Frontend hiển thị tooltip giải thích ý nghĩa

---

## MODULE 2: Model `NhanVienNhiemVu`

### 📍 File: `modules/workmanagement/models/NhanVienNhiemVu.js`

### Hiện tại:

```javascript
const schema = new Schema({
  NhanVienID: { type: ObjectId, ref: "NhanVien", required: true },
  NhiemVuThuongQuyID: {
    type: ObjectId,
    ref: "NhiemVuThuongQuy",
    required: true,
  },
  TrangThaiHoatDong: { type: Boolean, default: true },
  NgayGan: { type: Date, default: Date.now },
  NguoiGanID: { type: ObjectId, ref: "NhanVien" },
  isDeleted: { type: Boolean, default: false },
});

// Index
schema.index({ NhanVienID: 1, NhiemVuThuongQuyID: 1 });
```

**Vấn đề:**

- ❌ Không có `ChuKyDanhGiaID` → Không gán theo chu kỳ
- ❌ Không có `MucDoKho` → Không lưu độ khó thực tế
- ❌ Index không đủ → Có thể duplicate khi gán lại cho nhiều chu kỳ

### Cần sửa:

```javascript
const schema = new Schema(
  {
    NhanVienID: {
      type: ObjectId,
      ref: "NhanVien",
      required: true,
      index: true,
    },
    NhiemVuThuongQuyID: {
      type: ObjectId,
      ref: "NhiemVuThuongQuy",
      required: true,
      index: true,
    },

    // ✅ NEW: Gán theo chu kỳ (null = vĩnh viễn, backward compatible)
    ChuKyDanhGiaID: {
      type: ObjectId,
      ref: "ChuKyDanhGia",
      default: null,
      index: true,
    },

    // ✅ NEW: Độ khó thực tế (dùng để chấm điểm) - BẮT BUỘC USER NHẬP
    MucDoKho: {
      type: Number,
      required: true,
      min: 1.0,
      max: 10.0,
      validate: {
        validator: (v) => Math.round(v * 10) === v * 10,
        message:
          "MucDoKho phải là số từ 1.0-10.0 với tối đa 1 chữ số thập phân (VD: 5.5, 7.2)",
      },
      description:
        "Độ khó thực tế cho nhân viên này (user nhập manually khi gán)",
    },

    TrangThaiHoatDong: { type: Boolean, default: true },
    NgayGan: { type: Date, default: Date.now },
    NguoiGanID: { type: ObjectId, ref: "NhanVien" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ NEW: Composite unique index
// Một nhiệm vụ chỉ được gán 1 lần cho 1 nhân viên trong 1 chu kỳ
schema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1, ChuKyDanhGiaID: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    name: "unique_assignment_per_cycle",
  }
);

// ✅ NON-UNIQUE index for query performance (backward compatible)
// NOTE: Old unique index { NhanVienID: 1, NhiemVuThuongQuyID: 1, unique: true } phải DROP
schema.index({ NhanVienID: 1, NhiemVuThuongQuyID: 1 });
```

**⚠️ MANUAL DB STEP REQUIRED:**

```javascript
// Run in MongoDB shell or Compass:
db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1");
// Sau đó restart server để Mongoose tạo indexes mới
```

### Impact:

- 🔴 **High:** Core model thay đổi → Ảnh hưởng toàn bộ luồng gán & chấm KPI
- ✅ **Backward Compatible:** `ChuKyDanhGiaID: null` = gán vĩnh viễn (old behavior)

### Logic nghiệp vụ:

```javascript
// Gán vĩnh viễn (backward compatible)
{
  NhanVienID: "nv-001",
  NhiemVuThuongQuyID: "nv-baocao",
  ChuKyDanhGiaID: null,        // ← Null = permanent
  MucDoKho: 5                  // ← Actual difficulty
}

// Gán cho Q1/2025
{
  NhanVienID: "nv-001",
  NhiemVuThuongQuyID: "nv-kpi",
  ChuKyDanhGiaID: "q1-2025",   // ← For Q1 only
  MucDoKho: 7                  // ← Adjusted for this employee
}

// ✅ Unique constraint prevents duplicate:
// - Không thể gán "nv-kpi" cho "nv-001" trong Q1 2 lần
// - Nhưng có thể gán cho Q2 (khác ChuKyDanhGiaID)
```

### Files ảnh hưởng:

**Backend:**

- `modules/workmanagement/controllers/assignment.controller.js` (toàn bộ CRUD)
- `modules/workmanagement/controllers/kpi.controller.js` (getChamDiemDetail - line 900+)

**Frontend:**

- `src/features/GiaoNhiemVu/` (toàn bộ folder cần rebuild)

### Test cases:

- [ ] Gán vĩnh viễn (`ChuKyDanhGiaID: null`) vẫn hoạt động
- [ ] Gán cho Q1 → Gán lại cho Q1 → Error duplicate
- [ ] Gán cho Q1 → Gán cho Q2 → OK (khác chu kỳ)
- [ ] `MucDoKho` = 5.5 → OK (decimal allowed)
- [ ] `MucDoKho` = 5.55 → Error (quá 1 chữ số thập phân)
- [ ] `MucDoKho` = 11 → Error (vượt max)
- [ ] Gán không nhập `MucDoKho` → Error (required field)
- [ ] Soft delete (`isDeleted: true`) không vi phạm unique constraint

---

## MODULE 3: Backend API - Giao Nhiệm Vụ

### 📍 Files:

- `modules/workmanagement/controllers/giaoNhiemVu.controller.js` (NEW controller)
- `modules/workmanagement/services/giaoNhiemVu.service.js` (NEW service)
- `modules/workmanagement/routes/giaoNhiemVu.api.js` (UPDATE routes)

### Strategy:

- ✅ **THAY THẾ** flow cũ hoàn toàn
- ✅ Tất cả APIs mới đều yêu cầu `MucDoKho` (user nhập manually)
- ✅ `ChuKyDanhGiaID` nullable (null = gán vĩnh viễn)

### Hiện tại (sẽ DEPRECATED):

```javascript
// ❌ OLD: POST /api/workmanagement/giao-nhiem-vu/assignments
// Không support ChuKyDanhGiaID, không có MucDoKho
ctrl.assignOne = catchAsync(async (req, res) => {
  const { NhanVienID, NhiemVuThuongQuyID } = req.body;
  // Tạo assignment không có MucDoKho, không có ChuKyDanhGiaID
});
```

### Cần thêm mới:

#### **API 1: Gán nhiệm vụ theo chu kỳ (THAY THẾ assignOne)**

```javascript
/**
 * @route POST /api/workmanagement/giao-nhiem-vu/gan-theo-chu-ky
 * @desc Gán nhiệm vụ cho nhân viên theo chu kỳ (hoặc vĩnh viễn)
 * @body {
 *   ChuKyDanhGiaID: String | null,  // null = permanent
 *   NhanVienID: String,
 *   assignments: [
 *     {
 *       NhiemVuThuongQuyID: String,
 *       MucDoKho: Number  // ✅ REQUIRED - user nhập manually
 *     }
 *   ]
 * }
 * @access Private (Manager with QuanLyNhanVien permission)
 */
service.ganNhiemVuTheoChuKy = async (req, data) => {
  // 1. Permission check
  // 2. Validate MucDoKho (1.0-10.0, 1 decimal)
  // 3. Upsert NhanVienNhiemVu với ChuKyDanhGiaID + MucDoKho
  // 4. Return created/updated assignments
};
```

#### **API 2: Copy nhiệm vụ giữa các chu kỳ**

```javascript
/**
 * @route POST /api/workmanagement/giao-nhiem-vu/copy-chu-ky
 * @desc Copy nhiệm vụ từ chu kỳ cũ sang chu kỳ mới (bao gồm MucDoKho)
 * @body {
 *   NhanVienID: String,
 *   FromChuKyID: String,
 *   ToChuKyID: String,
 *   adjustMucDoKho: Boolean  // ✅ NEW: Cho phép điều chỉnh độ khó sau khi copy
 * }
 * @access Private (Manager)
 */
service.copyChuKy = async (req, data) => {
  // 1. Permission check
  // 2. Load assignments from FromChuKyID
  // 3. Create new assignments for ToChuKyID (copy MucDoKho)
  // 4. Return { copiedCount, assignments }
};
```

#### **API 3: Lấy danh sách theo chu kỳ (UPDATE existing)**

```javascript
/**
 * @route GET /api/workmanagement/giao-nhiem-vu/assignments
 * @query NhanVienID (required), chuKyId (optional)
 * @desc Lấy danh sách nhiệm vụ đã gán (filter theo chu kỳ)
 * @access Private
 */
service.getAssignmentsByEmployee = async (req, NhanVienID) => {
  const { chuKyId } = req.query;
  const query = {
    NhanVienID,
    isDeleted: false,
    TrangThaiHoatDong: true,
  };

  if (chuKyId) {
    query.$or = [
      { ChuKyDanhGiaID: chuKyId },
      { ChuKyDanhGiaID: null }, // ✅ Include permanent assignments
    ];
  }

  return await NhanVienNhiemVu.find(query)
    .populate("NhiemVuThuongQuyID") // ← Include MucDoKhoDefault
    .populate("NguoiGanID")
    .sort({ NgayGan: -1 });
};
```

#### **API 4: Cập nhật độ khó (OPTIONAL - có thể skip)**

```javascript
/**
 * @route PUT /api/workmanagement/giao-nhiem-vu/assignments/:id/muc-do-kho
 * @desc Cập nhật độ khó thực tế cho assignment (sau khi đã gán)
 * @body { MucDoKho: Number }
 * @access Private (Manager)
 *
 * NOTE: Có thể skip API này - user có thể gỡ gán rồi gán lại với độ khó mới
 */
service.capNhatMucDoKho = async (req, assignmentId, MucDoKho) => {
  // 1. Permission check
  // 2. Validate MucDoKho
  // 3. Update NhanVienNhiemVu
  // 4. Return updated assignment
};
```

### Routes cần thêm:

```javascript
// File: modules/workmanagement/routes/giaoNhiemVu.api.js

// ✅ NEW: Gán theo chu kỳ (thay thế POST /assignments)
router.post(
  "/gan-theo-chu-ky",
  authentication.loginRequired,
  validators.validate(validators.ganTheoChuKySchema),
  ctrl.ganNhiemVuTheoChuKy
);

// ✅ NEW: Copy chu kỳ
router.post(
  "/copy-chu-ky",
  authentication.loginRequired,
  validators.validate(validators.copyChuKySchema),
  ctrl.copyChuKy
);

// ✅ KEEP: Lấy danh sách (đã có, chỉ cần thêm chuKyId query)
router.get(
  "/assignments",
  authentication.loginRequired,
  ctrl.getAssignmentsByEmployee // Existing, supports ?chuKyId
);

// ✅ OPTIONAL: Update độ khó
router.put(
  "/assignments/:assignmentId/muc-do-kho",
  authentication.loginRequired,
  validators.validate(validators.updateMucDoKhoSchema),
  ctrl.capNhatMucDoKho
);

// ✅ DEPRECATE: POST /assignments (old assignOne - không dùng nữa)
// router.post("/assignments", ctrl.assignOne);  // ← Comment out
```

### Validators cần thêm:

```javascript
// File: modules/workmanagement/validators/giaoNhiemVu.validator.js (NEW file)

const Joi = require("joi");

const validators = {};

// ✅ Validator cho độ khó (cho phép 1 chữ số thập phân)
const mucDoKhoValidator = Joi.number()
  .min(1.0)
  .max(10.0)
  .custom((value, helpers) => {
    // Check 1 decimal place
    if (Math.round(value * 10) !== value * 10) {
      return helpers.error("any.invalid");
    }
    return value;
  })
  .required()
  .messages({
    "number.min": "Độ khó phải >= 1.0",
    "number.max": "Độ khó phải <= 10.0",
    "any.invalid": "Độ khó cho phép tối đa 1 chữ số thập phân (VD: 5.5, 7.2)",
    "any.required": "Độ khó là bắt buộc - vui lòng nhập thủ công",
  });

validators.ganTheoChuKySchema = Joi.object({
  ChuKyDanhGiaID: Joi.string().allow(null).optional(),
  NhanVienID: Joi.string().required(),
  assignments: Joi.array()
    .items(
      Joi.object({
        NhiemVuThuongQuyID: Joi.string().required(),
        MucDoKho: mucDoKhoValidator, // ✅ REQUIRED - user nhập
      })
    )
    .min(1)
    .required(),
});

validators.copyChuKySchema = Joi.object({
  NhanVienID: Joi.string().required(),
  FromChuKyID: Joi.string().required(),
  ToChuKyID: Joi.string().required(),
  adjustMucDoKho: Joi.boolean().optional().default(false),
});

validators.updateMucDoKhoSchema = Joi.object({
  MucDoKho: mucDoKhoValidator,
});

module.exports = validators;
```

      })
    )
    .min(1)
    .required(),

});

validators.copyChuKySchema = Joi.object({
NhanVienID: Joi.string().required(),
FromChuKyID: Joi.string().required(),
ToChuKyID: Joi.string().required(),
});

validators.updateMucDoKhoSchema = Joi.object({
MucDoKho: Joi.number().integer().min(1).max(10).required(),
});

````

### Test cases:

- [ ] Gán nhiệm vụ cho Q1 → 200 OK
- [ ] Gán lại nhiệm vụ cho Q1 → 200 OK (upsert)
- [ ] Gán nhiệm vụ không có quyền → 403 Forbidden
- [ ] Copy từ Q1 → Q2 → 200 OK, `copiedCount` đúng
- [ ] Copy từ chu kỳ không có nhiệm vụ → 404 Not Found
- [ ] Cập nhật độ khó = 11 → 400 Bad Request (validation)
- [ ] Lấy danh sách theo Q1 → Bao gồm cả permanent

---

## MODULE 4: Backend API - Chấm KPI

### 📍 File: `modules/workmanagement/controllers/kpi.controller.js`

### Hiện tại (Line 900-950):

```javascript
kpiController.getChamDiemDetail = catchAsync(async (req, res) => {
  // ... upsert DanhGiaKPI ...

  // ❌ BUG: Không filter theo ChuKyDanhGiaID
  const raw = await NhanVienNhiemVu.find({
    NhanVienID: nhanVienId,
    isDeleted: { $ne: true },
  }).populate('NhiemVuThuongQuyID');

  // ... differential sync ...

  // ❌ BUG: Dùng MucDoKho từ template
  const payloads = toAdd.map((nvItem) => ({
    MucDoKho: nvItem.NhiemVuThuongQuyID.MucDoKho,  // ← SAI
  }));

  // ❌ BUG: Update MucDoKho từ template mỗi lần fetch
  if (exist.MucDoKho !== a.NhiemVuThuongQuyID.MucDoKho) {
    await DanhGiaNhiemVuThuongQuy.updateOne(...);
  }
});
````

### Cần sửa (Line 900-950):

```javascript
kpiController.getChamDiemDetail = catchAsync(async (req, res) => {
  const { chuKyId, nhanVienId } = req.query;

  // ... upsert DanhGiaKPI ...

  // ✅ FIX: Filter by ChuKyDanhGiaID
  const raw = await NhanVienNhiemVu.find({
    NhanVienID: nhanVienId,
    $or: [
      { ChuKyDanhGiaID: chuKyId },      // ← Chu kỳ này
      { ChuKyDanhGiaID: null }          // ← Vĩnh viễn
    ],
    isDeleted: { $ne: true },
  })
    .populate({
      path: 'NhiemVuThuongQuyID',
      select: 'TenNhiemVu MoTa MucDoKhoDefault'  // ← Đổi tên field
    })
    .lean();

  // ... differential sync (keep unchanged) ...

  // ✅ FIX: Use actual MucDoKho from NhanVienNhiemVu
  const payloads = toAdd.map((nvItem) => ({
    DanhGiaKPIID: danhGiaKPI._id,
    NhiemVuThuongQuyID: nvItem.NhiemVuThuongQuyID._id,
    NhanVienID: nhanVienId,
    MucDoKho: nvItem.MucDoKho,  // ✅ Use actual (from NhanVienNhiemVu)
    ChiTietDiem: tieuChiList.map(...),
  }));

  // ✅ REMOVE: Logic update MucDoKho từ template (không cần nữa)
  // await Promise.all(
  //   assignments.map(async (a) => {
  //     const exist = existingMap.get(...);
  //     if (exist && exist.MucDoKho !== a.NhiemVuThuongQuyID.MucDoKho) {
  //       await DanhGiaNhiemVuThuongQuy.updateOne(...);
  //     }
  //   })
  // );
});
```

### Logic flow mới:

```
1. User mở form chấm KPI (Q1/2025, NV-A)
   ↓
2. Backend query NhanVienNhiemVu:
   - WHERE NhanVienID = NV-A
   - AND (ChuKyDanhGiaID = Q1 OR ChuKyDanhGiaID IS NULL)
   ↓
3. Result: [
     { NhiemVuID: "nv-baocao", MucDoKho: 5, ChuKyDanhGiaID: null },      // Permanent
     { NhiemVuID: "nv-kpi", MucDoKho: 7, ChuKyDanhGiaID: "q1-2025" }     // Q1 only
   ]
   ↓
4. Differential sync:
   - Nếu DanhGiaNhiemVuThuongQuy chưa có "nv-kpi" → Tạo mới với MucDoKho = 7
   - Nếu đã có → GIỮ NGUYÊN (không rebuild, không mất điểm)
   ↓
5. Return nhiemVuList (2 nhiệm vụ) với MucDoKho thực tế
```

### Test cases:

- [ ] Fetch chấm điểm Q1 → Bao gồm nhiệm vụ Q1 + permanent
- [ ] Fetch chấm điểm Q2 → Chỉ nhiệm vụ Q2 + permanent (không có Q1)
- [ ] MucDoKho hiển thị = actual (từ NhanVienNhiemVu), không phải template
- [ ] Gán thêm nhiệm vụ mới → Auto-sync (không mất điểm cũ)
- [ ] Xóa nhiệm vụ khỏi assignment → Soft delete (không mất lịch sử)

---

## MODULE 5: Frontend - Giao Nhiệm Vụ

### 📍 Folder: `src/features/GiaoNhiemVu/`

### Hiện tại:

```
GiaoNhiemVu/
  GiaoNhiemVuForm.js       // Simple form: Chọn NV + nhiệm vụ
  GiaoNhiemVuTable.js      // List assignments
  giaoNhiemVuSlice.js      // Redux: ganNhiemVu, xoaNhiemVu
```

**Vấn đề:**

- ❌ Không chọn chu kỳ
- ❌ Không set độ khó thực tế
- ❌ Không có chức năng copy

### Cần xây dựng mới:

```
GiaoNhiemVu/
  GanNhiemVuTheoChuKyDialog.js     // ✅ NEW: Main dialog
    - Chọn chu kỳ (nullable)
    - Table nhiệm vụ + checkbox + độ khó
    - Button "Copy từ chu kỳ trước"

  CopyChuKyDialog.js                // ✅ NEW: Copy dialog
    - Chọn chu kỳ nguồn
    - Chọn chu kỳ đích
    - Preview nhiệm vụ sẽ copy

  DanhSachNhiemVuTable.js           // ✅ UPDATE: Add columns
    - Column "Chu kỳ" (badge: "Vĩnh viễn" | "Q1/2025")
    - Column "Độ khó thực tế"
    - Filter by chu kỳ

  giaoNhiemVuSlice.js               // ✅ UPDATE: New actions
    - ganNhiemVuTheoChuKy()
    - copyChuKy()
    - layDanhSachTheoChuKy()
```

### Component mới: `GanNhiemVuTheoChuKyDialog.js`

```javascript
function GanNhiemVuTheoChuKyDialog({ open, onClose, nhanVien }) {
  const [chuKy, setChuKy] = useState(null); // null = permanent
  const [selected, setSelected] = useState([]); // [{ NhiemVuThuongQuyID, MucDoKho }]

  const handleSubmit = async () => {
    await dispatch(
      ganNhiemVuTheoChuKy({
        ChuKyDanhGiaID: chuKy?._id || null,
        NhanVienID: nhanVien._id,
        assignments: selected,
      })
    );
  };

  const handleCopy = () => {
    // Open CopyChuKyDialog
  };

  return (
    <Dialog maxWidth="md">
      <DialogTitle>Gán nhiệm vụ cho {nhanVien.Ten}</DialogTitle>

      {/* Chọn chu kỳ */}
      <Autocomplete
        value={chuKy}
        onChange={(e, val) => setChuKy(val)}
        options={chuKyList}
        label="Chu kỳ đánh giá"
        placeholder="Để trống = Gán vĩnh viễn"
      />

      {/* Table nhiệm vụ */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">Chọn</TableCell>
            <TableCell>Nhiệm vụ</TableCell>
            <TableCell>Độ khó mặc định</TableCell>
            <TableCell>Độ khó thực tế</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nhiemVuList.map((nv) => (
            <TableRow key={nv._id}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isSelected(nv._id)}
                  onChange={(e) => handleToggle(nv, e.target.checked)}
                />
              </TableCell>
              <TableCell>{nv.TenNhiemVu}</TableCell>
              <TableCell>{nv.MucDoKhoDefault}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={getMucDoKho(nv._id)}
                  onChange={(e) => handleChangeMucDoKho(nv._id, e.target.value)}
                  inputProps={{ min: 1, max: 10 }}
                  sx={{ width: 80 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DialogActions>
        <Button onClick={handleCopy}>Copy từ chu kỳ trước</Button>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Gán nhiệm vụ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Redux slice updates:

```javascript
// File: src/features/GiaoNhiemVu/giaoNhiemVuSlice.js

// ✅ NEW Action
export const ganNhiemVuTheoChuKy = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      "/workmanagement/assignments/gan-theo-chu-ky",
      data
    );
    dispatch(slice.actions.ganNhiemVuTheoChuKySuccess(response.data.data));
    toast.success("Gán nhiệm vụ thành công");
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};

// ✅ NEW Action
export const copyChuKy = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      "/workmanagement/assignments/copy-chu-ky",
      data
    );
    dispatch(slice.actions.copyChuKySuccess(response.data.data));
    toast.success(`Đã copy ${response.data.data.copiedCount} nhiệm vụ`);
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};
```

### Test cases:

- [ ] Mở dialog → Load danh sách nhiệm vụ + chu kỳ
- [ ] Chọn nhiệm vụ → Checkbox + text field độ khó hoạt động
- [ ] Để trống chu kỳ → Gán vĩnh viễn (`ChuKyDanhGiaID: null`)
- [ ] Chọn Q1 + gán → Success toast + reload table
- [ ] Click "Copy từ chu kỳ trước" → Mở CopyChuKyDialog
- [ ] Validation độ khó: < 1 hoặc > 10 → Error

---

## MODULE 6: Frontend - Chấm KPI

### 📍 File: `src/features/KPI/ChamDiemKPIDialog.js`

### Hiện tại:

```javascript
<TableRow>
  <TableCell>{nhiemVu.NhiemVuThuongQuyID.TenNhiemVu}</TableCell>
  <TableCell>Độ khó: {nhiemVu.MucDoKho}</TableCell> // ← Hiển thị sai
  <TableCell>{/* Input chấm điểm */}</TableCell>
</TableRow>
```

**Vấn đề:**

- ❌ `nhiemVu.MucDoKho` là actual (đúng), nhưng không có tooltip giải thích
- ❌ Không hiển thị độ khó mặc định (reference)

### Cần sửa:

```javascript
<TableRow>
  <TableCell>
    <Typography variant="subtitle2">
      {nhiemVu.NhiemVuThuongQuyID.TenNhiemVu}
    </Typography>
  </TableCell>
  <TableCell>
    <Box display="flex" alignItems="center" gap={1}>
      <Typography>
        Độ khó: <strong>{nhiemVu.MucDoKho}</strong>
      </Typography>
      <Tooltip
        title={`Độ khó mặc định: ${nhiemVu.NhiemVuThuongQuyID.MucDoKhoDefault}`}
      >
        <InfoIcon fontSize="small" color="action" />
      </Tooltip>
    </Box>
  </TableCell>
  <TableCell>{/* Input chấm điểm */}</TableCell>
</TableRow>
```

### Redux slice:

```javascript
// File: src/features/KPI/kpiSlice.js

// ✅ No changes needed - Backend already returns correct data
// - nhiemVu.MucDoKho = actual (from NhanVienNhiemVu)
// - nhiemVu.NhiemVuThuongQuyID.MucDoKhoDefault = template
```

### Test cases:

- [ ] Mở form chấm điểm → Hiển thị độ khó thực tế (actual)
- [ ] Hover icon ⓘ → Tooltip hiển thị độ khó mặc định
- [ ] Độ khó = 7, mặc định = 5 → Hiển thị đúng cả 2
- [ ] Chấm điểm → DiemNhiemVu = (MucDoKho × TongDiem) / 100 (dùng actual)

---

## 📅 TIMELINE IMPLEMENTATION

### **PHASE 1: Backend Foundation** (4-5 hours)

**Day 1 Morning (2h):**

- ✅ Update `NhiemVuThuongQuy` model
  - Rename `MucDoKho` → `MucDoKhoDefault`
  - Update indexes (if any)
- ✅ Update `NhanVienNhiemVu` model
  - Add `ChuKyDanhGiaID` field (nullable, indexed)
  - Add `MucDoKho` field (required, 1-10)
  - Add composite unique index
- ✅ Test models với MongoDB Compass/Postman

**Day 1 Afternoon (2-3h):**

- ✅ Create `ganNhiemVuTheoChuKy` API
- ✅ Create `copyChuKy` API
- ✅ Update `layDanhSachNhiemVu` API (filter by chu kỳ)
- ✅ Create validators (Joi schemas)
- ✅ Test APIs with Postman collection

---

### **PHASE 2: Backend Integration** (2-3 hours)

**Day 2 Morning (2-3h):**

- ✅ Update `kpi.controller.js` → `getChamDiemDetail`
  - Line 900+: Add filter `ChuKyDanhGiaID`
  - Line 950+: Use actual `MucDoKho` from `NhanVienNhiemVu`
  - Remove logic update `MucDoKho` from template
- ✅ Update other controllers using `NhiemVuThuongQuy.MucDoKho`
  - Search: `grep -r "MucDoKho" modules/`
  - Replace with `MucDoKhoDefault`
- ✅ Test end-to-end: Gán → Fetch chấm điểm → Verify data

---

### **PHASE 3: Frontend - Giao Nhiệm Vụ** (6-7 hours)

**Day 2 Afternoon (3h):**

- ✅ Create `GanNhiemVuTheoChuKyDialog.js`
  - Layout: Autocomplete chu kỳ + Table nhiệm vụ
  - State management: selected nhiệm vụ + độ khó
  - Submit handler: Call API `ganNhiemVuTheoChuKy`
- ✅ Create `CopyChuKyDialog.js`
  - Layout: 2 Autocomplete (from/to chu kỳ) + Preview list
  - Submit handler: Call API `copyChuKy`

**Day 3 Morning (3-4h):**

- ✅ Update `giaoNhiemVuSlice.js`
  - Add `ganNhiemVuTheoChuKy` thunk
  - Add `copyChuKy` thunk
  - Add reducers: `ganNhiemVuTheoChuKySuccess`, `copyChuKySuccess`
- ✅ Update `DanhSachNhiemVuTable.js`
  - Add column "Chu kỳ" (badge component)
  - Add column "Độ khó thực tế"
  - Add filter dropdown (chu kỳ)
- ✅ Integration: Replace old form with new dialog

---

### **PHASE 4: Frontend - Chấm KPI** (1 hour)

**Day 3 Afternoon (1h):**

- ✅ Update `ChamDiemKPIDialog.js`
  - Display actual `MucDoKho` with bold style
  - Add tooltip for `MucDoKhoDefault`
  - Update column layout
- ✅ Test: Verify độ khó hiển thị đúng

---

### **PHASE 5: Testing & Documentation** (2 hours)

**Day 4 (2h):**

- ✅ E2E testing:
  1. Gán vĩnh viễn → Fetch chấm điểm → Verify
  2. Gán theo Q1 → Fetch Q1 → Verify (không có Q2)
  3. Copy Q1 → Q2 → Verify copied
  4. Chấm điểm → Duyệt → Verify tính điểm đúng
- ✅ Update API documentation (Swagger/Postman)
- ✅ Update user guide (screenshots + workflow)
- ✅ Code review + fix bugs
- ✅ Deploy to staging

---

## ✅ CHECKLIST TỔNG THỂ

### Backend:

- [ ] Update `NhiemVuThuongQuy` model (rename field)
- [ ] Update `NhanVienNhiemVu` model (add fields + index)
- [ ] Create `ganNhiemVuTheoChuKy` API
- [ ] Create `copyChuKy` API
- [ ] Create `capNhatMucDoKho` API
- [ ] Update `layDanhSachNhiemVu` API
- [ ] Update `getChamDiemDetail` controller
- [ ] Update all CRUD controllers using `MucDoKho`
- [ ] Create validators (Joi schemas)
- [ ] Test all endpoints

### Frontend:

- [ ] Create `GanNhiemVuTheoChuKyDialog` component
- [ ] Create `CopyChuKyDialog` component
- [ ] Update `giaoNhiemVuSlice` (add actions + reducers)
- [ ] Update `DanhSachNhiemVuTable` (add columns + filter)
- [ ] Update `ChamDiemKPIDialog` (display actual + tooltip)
- [ ] Update `NhiemVuThuongQuyForm` (label: "Độ khó mặc định")
- [ ] Test all UI flows

### Testing:

- [ ] Unit tests (backend APIs)
- [ ] Integration tests (E2E workflows)
- [ ] UI tests (form validation, data display)
- [ ] Edge cases (duplicate, permission, etc.)

### Documentation:

- [ ] API docs (Swagger/Postman collection)
- [ ] User guide (workflow + screenshots)
- [ ] Technical docs (this file updated)
- [ ] CHANGELOG.md

---

## 🚨 RISKS & MITIGATION

### Risk 1: Breaking existing KPI data

**Mitigation:**

- ✅ Assume no existing data (per requirement)
- ✅ If needed: Create migration script (set `ChuKyDanhGiaID: null` for old data)

### Risk 2: Unique constraint violation

**Mitigation:**

- ✅ Use `partialFilterExpression: { isDeleted: { $ne: true } }`
- ✅ Soft delete allows re-assignment after delete

### Risk 3: Frontend complexity

**Mitigation:**

- ✅ Phân chia components nhỏ (dialog, table, form riêng)
- ✅ Reuse existing form components (`FAutocomplete`, `FTextField`)
- ✅ Clear state management (Redux slice per feature)

### Risk 4: Performance (nhiều queries)

**Mitigation:**

- ✅ Use composite index: `{ NhanVienID, ChuKyDanhGiaID }`
- ✅ Use `.lean()` for read-only queries
- ✅ Pagination for large lists

---

## 📝 NOTES

### Backward Compatibility:

- ✅ `ChuKyDanhGiaID: null` = gán vĩnh viễn (old behavior)
- ✅ Old UI vẫn hoạt động (chỉ không có chức năng mới)
- ✅ Old API deprecated nhưng vẫn work (return warning)

### Database indexes:

```javascript
// NhanVienNhiemVu indexes
{ NhanVienID: 1, NhiemVuThuongQuyID: 1, ChuKyDanhGiaID: 1 }  // Unique
{ NhanVienID: 1 }                                             // Query performance
{ ChuKyDanhGiaID: 1 }                                         // Filter by cycle

// Check index usage:
db.nhanviennhiemvus.getIndexes()
db.nhanviennhiemvus.aggregate([
  { $indexStats: {} }
])
```

### Validation rules:

- `ChuKyDanhGiaID`: String (ObjectId) | null
- `MucDoKho`: Integer, 1-10, required
- `assignments`: Array, min length = 1

### Error handling:

- 400: Validation error (độ khó không hợp lệ)
- 403: Permission denied (không có quyền gán)
- 404: Not found (chu kỳ không tồn tại)
- 409: Conflict (duplicate assignment - should not happen với unique index)

---

## 🎯 SUCCESS CRITERIA

### Backend:

- ✅ Tất cả APIs trả về 200 OK với data đúng format
- ✅ Unique constraint hoạt động (duplicate → error)
- ✅ Query performance < 100ms (với index)
- ✅ Validation đúng (400 với message rõ ràng)

### Frontend:

- ✅ UI responsive, không lag khi có nhiều nhiệm vụ
- ✅ Form validation hiển thị error rõ ràng
- ✅ Toast notification sau mỗi action
- ✅ Reload data tự động sau success

### E2E:

- ✅ Gán → Chấm → Duyệt → Điểm tính đúng
- ✅ Copy chu kỳ → Nhiệm vụ + độ khó giữ nguyên
- ✅ Filter theo chu kỳ → Hiển thị đúng

---

## 🔗 RELATED DOCUMENTS

- API Documentation: `/docs/API_WORKMANAGEMENT.md`
- Database Schema: `/docs/DATABASE_SCHEMA.md`
- User Guide: `/docs/USER_GUIDE_KPI.md`
- Changelog: `/CHANGELOG.md`

---

**Status:** 📝 Planning Phase  
**Next Step:** Review & Approve → Start Phase 1  
**Estimated Total Time:** 15-16 hours  
**Target Completion:** Day 4
