# 🚀 KPI REFACTOR - VERTICAL SLICES APPROACH

**Strategy:** Mỗi slice có thể test UI ngay lập tức  
**Timeline:** 5 slices x 2-3 giờ = ~12-15 giờ

---

## 🎯 OVERVIEW

Thay vì làm backend trước rồi frontend sau, chúng ta làm theo **vertical slices**:

- Mỗi slice = Model + API + UI + Test
- Sau mỗi slice, hệ thống vẫn hoạt động bình thường
- Có thể test UI ngay lập tức

---

## 📦 SLICE 0: DATABASE PREPARATION (30 phút)

**Mục đích:** Chuẩn bị models và indexes (không có UI, chỉ test MongoDB)

### Bước 0.1: Add MucDoKho field vào NhanVienNhiemVu (10 phút)

**File:** `modules/workmanagement/models/NhanVienNhiemVu.js`

**Thêm field mới (sau NhiemVuThuongQuyID):**

```javascript
MucDoKho: {
  type: Number,
  required: false,  // ← Tạm thời optional để không break existing data
  min: 1.0,
  max: 10.0,
  validate: {
    validator: (v) => v === undefined || Math.round(v * 10) === v * 10,
    message: "MucDoKho phải là số từ 1.0-10.0 với tối đa 1 chữ số thập phân",
  },
  description: "Độ khó thực tế (user nhập manual)"
},
```

**Test:**

```bash
npm start
# Check console: No errors
```

---

### Bước 0.2: Drop old unique index (5 phút)

**MongoDB Compass hoặc Shell:**

```javascript
use bcgiaobanbvt

// Kiểm tra index hiện tại
db.nhanviennhiemvu.getIndexes()

// Drop old unique index
db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1")

// Verify
db.nhanviennhiemvu.getIndexes()
```

---

### Bước 0.3: Add ChuKyDanhGiaID field (10 phút)

**File:** `modules/workmanagement/models/NhanVienNhiemVu.js`

**Thêm field (sau MucDoKho):**

```javascript
ChuKyDanhGiaID: {
  type: Schema.Types.ObjectId,
  ref: "ChuKyDanhGia",
  default: null,
  index: true,
  description: "Chu kỳ đánh giá (null = gán vĩnh viễn)"
},
```

---

### Bước 0.4: Add new composite index (5 phút)

**File:** `modules/workmanagement/models/NhanVienNhiemVu.js`

**Comment out old index, add new:**

```javascript
// ❌ OLD (comment out hoặc xóa):
// nhanVienNhiemVuSchema.index(
//   { NhanVienID: 1, NhiemVuThuongQuyID: 1 },
//   { unique: true }
// );

// ✅ NEW: Non-unique for query
nhanVienNhiemVuSchema.index({ NhanVienID: 1, NhiemVuThuongQuyID: 1 });

// ✅ NEW: Unique với cycle
nhanVienNhiemVuSchema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1, ChuKyDanhGiaID: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    name: "unique_assignment_per_cycle",
  }
);
```

**Test:**

```bash
# Restart server
npm start

# Check console: "Index created: unique_assignment_per_cycle"
```

**✅ Checkpoint:** Models đã sẵn sàng, indexes đã updated

---

## 📦 SLICE 1: GÁN NHIỆM VỤ VỚI MucDoKho MANUAL (2 giờ)

**Mục đích:** User có thể nhập độ khó khi gán nhiệm vụ

### 🔧 BACKEND (30 phút)

#### Bước 1.1: Update assignOne Service

**File:** `modules/workmanagement/services/giaoNhiemVu.service.js`

**Tìm method `assignOne` (line ~110), update logic:**

