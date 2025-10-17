# 🚀 IMPLEMENTATION STEPS - KPI REFACTOR

**Ngày bắt đầu:** 17/10/2025  
**Status:** ✅ READY TO START  
**Estimated Time:** 15-16 hours

---

## 📋 CHECKLIST TỔNG THỂ

### Pre-Implementation:

- [x] ✅ Requirements clarified (MucDoKho decimal, manual input, APIs riêng, UI thay thế)
- [x] ✅ Plan document finalized
- [ ] ⏳ Git branch created: `feature/kpi-cycle-based-assignment`
- [ ] ⏳ Database backup (MongoDB export)

### Phase 1: Backend Models (2h)

- [ ] Update `NhiemVuThuongQuy` model
- [ ] Update `NhanVienNhiemVu` model
- [ ] Drop old unique index manually
- [ ] Test models with MongoDB

### Phase 2: Backend APIs (4h)

- [ ] Create validator file
- [ ] Implement `ganNhiemVuTheoChuKy` service
- [ ] Implement `copyChuKy` service
- [ ] Update `getAssignmentsByEmployee` service
- [ ] Create controller methods
- [ ] Update routes
- [ ] Test with Postman

### Phase 3: Backend KPI Integration (2h)

- [ ] Update `getChamDiemDetail` controller
- [ ] Fix MucDoKho references
- [ ] Remove rebuild logic
- [ ] Test KPI scoring

### Phase 4: Frontend Assignment UI (6h)

- [ ] Create `GanNhiemVuTheoChuKyDialog`
- [ ] Create `CopyChuKyDialog`
- [ ] Update `giaoNhiemVuSlice`
- [ ] Update table columns
- [ ] Replace old form

### Phase 5: Frontend KPI UI (1h)

- [ ] Update `ChamDiemKPIDialog`
- [ ] Add tooltip for MucDoKhoDefault

### Phase 6: Testing & Deployment (2h)

- [ ] E2E testing
- [ ] Update documentation
- [ ] Code review
- [ ] Deploy to staging

---

## 🔨 PHASE 1: BACKEND MODELS (2 hours)

### Step 1.1: Update NhiemVuThuongQuy Model (30 min)

**File:** `modules/workmanagement/models/NhiemVuThuongQuy.js`

**Changes:**

```javascript
// Line ~23-30
// BEFORE:
MucDoKho: {
  type: Number,
  min: 0.0,
  max: 10.0,
  default: 1.0,
  description: "Mức độ khó của nhiệm vụ (1.0-10.0), cho phép 1 chữ số thập phân",
},

// AFTER:
MucDoKhoDefault: {
  type: Number,
  default: 5.0,
  min: 1.0,
  max: 10.0,
  validate: {
    validator: (v) => Math.round(v * 10) === v * 10,
    message: 'Độ khó cho phép tối đa 1 chữ số thập phân (VD: 5.5)'
  },
  description: "Độ khó mặc định (tham khảo), cho phép 1 chữ số thập phân",
},
```

**Test:**

```bash
# Restart server
npm start

# MongoDB Compass: Check field renamed
db.nhiemvuthuongquy.findOne()
```

---

### Step 1.2: Update NhanVienNhiemVu Model (1h)

**File:** `modules/workmanagement/models/NhanVienNhiemVu.js`

**Changes:**

**1. Add new fields (line ~15):**

```javascript
// After NhiemVuThuongQuyID field:

// ✅ NEW: Gán theo chu kỳ (null = vĩnh viễn)
ChuKyDanhGiaID: {
  type: Schema.Types.ObjectId,
  ref: "ChuKyDanhGia",
  default: null,
  index: true,
  description: "Chu kỳ đánh giá (null = gán vĩnh viễn)"
},

// ✅ NEW: Độ khó thực tế (user nhập manually)
MucDoKho: {
  type: Number,
  required: true,
  min: 1.0,
  max: 10.0,
  validate: {
    validator: (v) => Math.round(v * 10) === v * 10,
    message: "MucDoKho phải là số từ 1.0-10.0 với tối đa 1 chữ số thập phân (VD: 5.5, 7.2)",
  },
  description: "Độ khó thực tế cho nhân viên này (user nhập manually khi gán)"
},
```

**2. Update indexes (line ~50):**

