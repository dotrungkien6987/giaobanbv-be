# Phase 2: Xây dựng Backend APIs cho Quản lý Nhiệm vụ Thường quy

## Mục tiêu Phase 2

Xây dựng hoàn chỉnh hệ thống Backend APIs cho quản lý Nhiệm vụ Thường quy - thành phần cốt lõi của hệ thống đánh giá KPI.

## Tiền điều kiện

- ✅ Phase 1 đã hoàn thành (Models đã được thiết lập)
- ✅ Database connection hoạt động
- ✅ Có dữ liệu mẫu Khoa, User, ViTriCongViec

## Nhiệm vụ chính

### 1. Tạo Controller cho Nhiệm vụ Thường quy

#### 1.1 Tạo Controller File

**File mới**: `modules/workmanagement/controllers/nhiemvuThuongQuy.controller.js`

**Các APIs cần implement**:

```javascript
// 1. Lấy danh sách nhiệm vụ thường quy (có phân trang, filter)
exports.getNhiemVuThuongQuy = async (req, res) => {
  // Filter: KhoaID, TrangThaiHoatDong, NhomViecUserID
  // Sort: TenNhiemVu, MucDoKho, createdAt
  // Pagination: page, limit
  // Search: TenNhiemVu
};

// 2. Lấy chi tiết một nhiệm vụ thường quy
exports.getNhiemVuThuongQuyById = async (req, res) => {
  // Populate: KhoaID, NguoiTaoID, NhomViecUserID
  // Include: Số lượng công việc đã giao, số ticket đã xử lý
};

// 3. Tạo mới nhiệm vụ thường quy
exports.createNhiemVuThuongQuy = async (req, res) => {
  // Validation: TenNhiemVu required, MucDoKho 1-10
  // Business logic: Kiểm tra quyền tạo (chỉ manager trở lên)
  // Auto set: NguoiTaoID từ token
};

// 4. Cập nhật nhiệm vụ thường quy
exports.updateNhiemVuThuongQuy = async (req, res) => {
  // Validation: Kiểm tra quyền sửa
  // Business logic: Không cho phép sửa nếu đã có đánh giá KPI
};

// 5. Xóa mềm nhiệm vụ thường quy
exports.deleteNhiemVuThuongQuy = async (req, res) => {
  // Soft delete: set isDeleted = true
  // Business logic: Kiểm tra có công việc/ticket liên quan không
};

// 6. Gán nhiệm vụ cho vị trí công việc
exports.ganNhiemVuChoViTri = async (req, res) => {
  // Input: nhiemVuId, viTriCongViecIds[]
  // Business logic: Kiểm tra quyền gán
};

// 7. Lấy danh sách nhiệm vụ theo vị trí công việc
exports.getNhiemVuTheoViTri = async (req, res) => {
  // Input: viTriCongViecId
  // Output: Danh sách nhiệm vụ được gán cho vị trí đó
};

// 8. Thống kê nhiệm vụ thường quy
exports.getThongKeNhiemVu = async (req, res) => {
  // Thống kê theo khoa, theo mức độ khó
  // Số lượng công việc/ticket gắn với mỗi nhiệm vụ
};
```

#### 1.2 Error Handling và Validation

```javascript
// Middleware validation
const { body, param, query } = require("express-validator");

exports.validateCreateNhiemVu = [
  body("TenNhiemVu")
    .notEmpty()
    .withMessage("Tên nhiệm vụ không được để trống")
    .isLength({ max: 255 })
    .withMessage("Tên nhiệm vụ không được quá 255 ký tự"),

  body("MucDoKho")
    .isFloat({ min: 1.0, max: 10.0 })
    .withMessage("Mức độ khó phải từ 1.0 đến 10.0"),

  body("KhoaID").isMongoId().withMessage("KhoaID không hợp lệ"),
];

// Error handling middleware
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: errors.array(),
    });
  }
  next();
};
```

### 2. Tạo Routes

#### 2.1 Route File