```javascript
service.assignOne = async (req, employeeId, dutyId) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);
  await ensureSameKhoa(employeeId, dutyId);

  // ✅ NEW: Accept MucDoKho from request body
  const { MucDoKho } = req.body;

  const existingAssignment = await NhanVienNhiemVu.findOne({
    NhanVienID: toObjectId(employeeId),
    NhiemVuThuongQuyID: toObjectId(dutyId),
    isDeleted: { $in: [true, false] },
  });

  let result;

  if (existingAssignment) {
    if (!existingAssignment.isDeleted && existingAssignment.TrangThaiHoatDong) {
      throw new AppError(409, "Nhiệm vụ đã được gán cho nhân viên này");
    } else {
      existingAssignment.isDeleted = false;
      existingAssignment.TrangThaiHoatDong = true;
      existingAssignment.NgayGan = new Date();
      existingAssignment.NguoiGanID = user.NhanVienID || null;

      // ✅ NEW: Update MucDoKho if provided
      if (MucDoKho !== undefined) {
        existingAssignment.MucDoKho = MucDoKho;
      }

      await existingAssignment.save();
      result = existingAssignment;
    }
  } else {
    try {
      result = await NhanVienNhiemVu.create({
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: toObjectId(dutyId),
        TrangThaiHoatDong: true,
        isDeleted: false,
        NgayGan: new Date(),
        NguoiGanID: user.NhanVienID || null,
        MucDoKho: MucDoKho || undefined, // ✅ NEW: Accept MucDoKho
      });
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError(409, "Nhiệm vụ đã được gán cho nhân viên này");
      }
      throw err;
    }
  }

  await result.populate([
    {
      path: "NhiemVuThuongQuyID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    },
    { path: "NguoiGanID", select: "_id Ten MaNhanVien" },
  ]);
  return result;
};
```

**Test backend:**

```bash
npm start
```

---

### 🎨 FRONTEND (1h)

#### Bước 1.2: Update GiaoNhiemVuPageNew - Add MucDoKho Input

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/GiaoNhiemVuPageNew.js`

**Tìm phần render nhiệm vụ table, thêm column MucDoKho:**

```javascript
// Trong table duties, thêm column:
{
  accessorKey: "MucDoKhoDefault",
  header: "Độ khó mặc định",
  cell: ({ row }) => (
    <Chip
      label={row.original.MucDoKhoDefault || 5.0}
      size="small"
      variant="outlined"
    />
  )
},
{
  accessorKey: "mucDoKhoInput",
  header: "Độ khó thực tế",
  cell: ({ row }) => (
    <TextField
      type="number"
      size="small"
      inputProps={{
        min: 1.0,
        max: 10.0,
        step: 0.1,
        style: { width: '80px' }
      }}
      defaultValue={row.original.MucDoKhoDefault || 5.0}
      onChange={(e) => handleMucDoKhoChange(row.original._id, e.target.value)}
      placeholder="1.0-10.0"
    />
  )
}
```

**Thêm state để lưu MucDoKho:**

```javascript
// Thêm ở đầu component:
const [mucDoKhoMap, setMucDoKhoMap] = useState({});

const handleMucDoKhoChange = (dutyId, value) => {
  setMucDoKhoMap((prev) => ({
    ...prev,
    [dutyId]: parseFloat(value),
  }));
};
```

**Update handleAssign để gửi MucDoKho:**

```javascript
const handleAssign = async (dutyId) => {
  const mucDoKho = mucDoKhoMap[dutyId];

  if (!mucDoKho || mucDoKho < 1.0 || mucDoKho > 10.0) {
    toast.error("Vui lòng nhập độ khó từ 1.0 đến 10.0");
    return;
  }

  // Validation: 1 decimal place
  if (Math.round(mucDoKho * 10) !== mucDoKho * 10) {
    toast.error("Độ khó chỉ cho phép tối đa 1 chữ số thập phân (VD: 5.5, 7.2)");
    return;
  }

  await dispatch(
    assignDuty({
      NhanVienID: selectedEmployee._id,
      NhiemVuThuongQuyID: dutyId,
      MucDoKho: mucDoKho, // ✅ NEW: Send MucDoKho
    })
  );

  // Clear input after success
  setMucDoKhoMap((prev) => {
    const newMap = { ...prev };
    delete newMap[dutyId];
    return newMap;
  });
};
```

---

#### Bước 1.3: Update Redux Slice

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/giaoNhiemVuSlice.js`