```javascript
// ❌ COMMENT OUT old unique index:
// nhanVienNhiemVuSchema.index(
//   { NhanVienID: 1, NhiemVuThuongQuyID: 1 },
//   { unique: true }
// );

// ✅ ADD new indexes:

// Non-unique for query performance
nhanVienNhiemVuSchema.index({ NhanVienID: 1, NhiemVuThuongQuyID: 1 });

// Unique composite index with cycle
nhanVienNhiemVuSchema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1, ChuKyDanhGiaID: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    name: "unique_assignment_per_cycle",
  }
);
```

**3. MANUAL DB OPERATION (CRITICAL):**

```bash
# MongoDB Shell or Compass:
use your_database_name

# Drop old unique index
db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1")

# Verify
db.nhanviennhiemvu.getIndexes()
```

**4. Restart server:**

```bash
npm start
# Mongoose will auto-create new indexes
```

**Test:**

```javascript
// MongoDB Compass: Test unique constraint
db.nhanviennhiemvu.insertOne({
  NhanVienID: ObjectId("..."),
  NhiemVuThuongQuyID: ObjectId("..."),
  ChuKyDanhGiaID: ObjectId("q1-2025"),
  MucDoKho: 7.5,
  isDeleted: false,
});

// Insert same again -> Should ERROR (duplicate)

// Insert with different ChuKyDanhGiaID -> Should OK
db.nhanviennhiemvu.insertOne({
  NhanVienID: ObjectId("..."), // Same
  NhiemVuThuongQuyID: ObjectId("..."), // Same
  ChuKyDanhGiaID: ObjectId("q2-2025"), // Different
  MucDoKho: 8.0,
  isDeleted: false,
}); // Should SUCCESS
```

---

## 🔨 PHASE 2: BACKEND APIs (4 hours)

### Step 2.1: Create Validator File (30 min)

**File:** `modules/workmanagement/validators/giaoNhiemVu.validator.js` (NEW)

**Content:**

```javascript
const Joi = require("joi");

const validators = {};

// Validator cho độ khó (cho phép 1 chữ số thập phân)
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
        MucDoKho: mucDoKhoValidator,
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

**Test:**

```javascript
// Create test file: test-validator.js
const validators = require("./modules/workmanagement/validators/giaoNhiemVu.validator");

const testData = {
  ChuKyDanhGiaID: null,
  NhanVienID: "123",
  assignments: [
    { NhiemVuThuongQuyID: "456", MucDoKho: 5.5 }, // Valid
  ],
};

const result = validators.ganTheoChuKySchema.validate(testData);
console.log(result.error); // Should be undefined