**File mới**: `modules/workmanagement/routes/nhiemvuThuongQuy.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const nhiemVuController = require("../controllers/nhiemvuThuongQuy.controller");
const {
  authenticate,
  authorize,
} = require("../../../middlewares/authentication");

// Public routes (chỉ cần authenticate)
router.get("/", authenticate, nhiemVuController.getNhiemVuThuongQuy);

router.get("/:id", authenticate, nhiemVuController.getNhiemVuThuongQuyById);

router.get(
  "/vi-tri/:viTriId",
  authenticate,
  nhiemVuController.getNhiemVuTheoViTri
);

router.get(
  "/thong-ke/overview",
  authenticate,
  nhiemVuController.getThongKeNhiemVu
);

// Manager+ routes
router.post(
  "/",
  authenticate,
  authorize(["manager", "admin"]),
  nhiemVuController.validateCreateNhiemVu,
  nhiemVuController.handleValidationErrors,
  nhiemVuController.createNhiemVuThuongQuy
);

router.put(
  "/:id",
  authenticate,
  authorize(["manager", "admin"]),
  nhiemVuController.validateUpdateNhiemVu,
  nhiemVuController.handleValidationErrors,
  nhiemVuController.updateNhiemVuThuongQuy
);

router.delete(
  "/:id",
  authenticate,
  authorize(["manager", "admin"]),
  nhiemVuController.deleteNhiemVuThuongQuy
);

router.post(
  "/:id/gan-vi-tri",
  authenticate,
  authorize(["manager", "admin"]),
  nhiemVuController.ganNhiemVuChoViTri
);

module.exports = router;
```

#### 2.2 Cập nhật Main Routes

**File cập nhật**: `routes/index.js`

```javascript
// Thêm vào routes chính
app.use(
  "/api/workmanagement/nhiem-vu-thuong-quy",
  require("../modules/workmanagement/routes/nhiemvuThuongQuy.routes")
);
```

### 3. Service Layer (Optional nhưng nên có)

#### 3.1 Business Logic Service

**File mới**: `modules/workmanagement/services/nhiemvuThuongQuy.service.js`

```javascript
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const AssignedTask = require("../models/AssignedTask");
const Ticket = require("../models/Ticket");

class NhiemVuThuongQuySevice {
  // Lấy danh sách với filter phức tạp
  async getDanhSachNhiemVu(filters, pagination, sort) {
    const query = { isDeleted: false };

    // Apply filters
    if (filters.khoaId) query.KhoaID = filters.khoaId;
    if (filters.trangThaiHoatDong !== undefined)
      query.TrangThaiHoatDong = filters.trangThaiHoatDong;
    if (filters.search) {
      query.TenNhiemVu = { $regex: filters.search, $options: "i" };
    }

    const result = await NhiemVuThuongQuy.find(query)
      .populate("KhoaID", "TenKhoa MaKhoa")
      .populate("NguoiTaoID", "HoTen")
      .populate("NhomViecUserID", "TenNhom")
      .sort(sort)
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit);

    const total = await NhiemVuThuongQuy.countDocuments(query);

    return {
      data: result,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(total / pagination.limit),
        totalItems: total,
      },
    };
  }

  // Kiểm tra quyền thao tác
  async kiemTraQuyenThaoTac(userId, nhiemVuId, action) {
    const user = await User.findById(userId).populate("KhoaID");
    const nhiemVu = await NhiemVuThuongQuy.findById(nhiemVuId);

    // Logic kiểm tra quyền
    if (user.PhanQuyen === "admin") return true;
    if (user.PhanQuyen === "manager" && user.KhoaID._id.equals(nhiemVu.KhoaID))
      return true;

    return false;
  }

  // Lấy thống kê liên quan
  async getThongKeLienQuan(nhiemVuId) {
    const [soCongViec, soTicket] = await Promise.all([
      AssignedTask.countDocuments({
        NhiemVuThuongQuyID: nhiemVuId,
        isDeleted: false,
      }),
      Ticket.countDocuments({ routineDutyId: nhiemVuId, isDeleted: false }),
    ]);

    return { soCongViec, soTicket };
  }
}

module.exports = new NhiemVuThuongQuySevice();
```

### 4. Testing APIs

#### 4.1 Unit Tests

**File mới**: `modules/workmanagement/tests/nhiemvuThuongQuy.test.js`