**Không cần thay đổi**, chỉ cần đảm bảo `assignDuty` action gửi đúng data:

```javascript
export const assignDuty = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      "/workmanagement/giao-nhiem-vu/assignments",
      data // ← Chứa { NhanVienID, NhiemVuThuongQuyID, MucDoKho }
    );
    dispatch(slice.actions.assignDutySuccess(response.data.data));
    toast.success("Gán nhiệm vụ thành công");

    // Reload assignments
    if (data.NhanVienID) {
      dispatch(fetchAssignmentsByEmployee(data.NhanVienID));
    }
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};
```

---

#### Bước 1.4: Update Assignment Table - Display MucDoKho

**File:** Table component hiển thị assignments

**Add column:**

```javascript
{
  accessorKey: "MucDoKho",
  header: "Độ khó thực tế",
  cell: ({ row }) => (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip
        label={row.original.MucDoKho || "N/A"}
        size="small"
        color={row.original.MucDoKho ? "primary" : "default"}
      />
      {row.original.NhiemVuThuongQuyID?.MucDoKhoDefault && (
        <Tooltip title={`Độ khó mặc định: ${row.original.NhiemVuThuongQuyID.MucDoKhoDefault}`}>
          <InfoIcon fontSize="small" color="action" />
        </Tooltip>
      )}
    </Box>
  )
}
```

---

### ✅ TEST SLICE 1 (30 phút)

**Test UI:**

1. **Mở trang Giao Nhiệm Vụ:**

   - Navigate: Menu → Quản lý công việc → Giao nhiệm vụ
   - Chọn 1 nhân viên từ danh sách

2. **Test gán nhiệm vụ:**

   - Chọn 1 nhiệm vụ từ bảng
   - Nhập độ khó: `7.5`
   - Click "Gán nhiệm vụ"
   - ✅ Expect: Toast success "Gán nhiệm vụ thành công"
   - ✅ Expect: Table assignments reload, hiển thị nhiệm vụ mới với độ khó 7.5

3. **Test validation:**

   - Thử nhập `5.55` (2 decimals) → Error toast
   - Thử nhập `11` (vượt max) → Error toast
   - Thử nhập `0.5` (dưới min) → Error toast

4. **Verify database:**

   ```javascript
   // MongoDB Compass:
   db.nhanviennhiemvu.findOne({ MucDoKho: { $exists: true } })

   // Should return:
   {
     _id: ...,
     NhanVienID: ...,
     NhiemVuThuongQuyID: ...,
     MucDoKho: 7.5,  // ✅ Field exists
     ChuKyDanhGiaID: null,
     ...
   }
   ```

**✅ Checkpoint:** Gán nhiệm vụ với độ khó manual hoạt động

---

## 📦 SLICE 2: GÁN THEO CHU KỲ (2.5 giờ)

**Mục đích:** User có thể chọn chu kỳ khi gán nhiệm vụ

### 🔧 BACKEND (1h)

#### Bước 2.1: Create Validator File

**File:** `modules/workmanagement/validators/giaoNhiemVu.validator.js` (NEW)

```javascript
const Joi = require("joi");

const validators = {};

const mucDoKhoValidator = Joi.number()
  .min(1.0)
  .max(10.0)
  .custom((value, helpers) => {
    if (Math.round(value * 10) !== value * 10) {
      return helpers.error("any.invalid");
    }
    return value;
  })
  .required()
  .messages({
    "number.min": "Độ khó phải >= 1.0",
    "number.max": "Độ khó phải <= 10.0",
    "any.invalid": "Độ khó cho phép tối đa 1 chữ số thập phân",
    "any.required": "Độ khó là bắt buộc",
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

module.exports = validators;
```