const invalidData = {
  assignments: [
    { NhiemVuThuongQuyID: "456", MucDoKho: 5.55 }, // Invalid (2 decimals)
  ],
};
const result2 = validators.ganTheoChuKySchema.validate(invalidData);
console.log(result2.error); // Should show error
```

---

### Step 2.2: Implement ganNhiemVuTheoChuKy Service (1.5h)

**File:** `modules/workmanagement/services/giaoNhiemVu.service.js`

**Add new method:**

```javascript
service.ganNhiemVuTheoChuKy = async (req, data) => {
  const { ChuKyDanhGiaID, NhanVienID, assignments } = data;
  const user = await getCurrentUser(req);

  // 1. Permission check
  if (!isAdminUser(user)) {
    await ensureManagerPermission(user, null, NhanVienID);
  }

  // 2. Validate employee exists
  const employee = await NhanVien.findById(NhanVienID);
  if (!employee) {
    throw new AppError(404, "Không tìm thấy nhân viên");
  }

  // 3. Validate ChuKy (if provided)
  if (ChuKyDanhGiaID) {
    const chuKy = await require("../models/ChuKyDanhGia").findById(
      ChuKyDanhGiaID
    );
    if (!chuKy) {
      throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
    }
  }

  // 4. Validate all duties exist and same KhoaID
  const dutyIds = assignments.map((a) => toObjectId(a.NhiemVuThuongQuyID));
  const duties = await NhiemVuThuongQuy.find({
    _id: { $in: dutyIds },
    TrangThaiHoatDong: true,
    isDeleted: false,
  });

  if (duties.length !== dutyIds.length) {
    throw new AppError(
      400,
      "Một số nhiệm vụ không tồn tại hoặc đã bị vô hiệu hóa"
    );
  }

  // Check same KhoaID
  const employeeKhoaId = employee.KhoaID?.toString();
  const invalidDuties = duties.filter(
    (d) => d.KhoaID?.toString() !== employeeKhoaId
  );
  if (invalidDuties.length > 0) {
    throw new AppError(
      400,
      `Nhiệm vụ "${invalidDuties[0].TenNhiemVu}" không cùng khoa với nhân viên`
    );
  }

  // 5. Upsert assignments
  const results = [];
  for (const item of assignments) {
    const { NhiemVuThuongQuyID, MucDoKho } = item;

    // Upsert: Update if exists, create if not
    const existing = await NhanVienNhiemVu.findOne({
      NhanVienID: toObjectId(NhanVienID),
      NhiemVuThuongQuyID: toObjectId(NhiemVuThuongQuyID),
      ChuKyDanhGiaID: ChuKyDanhGiaID ? toObjectId(ChuKyDanhGiaID) : null,
      isDeleted: { $in: [true, false] }, // Include soft-deleted
    });

    if (existing) {
      // Update existing (restore if deleted)
      existing.MucDoKho = MucDoKho;
      existing.isDeleted = false;
      existing.TrangThaiHoatDong = true;
      existing.NgayGan = new Date();
      existing.NguoiGanID = user.NhanVienID || null;
      await existing.save();
      results.push(existing);
    } else {
      // Create new
      const newAssignment = await NhanVienNhiemVu.create({
        NhanVienID: toObjectId(NhanVienID),
        NhiemVuThuongQuyID: toObjectId(NhiemVuThuongQuyID),
        ChuKyDanhGiaID: ChuKyDanhGiaID ? toObjectId(ChuKyDanhGiaID) : null,
        MucDoKho,
        TrangThaiHoatDong: true,
        isDeleted: false,
        NgayGan: new Date(),
        NguoiGanID: user.NhanVienID || null,
      });
      results.push(newAssignment);
    }
  }

  // 6. Populate and return
  for (let i = 0; i < results.length; i++) {
    await results[i].populate([
      {
        path: "NhiemVuThuongQuyID",
        populate: { path: "KhoaID", select: "_id TenKhoa" },
      },
      { path: "NguoiGanID", select: "_id Ten MaNhanVien" },
      { path: "ChuKyDanhGiaID", select: "_id TenChuKy" },
    ]);
  }

  return {
    assignedCount: results.length,
    assignments: results,
  };
};
```

---

### Step 2.3: Implement copyChuKy Service (1h)

**File:** `modules/workmanagement/services/giaoNhiemVu.service.js`

**Add new method:**

```javascript
service.copyChuKy = async (req, data) => {
  const { NhanVienID, FromChuKyID, ToChuKyID, adjustMucDoKho = false } = data;
  const user = await getCurrentUser(req);

  // 1. Permission check
  if (!isAdminUser(user)) {
    await ensureManagerPermission(user, null, NhanVienID);
  }

  // 2. Validate ChuKy exist
  const ChuKyDanhGia = require("../models/ChuKyDanhGia");
  const [fromChuKy, toChuKy] = await Promise.all([
    ChuKyDanhGia.findById(FromChuKyID),
    ChuKyDanhGia.findById(ToChuKyID),
  ]);

  if (!fromChuKy) throw new AppError(404, "Không tìm thấy chu kỳ nguồn");
  if (!toChuKy) throw new AppError(404, "Không tìm thấy chu kỳ đích");

  // 3. Load assignments from source cycle
  const sourceAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(NhanVienID),
    ChuKyDanhGiaID: toObjectId(FromChuKyID),
    isDeleted: false,
    TrangThaiHoatDong: true,
  }).populate("NhiemVuThuongQuyID");

  if (sourceAssignments.length === 0) {
    throw new AppError(
      404,
      `Không tìm thấy nhiệm vụ nào trong chu kỳ "${fromChuKy.TenChuKy}"`
    );
  }

  // 4. Copy to new cycle
  const results = [];
  for (const source of sourceAssignments) {
    // Check if already exists in target cycle
    const exists = await NhanVienNhiemVu.findOne({
      NhanVienID: toObjectId(NhanVienID),
      NhiemVuThuongQuyID: source.NhiemVuThuongQuyID._id,
      ChuKyDanhGiaID: toObjectId(ToChuKyID),
      isDeleted: false,
    });

    if (!exists) {
      const newAssignment = await NhanVienNhiemVu.create({
        NhanVienID: source.NhanVienID,
        NhiemVuThuongQuyID: source.NhiemVuThuongQuyID._id,
        ChuKyDanhGiaID: toObjectId(ToChuKyID),
        MucDoKho: source.MucDoKho, // Copy độ khó từ source
        TrangThaiHoatDong: true,
        isDeleted: false,
        NgayGan: new Date(),
        NguoiGanID: user.NhanVienID || null,
      });

      await newAssignment.populate([
        { path: "NhiemVuThuongQuyID" },
        { path: "ChuKyDanhGiaID", select: "_id TenChuKy" },
      ]);
      results.push(newAssignment);
    }
  }

  return {
    copiedCount: results.length,
    skippedCount: sourceAssignments.length - results.length,
    fromChuKy: fromChuKy.TenChuKy,
    toChuKy: toChuKy.TenChuKy,
    assignments: results,
  };
};
```

---

### Step 2.4: Update getAssignmentsByEmployee (30 min)

**File:** `modules/workmanagement/services/giaoNhiemVu.service.js`

**Update existing method:**

```javascript
service.getAssignmentsByEmployee = async (req, employeeId) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);

  // ✅ NEW: Support chuKyId filter
  const { chuKyId } = req.query;
  const query = {
    NhanVienID: toObjectId(employeeId),
    isDeleted: false,
    TrangThaiHoatDong: true,
  };

  // ✅ Filter by cycle if provided
  if (chuKyId) {
    query.$or = [
      { ChuKyDanhGiaID: toObjectId(chuKyId) },
      { ChuKyDanhGiaID: null }, // Include permanent
    ];
  }

  const list = await NhanVienNhiemVu.find(query)
    .populate({
      path: "NhiemVuThuongQuyID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    })
    .populate({ path: "NguoiGanID", select: "_id Ten MaNhanVien" })
    .populate({ path: "ChuKyDanhGiaID", select: "_id TenChuKy" }) // ✅ NEW
    .sort({ NgayGan: -1 });

  return list;
};
```

---

### Step 2.5: Create Controller Methods (30 min)

**File:** `modules/workmanagement/controllers/giaoNhiemVu.controller.js`

**Add new methods:**

```javascript
ctrl.ganNhiemVuTheoChuKy = catchAsync(async (req, res) => {
  const data = await service.ganNhiemVuTheoChuKy(req, req.body);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    `Đã gán ${data.assignedCount} nhiệm vụ thành công`
  );
});