```javascript
const request = require("supertest");
const app = require("../../../app");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");

describe("Nhiem Vu Thuong Quy APIs", () => {
  let authToken;
  let testKhoaId;
  let testNhiemVuId;

  beforeAll(async () => {
    // Setup test data
    authToken = await getTestAuthToken();
    testKhoaId = await createTestKhoa();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe("GET /api/workmanagement/nhiem-vu-thuong-quy", () => {
    test("Should return list of nhiem vu with pagination", async () => {
      const response = await request(app)
        .get("/api/workmanagement/nhiem-vu-thuong-quy")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe("POST /api/workmanagement/nhiem-vu-thuong-quy", () => {
    test("Should create new nhiem vu successfully", async () => {
      const newNhiemVu = {
        TenNhiemVu: "Test Nhiem Vu",
        MoTa: "Test description",
        KhoaID: testKhoaId,
        MucDoKho: 5.0,
      };

      const response = await request(app)
        .post("/api/workmanagement/nhiem-vu-thuong-quy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newNhiemVu);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.TenNhiemVu).toBe(newNhiemVu.TenNhiemVu);

      testNhiemVuId = response.body.data._id;
    });

    test("Should validate required fields", async () => {
      const invalidNhiemVu = {
        MoTa: "Missing required fields",
      };

      const response = await request(app)
        .post("/api/workmanagement/nhiem-vu-thuong-quy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidNhiemVu);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

#### 4.2 Integration Tests

Test tích hợp với database thật và test các business logic phức tạp.

### 5. Documentation

#### 5.1 API Documentation

**File mới**: `modules/workmanagement/docs/nhiemvuThuongQuy.api.md`

````markdown
# Nhiệm Vụ Thường Quy APIs

## Endpoints

### GET /api/workmanagement/nhiem-vu-thuong-quy

Lấy danh sách nhiệm vụ thường quy

**Query Parameters:**

- `page` (number): Trang hiện tại (default: 1)
- `limit` (number): Số items per page (default: 10)
- `khoaId` (string): Filter theo khoa
- `search` (string): Tìm kiếm theo tên
- `trangThaiHoatDong` (boolean): Filter theo trạng thái

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "totalItems": 50
  }
}
```
````

### POST /api/workmanagement/nhiem-vu-thuong-quy

Tạo mới nhiệm vụ thường quy

**Body:**

```json
{
  "TenNhiemVu": "string (required)",
  "MoTa": "string",
  "KhoaID": "ObjectId (required)",
  "MucDoKho": "number (1.0-10.0)",
  "NhomViecUserID": "ObjectId"
}
```

````

### 6. Middleware và Utils

#### 6.1 Response Formatter
**File mới**: `modules/workmanagement/utils/responseFormatter.js`

```javascript
exports.successResponse = (data, message = 'Success', pagination = null) => {
  const response = {
    success: true,
    message,
    data
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

exports.errorResponse = (message, errors = null, statusCode = 500) => {
  return {
    success: false,
    message,
    errors,
    statusCode
  };
};
````

#### 6.2 Query Builder Helper

**File mới**: `modules/workmanagement/utils/queryBuilder.js`

```javascript
class QueryBuilder {
  constructor(model, query) {
    this.model = model;
    this.query = query;
    this.mongoQuery = model.find();
  }

  filter(filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        this.mongoQuery = this.mongoQuery.where(key).equals(filters[key]);
      }
    });
    return this;
  }

  search(searchFields, searchTerm) {
    if (searchTerm) {
      const searchQuery = {
        $or: searchFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      };
      this.mongoQuery = this.mongoQuery.find(searchQuery);
    }
    return this;
  }

  sort(sortField, sortOrder = 1) {
    this.mongoQuery = this.mongoQuery.sort({ [sortField]: sortOrder });
    return this;
  }

  paginate(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    this.mongoQuery = this.mongoQuery.skip(skip).limit(limit);
    return this;
  }

  populate(populateFields) {
    if (Array.isArray(populateFields)) {
      populateFields.forEach((field) => {
        this.mongoQuery = this.mongoQuery.populate(field);
      });
    } else {
      this.mongoQuery = this.mongoQuery.populate(populateFields);
    }
    return this;
  }

  async execute() {
    return await this.mongoQuery.exec();
  }
}

module.exports = QueryBuilder;
```

## Kết quả mong đợi Phase 2

Sau khi hoàn thành Phase 2:

1. ✅ APIs đầy đủ cho quản lý Nhiệm vụ Thường quy
2. ✅ Validation và error handling hoàn chỉnh
3. ✅ Unit tests và integration tests
4. ✅ API documentation chi tiết
5. ✅ Chuẩn bị cho Phase 3: APIs Công việc Được giao

## Files cần tạo trong Phase 2

1. `modules/workmanagement/controllers/nhiemvuThuongQuy.controller.js`
2. `modules/workmanagement/routes/nhiemvuThuongQuy.routes.js`
3. `modules/workmanagement/services/nhiemvuThuongQuy.service.js`
4. `modules/workmanagement/tests/nhiemvuThuongQuy.test.js`
5. `modules/workmanagement/docs/nhiemvuThuongQuy.api.md`
6. `modules/workmanagement/utils/responseFormatter.js`
7. `modules/workmanagement/utils/queryBuilder.js`
8. Cập nhật `routes/index.js`

## Lưu ý kỹ thuật

- Sử dụng async/await cho tất cả database operations
- Implement proper error handling với try-catch
- Validate input data ở cả middleware và service level
- Optimize queries với populate và select fields
- Cache các queries thường dùng nếu cần thiết