---

#### Bước 2.2: Add ganNhiemVuTheoChuKy Service

**File:** `modules/workmanagement/services/giaoNhiemVu.service.js`

**Add new method (cuối file):**

```javascript
service.ganNhiemVuTheoChuKy = async (req, data) => {
  const { ChuKyDanhGiaID, NhanVienID, assignments } = data;
  const user = await getCurrentUser(req);

  // Permission check
  if (!isAdminUser(user)) {
    await ensureManagerPermission(user, null, NhanVienID);
  }

  // Validate employee exists
  const employee = await NhanVien.findById(NhanVienID);
  if (!employee) {
    throw new AppError(404, "Không tìm thấy nhân viên");
  }

  // Validate ChuKy (if provided)
  if (ChuKyDanhGiaID) {
    const ChuKyDanhGia = require("../models/ChuKyDanhGia");
    const chuKy = await ChuKyDanhGia.findById(ChuKyDanhGiaID);
    if (!chuKy) {
      throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
    }
  }

  // Validate duties
  const dutyIds = assignments.map((a) => toObjectId(a.NhiemVuThuongQuyID));
  const duties = await NhiemVuThuongQuy.find({
    _id: { $in: dutyIds },
    TrangThaiHoatDong: true,
    isDeleted: false,
  });

  if (duties.length !== dutyIds.length) {
    throw new AppError(400, "Một số nhiệm vụ không tồn tại");
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

  // Upsert assignments
  const results = [];
  for (const item of assignments) {
    const { NhiemVuThuongQuyID, MucDoKho } = item;

    const existing = await NhanVienNhiemVu.findOne({
      NhanVienID: toObjectId(NhanVienID),
      NhiemVuThuongQuyID: toObjectId(NhiemVuThuongQuyID),
      ChuKyDanhGiaID: ChuKyDanhGiaID ? toObjectId(ChuKyDanhGiaID) : null,
      isDeleted: { $in: [true, false] },
    });

    if (existing) {
      existing.MucDoKho = MucDoKho;
      existing.isDeleted = false;
      existing.TrangThaiHoatDong = true;
      existing.NgayGan = new Date();
      existing.NguoiGanID = user.NhanVienID || null;
      await existing.save();
      results.push(existing);
    } else {
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

  // Populate
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

#### Bước 2.3: Add Controller & Route

**File:** `modules/workmanagement/controllers/giaoNhiemVu.controller.js`

**Add method:**

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
```

**File:** `modules/workmanagement/routes/giaoNhiemVu.api.js`

**Add route:**

```javascript
const validators = require("../validators/giaoNhiemVu.validator");

router.post(
  "/gan-theo-chu-ky",
  authentication.loginRequired,
  // validators.validate(validators.ganTheoChuKySchema),  // ← Uncomment sau khi test
  ctrl.ganNhiemVuTheoChuKy
);
```

---

### 🎨 FRONTEND (1h)

#### Bước 2.4: Add ChuKy Selector to UI

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/GiaoNhiemVuPageNew.js`

**Import ChuKy list:**

```javascript
import { useSelector, useDispatch } from "react-redux";
import { fetchChuKyList } from "../ChuKyDanhGia/chuKySlice";
```

**Add state:**

```javascript
const [selectedChuKy, setSelectedChuKy] = useState(null);
const chuKyList = useSelector((state) => state.chuKyDanhGia?.chuKyList || []);

useEffect(() => {
  dispatch(fetchChuKyList());
}, [dispatch]);
```

**Add Autocomplete (before duties table):**

```javascript
<Box mb={2}>
  <Autocomplete
    value={selectedChuKy}
    onChange={(e, newValue) => setSelectedChuKy(newValue)}
    options={chuKyList}
    getOptionLabel={(option) => option.TenChuKy || ""}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Chu kỳ đánh giá (tùy chọn)"
        placeholder="Để trống = Gán vĩnh viễn"
        helperText="Chọn chu kỳ nếu muốn gán cho tháng/quý cụ thể"
      />
    )}
    isClearable
  />