ctrl.copyChuKy = catchAsync(async (req, res) => {
  const data = await service.copyChuKy(req, req.body);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    `Đã copy ${data.copiedCount} nhiệm vụ từ "${data.fromChuKy}" sang "${data.toChuKy}"`
  );
});
```

---

### Step 2.6: Update Routes (15 min)

**File:** `modules/workmanagement/routes/giaoNhiemVu.api.js`

**Add:**

```javascript
const validators = require("../validators/giaoNhiemVu.validator");

// NEW: Gán theo chu kỳ
router.post(
  "/gan-theo-chu-ky",
  authentication.loginRequired,
  validators.validate(validators.ganTheoChuKySchema),
  ctrl.ganNhiemVuTheoChuKy
);

// NEW: Copy chu kỳ
router.post(
  "/copy-chu-ky",
  authentication.loginRequired,
  validators.validate(validators.copyChuKySchema),
  ctrl.copyChuKy
);

// DEPRECATE old assignOne
// router.post("/assignments", ctrl.assignOne);  // ← Comment out
```

---

### Step 2.7: Test APIs with Postman (30 min)

**Test 1: Gán nhiệm vụ theo chu kỳ**

```json
POST /api/workmanagement/giao-nhiem-vu/gan-theo-chu-ky
{
  "ChuKyDanhGiaID": "671234567890abcdef123456",
  "NhanVienID": "671234567890abcdef123999",
  "assignments": [
    {
      "NhiemVuThuongQuyID": "671234567890abcdef124001",
      "MucDoKho": 7.5
    },
    {
      "NhiemVuThuongQuyID": "671234567890abcdef124002",
      "MucDoKho": 5.0
    }
  ]
}

Expected: 200 OK, { assignedCount: 2, assignments: [...] }
```

**Test 2: Gán vĩnh viễn (null cycle)**

```json
POST /api/workmanagement/giao-nhiem-vu/gan-theo-chu-ky
{
  "ChuKyDanhGiaID": null,
  "NhanVienID": "671234567890abcdef123999",
  "assignments": [
    {
      "NhiemVuThuongQuyID": "671234567890abcdef124003",
      "MucDoKho": 6.5
    }
  ]
}

Expected: 200 OK
```

**Test 3: Validation errors**

```json
// Invalid MucDoKho (2 decimals)
{ "MucDoKho": 7.55 }
Expected: 400 Bad Request

// Missing MucDoKho
{ "NhiemVuThuongQuyID": "..." }
Expected: 400 "Độ khó là bắt buộc"
```

**Test 4: Copy chu kỳ**

```json
POST /api/workmanagement/giao-nhiem-vu/copy-chu-ky
{
  "NhanVienID": "671234567890abcdef123999",
  "FromChuKyID": "671234567890abcdef123456",
  "ToChuKyID": "671234567890abcdef123457"
}

Expected: 200 OK, { copiedCount: 2, ... }
```

---

## 🔨 PHASE 3: BACKEND KPI INTEGRATION (2 hours)

### Step 3.1: Update getChamDiemDetail Controller (1.5h)

**File:** `modules/workmanagement/controllers/kpi.controller.js`

**Line ~930-950: Add cycle filter**

```javascript
// BEFORE (line 930):
const raw = await NhanVienNhiemVu.find({
  NhanVienID: nhanVienId,
  isDeleted: { $ne: true },
})
  .populate({
    path: "NhiemVuThuongQuyID",
    select: "TenNhiemVu MoTa MucDoKho", // ← WRONG field
  })
  .lean();

// AFTER:
const raw = await NhanVienNhiemVu.find({
  NhanVienID: nhanVienId,
  $or: [
    { ChuKyDanhGiaID: chuKyId }, // ✅ Filter by cycle
    { ChuKyDanhGiaID: null }, // ✅ Include permanent
  ],
  isDeleted: { $ne: true },
})
  .populate({
    path: "NhiemVuThuongQuyID",
    select: "TenNhiemVu MoTa MucDoKhoDefault", // ✅ Fixed field name
  })
  .lean();
```

**Line ~995-1015: Use actual MucDoKho**

```javascript
// BEFORE (line 1000):
const payloads = toAdd.map((nvItem) => ({
  DanhGiaKPIID: danhGiaKPI._id,
  NhiemVuThuongQuyID: nvItem.NhiemVuThuongQuyID._id,
  NhanVienID: nhanVienId,
  MucDoKho: nvItem.NhiemVuThuongQuyID.MucDoKho || 5,  // ← WRONG
  ChiTietDiem: tieuChiList.map(...),
}));

// AFTER:
const payloads = toAdd.map((nvItem) => ({
  DanhGiaKPIID: danhGiaKPI._id,
  NhiemVuThuongQuyID: nvItem.NhiemVuThuongQuyID._id,
  NhanVienID: nhanVienId,
  MucDoKho: nvItem.MucDoKho,  // ✅ Use actual from NhanVienNhiemVu
  ChiTietDiem: tieuChiList.map(...),
}));
```

**Line ~1018-1025: REMOVE rebuild logic**

```javascript
// ❌ DELETE THIS BLOCK (line 1018-1025):
await Promise.all(
  assignments.map(async (a) => {
    const exist = existingMap.get(a.NhiemVuThuongQuyID._id.toString());
    if (exist && exist.MucDoKho !== a.NhiemVuThuongQuyID.MucDoKho) {
      await DanhGiaNhiemVuThuongQuy.updateOne(
        { _id: exist._id },
        { $set: { MucDoKho: a.NhiemVuThuongQuyID.MucDoKho } }
      );
    }
  })
);