</Box>
```

**Update handleAssign để support batch:**

```javascript
const handleBatchAssign = async () => {
  const selectedDuties = Object.entries(mucDoKhoMap)
    .filter(([_, value]) => value !== undefined)
    .map(([dutyId, mucDoKho]) => ({
      NhiemVuThuongQuyID: dutyId,
      MucDoKho: mucDoKho,
    }));

  if (selectedDuties.length === 0) {
    toast.error("Vui lòng nhập độ khó cho ít nhất 1 nhiệm vụ");
    return;
  }

  await dispatch(
    ganNhiemVuTheoChuKy({
      ChuKyDanhGiaID: selectedChuKy?._id || null,
      NhanVienID: selectedEmployee._id,
      assignments: selectedDuties,
    })
  );

  setMucDoKhoMap({});
};
```

**Add Redux action:**

**File:** `src/features/QuanLyCongViec/GiaoNhiemVu/giaoNhiemVuSlice.js`

```javascript
export const ganNhiemVuTheoChuKy = (data) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    const response = await apiService.post(
      '/workmanagement/giao-nhiem-vu/gan-theo-chu-ky',
      data
    );
    dispatch(slice.actions.ganNhiemVuTheoChuKySuccess(response.data.data));
    toast.success(`Đã gán ${response.data.data.assignedCount} nhiệm vụ thành công`);

    if (data.NhanVienID) {
      dispatch(fetchAssignmentsByEmployee(data.NhanVienID));
    }
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};

// Add reducer:
ganNhiemVuTheoChuKySuccess(state, action) {
  state.isLoading = false;
  state.error = null;
},
```

---

#### Bước 2.5: Update Assignment Table - Show ChuKy

**Add column:**

```javascript
{
  accessorKey: "ChuKyDanhGiaID",
  header: "Chu kỳ",
  cell: ({ row }) => {
    const chuKy = row.original.ChuKyDanhGiaID;
    return (
      <Chip
        label={chuKy ? chuKy.TenChuKy : "Vĩnh viễn"}
        size="small"
        color={chuKy ? "primary" : "default"}
        variant={chuKy ? "filled" : "outlined"}
      />
    );
  }
}
```

---

### ✅ TEST SLICE 2 (30 phút)

**Test UI:**

1. **Test gán vĩnh viễn (null cycle):**

   - Không chọn chu kỳ (để trống)
   - Nhập độ khó cho 2-3 nhiệm vụ
   - Click "Gán nhiệm vụ"
   - ✅ Expect: Toast "Đã gán 2 nhiệm vụ thành công"
   - ✅ Expect: Table hiển thị nhiệm vụ với badge "Vĩnh viễn"

2. **Test gán theo chu kỳ:**

   - Chọn chu kỳ "Tháng 10/2025"
   - Nhập độ khó cho 1-2 nhiệm vụ
   - Click "Gán nhiệm vụ"
   - ✅ Expect: Table hiển thị nhiệm vụ với badge "Tháng 10/2025"

3. **Test gán lại (duplicate):**

   - Chọn cùng chu kỳ
   - Chọn cùng nhiệm vụ đã gán
   - ✅ Expect: Update MucDoKho (không lỗi duplicate)

4. **Verify database:**
   ```javascript
   db.nhanviennhiemvu.find({ ChuKyDanhGiaID: { $ne: null } });
   // Should see records with ChuKyDanhGiaID
   ```

**✅ Checkpoint:** Gán theo chu kỳ hoạt động

---

**TIẾP TỤC VỚI SLICE 3, 4, 5 trong messages tiếp theo nếu anh muốn!**

Bây giờ anh muốn:

1. **Bắt đầu implement SLICE 0** (database prep)?
2. **Xem full plan cho SLICE 3-5** trước?
3. **Có câu hỏi gì** về approach này?