// ✅ REMOVE COMPLETELY - Không rebuild MucDoKho nữa
```

---

### Step 3.2: Update other MucDoKho references (30 min)

**Search and replace:**

```bash
# Find all references
grep -r "MucDoKho" modules/workmanagement/controllers/*.js

# Files cần sửa:
# - kpi.controller.js (đã sửa ở trên)
# - nhiemvuThuongQuy.controller.js (CRUD - chỉ đổi field name)
```

**File:** `modules/workmanagement/controllers/nhiemvuThuongQuy.controller.js`

**Replace all:** `MucDoKho` → `MucDoKhoDefault` (chỉ trong populate/select)

---

## 🔨 PHASE 4: FRONTEND ASSIGNMENT UI (6 hours)

### Step 4.1: Update giaoNhiemVuSlice (1h)

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/giaoNhiemVuSlice.js`

**Add new actions:**

```javascript
// ✅ NEW: Gán theo chu kỳ
export const ganNhiemVuTheoChuKy = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      "/workmanagement/giao-nhiem-vu/gan-theo-chu-ky",
      data
    );
    dispatch(slice.actions.ganNhiemVuTheoChuKySuccess(response.data.data));
    toast.success(
      `Đã gán ${response.data.data.assignedCount} nhiệm vụ thành công`
    );

    // Reload assignments
    if (data.NhanVienID) {
      dispatch(getAssignmentsByEmployee(data.NhanVienID));
    }
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};

// ✅ NEW: Copy chu kỳ
export const copyChuKy = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      "/workmanagement/giao-nhiem-vu/copy-chu-ky",
      data
    );
    dispatch(slice.actions.copyChuKySuccess(response.data.data));
    toast.success(
      `Đã copy ${response.data.data.copiedCount} nhiệm vụ từ "${response.data.data.fromChuKy}" sang "${response.data.data.toChuKy}"`
    );

    // Reload assignments
    if (data.NhanVienID) {
      dispatch(getAssignmentsByEmployee(data.NhanVienID));
    }
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};

// Add reducers
const slice = createSlice({
  name: "giaoNhiemVu",
  initialState,
  reducers: {
    // ... existing reducers ...

    ganNhiemVuTheoChuKySuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      // Will reload via getAssignmentsByEmployee
    },

    copyChuKySuccess(state, action) {
      state.isLoading = false;
      state.error = null;
      // Will reload via getAssignmentsByEmployee
    },
  },
});
```

---

### Step 4.2: Create GanNhiemVuTheoChuKyDialog (3h)

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/GanNhiemVuTheoChuKyDialog.js` (NEW)

**Full implementation:** (See plan document Module 5 for full code)

**Key features:**

- Autocomplete cho chu kỳ (nullable)
- Table nhiệm vụ với checkbox
- TextField cho MucDoKho (pre-fill từ MucDoKhoDefault, editable)
- Button "Copy từ chu kỳ trước"
- Validation: MucDoKho required, 1.0-10.0, 1 decimal

---

### Step 4.3: Create CopyChuKyDialog (1h)

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/CopyChuKyDialog.js` (NEW)

**Features:**

- 2 Autocomplete: From ChuKy, To ChuKy
- Preview list nhiệm vụ sẽ copy
- Submit button

---

### Step 4.4: Update Assignment Table (1h)

**File:** Update existing table component

**Add columns:**

- Chu kỳ (badge: "Vĩnh viễn" | "Q1/2025")
- Độ khó thực tế (highlight if different from default)

---

## 🔨 PHASE 5: FRONTEND KPI UI (1 hour)

### Step 5.1: Update ChamDiemKPIDialog

**Add tooltip:**

```javascript
<Tooltip
  title={`Độ khó mặc định: ${nhiemVu.NhiemVuThuongQuyID.MucDoKhoDefault}`}
>
  <InfoIcon fontSize="small" color="action" />
</Tooltip>
```

---

## 🔨 PHASE 6: TESTING & DEPLOYMENT (2 hours)

### E2E Testing Checklist:

- [ ] Gán vĩnh viễn → Fetch chấm điểm → Verify
- [ ] Gán theo Q1 → Fetch Q1 → Không có Q2
- [ ] Copy Q1 → Q2 → Verify
- [ ] Chấm điểm → Duyệt → Verify tính điểm đúng
- [ ] MucDoKho decimal validation

### Deploy:

1. Merge to main
2. Deploy backend
3. Run DB index migration
4. Deploy frontend
5. Smoke test production

---

**END OF IMPLEMENTATION GUIDE**
