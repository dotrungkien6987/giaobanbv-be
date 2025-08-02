# Phase 4: Xây dựng Backend APIs cho Hệ thống Tickets (Yêu cầu Hỗ trợ)

## Mục tiêu Phase 4

Xây dựng hệ thống Backend APIs hoàn chỉnh cho quản lý "Yêu cầu Hỗ trợ" (Tickets) - thành phần quan trọng để xử lý các vấn đề phát sinh và hỗ trợ liên phòng ban.

## Tiền điều kiện

- ✅ Phase 1, 2, 3 đã hoàn thành
- ✅ APIs Nhiệm vụ Thường quy và Assigned Tasks đã hoạt động
- ✅ Models Ticket đã được thiết lập

## Đặc điểm nghiệp vụ của Ticket System

### Luồng nghiệp vụ chính:

1. **Người yêu cầu** tạo ticket để yêu cầu hỗ trợ
2. **Hệ thống** tự động phân luồng đến phòng ban xử lý
3. **Phòng ban** tiếp nhận và phân công cho nhân viên
4. **Nhân viên** xử lý và cập nhật tiến độ
5. **Người yêu cầu** xác nhận và đóng ticket

### Đặc điểm quan trọng:

- **BẮT BUỘC** gán vào một Nhiệm vụ Thường quy khi xử lý
- Hỗ trợ **escalation** (leo thang) khi cần thiết
- **SLA tracking** theo loại ticket
- **Rating system** để đánh giá chất lượng hỗ trợ

## Nhiệm vụ chính

### 1. Hoàn thiện Models cho Ticket System

#### 1.1 Cập nhật Ticket Model

**File**: `modules/workmanagement/models/Ticket.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketSchema = Schema(
  {
    // Thông tin cơ bản
    ticketNumber: {
      type: String,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    // Phân loại
    categoryId: {
      type: Schema.ObjectId,
      required: true,
      ref: "TicketCategory",
    },

    // Liên kết với Nhiệm vụ Thường quy (khi xử lý)
    routineDutyId: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy",
      description: "Gắn ticket vào nhiệm vụ thường quy khi bắt đầu xử lý",
    },

    // Người liên quan
    requesterId: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
      description: "Người tạo yêu cầu",
    },
    requesterInfo: {
      hoTen: { type: String, required: true },
      khoaPhong: { type: String, required: true },
      soDienThoai: { type: String },
      email: { type: String },
    },

    handlerId: {
      type: Schema.ObjectId,
      ref: "User",
      description: "Người được phân công xử lý",
    },

    assignedDepartmentId: {
      type: Schema.ObjectId,
      ref: "Khoa",
      description: "Phòng ban được phân công xử lý",
    },

    // Ưu tiên và trạng thái
    priority: {
      type: String,
      enum: ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"],
      default: "BINH_THUONG",
    },

    status: {
      type: String,
      enum: [
        "MOI_TAO", // Vừa tạo
        "DA_TIEP_NHAN", // Phòng ban đã tiếp nhận
        "DANG_XU_LY", // Đang xử lý
        "CHO_PHAN_HOI", // Chờ phản hồi từ người yêu cầu
        "DA_GIAI_QUYET", // Đã giải quyết, chờ xác nhận
        "DA_DONG", // Đã đóng (hoàn thành)
        "HUY_BO", // Bị hủy bỏ
        "CHUYEN_TIEP", // Chuyển tiếp cho phòng ban khác
        "LEO_THANG", // Leo thang lên cấp cao hơn
      ],
      default: "MOI_TAO",
    },

    // Thời gian và SLA
    createdAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date }, // Thời gian tiếp nhận
    startedAt: { type: Date }, // Thời gian bắt đầu xử lý
    resolvedAt: { type: Date }, // Thời gian giải quyết
    closedAt: { type: Date }, // Thời gian đóng

    slaInfo: {
      expectedResponseTime: {
        type: Number,
        description: "Thời gian phản hồi mong đợi (giờ)",
      },
      expectedResolutionTime: {
        type: Number,
        description: "Thời gian giải quyết mong đợi (giờ)",
      },
      isOverdue: { type: Boolean, default: false },
      overdueHours: { type: Number, default: 0 },
    },

    // Nội dung xử lý
    solution: {
      type: String,
      maxlength: 2000,
      description: "Mô tả giải pháp/cách xử lý",
    },

    // File đính kèm
    attachments: [
      {
        fileName: { type: String, required: true },
        filePath: { type: String, required: true },
        fileSize: { type: Number },
        uploadedBy: { type: Schema.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Lịch sử cập nhật và comments
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: Schema.ObjectId, ref: "User", required: true },
        updatedAt: { type: Date, default: Date.now },
        comment: { type: String, maxlength: 1000 },
      },
    ],

    comments: [
      {
        content: { type: String, required: true, maxlength: 2000 },
        authorId: { type: Schema.ObjectId, ref: "User", required: true },
        isInternal: { type: Boolean, default: false }, // Comment nội bộ hay công khai
        createdAt: { type: Date, default: Date.now },
        attachments: [{ type: String }], // File paths
      },
    ],

    // Escalation
    escalationInfo: {
      level: { type: Number, default: 0 }, // 0=normal, 1=level1, 2=level2, etc.
      escalatedBy: { type: Schema.ObjectId, ref: "User" },
      escalatedAt: { type: Date },
      reason: { type: String, maxlength: 500 },
    },

    // Đánh giá từ người yêu cầu
    feedback: {
      rating: { type: Number, min: 1, max: 5 }, // 1-5 stars
      comment: { type: String, maxlength: 1000 },
      submittedAt: { type: Date },
    },

    // Transfer ticket
    transferHistory: [
      {
        fromDepartment: { type: Schema.ObjectId, ref: "Khoa" },
        toDepartment: { type: Schema.ObjectId, ref: "Khoa" },
        transferredBy: { type: Schema.ObjectId, ref: "User" },
        transferredAt: { type: Date, default: Date.now },
        reason: { type: String, maxlength: 500 },
      },
    ],

    // Soft delete
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ categoryId: 1 });
ticketSchema.index({ requesterId: 1 });
ticketSchema.index({ handlerId: 1 });
ticketSchema.index({ assignedDepartmentId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ routineDutyId: 1 });

// Virtual fields
ticketSchema.virtual("isOverdue").get(function () {
  if (this.status === "DA_DONG" || this.status === "HUY_BO") return false;

  const now = new Date();
  const expectedTime = this.slaInfo.expectedResolutionTime;
  if (!expectedTime) return false;

  const deadlineTime = new Date(
    this.createdAt.getTime() + expectedTime * 60 * 60 * 1000
  );
  return now > deadlineTime;
});

ticketSchema.virtual("responseTimeHours").get(function () {
  if (!this.acknowledgedAt) return null;
  return (
    Math.round(
      ((this.acknowledgedAt - this.createdAt) / (1000 * 60 * 60)) * 100
    ) / 100
  );
});

ticketSchema.virtual("resolutionTimeHours").get(function () {
  if (!this.resolvedAt) return null;
  return (
    Math.round(((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)) * 100) /
    100
  );
});

// Pre-save middleware
ticketSchema.pre("save", async function (next) {
  // Generate ticket number nếu chưa có
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    const prefix = "TK";
    const year = new Date().getFullYear().toString().substr(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const sequence = (count + 1).toString().padStart(4, "0");
    this.ticketNumber = `${prefix}${year}${month}${sequence}`;
  }

  // Cập nhật SLA overdue status
  this.updateSLAStatus();

  next();
});

ticketSchema.methods.updateSLAStatus = function () {
  const now = new Date();
  const expectedTime = this.slaInfo.expectedResolutionTime;

  if (expectedTime && !["DA_DONG", "HUY_BO"].includes(this.status)) {
    const deadlineTime = new Date(
      this.createdAt.getTime() + expectedTime * 60 * 60 * 1000
    );
    this.slaInfo.isOverdue = now > deadlineTime;

    if (this.slaInfo.isOverdue) {
      this.slaInfo.overdueHours =
        Math.round(((now - deadlineTime) / (1000 * 60 * 60)) * 100) / 100;
    }
  }
};

const Ticket = mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
```

#### 1.2 Tạo TicketCategory Model

**File mới**: `modules/workmanagement/models/TicketCategory.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketCategorySchema = Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },

    // Phòng ban xử lý mặc định
    defaultHandlerDepartmentId: {
      type: Schema.ObjectId,
      ref: "Khoa",
      required: true,
    },

    // SLA mặc định cho loại ticket này
    defaultSLA: {
      responseTimeHours: { type: Number, default: 4 },
      resolutionTimeHours: { type: Number, default: 24 },
    },

    // Priority mặc định
    defaultPriority: {
      type: String,
      enum: ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"],
      default: "BINH_THUONG",
    },

    // Có cần gán vào Nhiệm vụ Thường quy không
    requiresRoutineDutyAssignment: {
      type: Boolean,
      default: true,
    },

    // Template form fields cho loại ticket này
    formTemplate: [
      {
        fieldName: { type: String, required: true },
        fieldType: {
          type: String,
          enum: ["text", "textarea", "select", "number", "date"],
          required: true,
        },
        fieldLabel: { type: String, required: true },
        isRequired: { type: Boolean, default: false },
        options: [{ type: String }], // For select fields
        placeholder: { type: String },
      },
    ],

    // Workflow steps
    workflowSteps: [
      {
        stepName: { type: String, required: true },
        stepOrder: { type: Number, required: true },
        assignedRole: { type: String }, // 'requester', 'handler', 'manager'
        isOptional: { type: Boolean, default: false },
      },
    ],

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ticketCategorySchema.index({ name: 1 }, { unique: true });
ticketCategorySchema.index({ defaultHandlerDepartmentId: 1 });

const TicketCategory = mongoose.model("TicketCategory", ticketCategorySchema);
module.exports = TicketCategory;
```

### 2. Tạo Controller cho Ticket System

#### 2.1 Ticket Controller chính

**File mới**: `modules/workmanagement/controllers/ticket.controller.js`

```javascript
const Ticket = require("../models/Ticket");
const TicketCategory = require("../models/TicketCategory");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const User = require("../../../models/User");
const responseFormatter = require("../utils/responseFormatter");
const QueryBuilder = require("../utils/queryBuilder");
const TicketService = require("../services/ticket.service");

// 1. Lấy danh sách tickets
exports.getDanhSachTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      categoryId,
      requesterId,
      handlerId,
      assignedDepartmentId,
      status,
      priority,
      search,
      tuNgay,
      denNgay,
      isOverdue,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filters
    const filters = { isDeleted: false };
    if (categoryId) filters.categoryId = categoryId;
    if (requesterId) filters.requesterId = requesterId;
    if (handlerId) filters.handlerId = handlerId;
    if (assignedDepartmentId)
      filters.assignedDepartmentId = assignedDepartmentId;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    // Filter by user role
    const userRole = req.user.PhanQuyen;
    const userKhoaId = req.user.KhoaID;

    if (userRole === "normal") {
      // Nhân viên chỉ xem tickets của mình
      filters.$or = [
        { requesterId: req.user._id },
        { handlerId: req.user._id },
      ];
    } else if (userRole === "manager") {
      // Manager xem tickets của khoa mình
      filters.assignedDepartmentId = userKhoaId;
    }
    // Admin xem tất cả

    // Date range
    if (tuNgay || denNgay) {
      filters.createdAt = {};
      if (tuNgay) filters.createdAt.$gte = new Date(tuNgay);
      if (denNgay) filters.createdAt.$lte = new Date(denNgay);
    }

    // Overdue filter
    if (isOverdue === "true") {
      filters["slaInfo.isOverdue"] = true;
    }

    const queryBuilder = new QueryBuilder(Ticket, req.query)
      .filter(filters)
      .search(["title", "description", "ticketNumber"], search)
      .sort(sortBy, sortOrder === "desc" ? -1 : 1)
      .paginate(parseInt(page), parseInt(limit))
      .populate([
        { path: "categoryId", select: "name defaultSLA" },
        { path: "requesterId", select: "HoTen Email KhoaID" },
        { path: "handlerId", select: "HoTen Email" },
        { path: "assignedDepartmentId", select: "TenKhoa MaKhoa" },
        { path: "routineDutyId", select: "TenNhiemVu" },
      ]);

    const result = await queryBuilder.execute();
    const total = await Ticket.countDocuments(filters);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };

    res.json(
      responseFormatter.successResponse(
        result,
        "Lấy danh sách tickets thành công",
        pagination
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 2. Lấy chi tiết ticket
exports.getChiTietTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate("categoryId")
      .populate("requesterId", "HoTen Email KhoaID SoDienThoai")
      .populate("handlerId", "HoTen Email KhoaID")
      .populate("assignedDepartmentId", "TenKhoa MaKhoa")
      .populate("routineDutyId", "TenNhiemVu MucDoKho")
      .populate("comments.authorId", "HoTen")
      .populate("statusHistory.updatedBy", "HoTen")
      .populate("transferHistory.fromDepartment", "TenKhoa")
      .populate("transferHistory.toDepartment", "TenKhoa")
      .populate("transferHistory.transferredBy", "HoTen");

    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    // Kiểm tra quyền xem
    const hasPermission = await TicketService.kiemTraQuyenXem(req.user, ticket);
    if (!hasPermission) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền xem ticket này"));
    }

    res.json(
      responseFormatter.successResponse(
        ticket,
        "Lấy chi tiết ticket thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 3. Tạo ticket mới
exports.taoTicketMoi = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      priority,
      attachments,
      customFields,
    } = req.body;

    // Validate category
    const category = await TicketCategory.findById(categoryId);
    if (!category || !category.isActive) {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Loại ticket không hợp lệ"));
    }

    // Lấy thông tin người tạo
    const requester = await User.findById(req.user._id).populate("KhoaID");

    // Tạo ticket mới
    const ticketMoi = new Ticket({
      title,
      description,
      categoryId,
      requesterId: req.user._id,
      requesterInfo: {
        hoTen: requester.HoTen,
        khoaPhong: requester.KhoaID?.TenKhoa || "N/A",
        soDienThoai: requester.SoDienThoai || "",
        email: requester.Email || "",
      },
      assignedDepartmentId: category.defaultHandlerDepartmentId,
      priority: priority || category.defaultPriority,
      slaInfo: {
        expectedResponseTime: category.defaultSLA.responseTimeHours,
        expectedResolutionTime: category.defaultSLA.resolutionTimeHours,
      },
      attachments: attachments || [],
      customFields: customFields || {},
      statusHistory: [
        {
          status: "MOI_TAO",
          updatedBy: req.user._id,
          comment: "Ticket được tạo mới",
        },
      ],
    });

    await ticketMoi.save();

    // Populate dữ liệu trước khi trả về
    await ticketMoi.populate([
      { path: "categoryId", select: "name" },
      { path: "assignedDepartmentId", select: "TenKhoa" },
    ]);

    // Gửi thông báo cho phòng ban xử lý
    await TicketService.guiThongBaoTicketMoi(ticketMoi);

    res
      .status(201)
      .json(
        responseFormatter.successResponse(ticketMoi, "Tạo ticket thành công")
      );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 4. Tiếp nhận ticket (phòng ban)
exports.tiepNhanTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { handlerId, ghiChu } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (ticket.status !== "MOI_TAO") {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Ticket đã được tiếp nhận"));
    }

    // Kiểm tra quyền tiếp nhận
    if (
      ticket.assignedDepartmentId.toString() !== req.user.KhoaID.toString() &&
      req.user.PhanQuyen !== "admin"
    ) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Không có quyền tiếp nhận ticket này")
        );
    }

    // Validate handler nếu có
    if (handlerId) {
      const handler = await User.findById(handlerId);
      if (
        !handler ||
        handler.KhoaID.toString() !== ticket.assignedDepartmentId.toString()
      ) {
        return res
          .status(400)
          .json(
            responseFormatter.errorResponse(
              "Người xử lý phải thuộc phòng ban được phân công"
            )
          );
      }
    }

    // Cập nhật trạng thái
    ticket.status = "DA_TIEP_NHAN";
    ticket.acknowledgedAt = new Date();
    if (handlerId) {
      ticket.handlerId = handlerId;
    }

    ticket.statusHistory.push({
      status: "DA_TIEP_NHAN",
      updatedBy: req.user._id,
      comment: ghiChu || "Ticket đã được tiếp nhận",
    });

    await ticket.save();

    // Gửi thông báo cho người tạo
    await TicketService.guiThongBao(ticket, "TIEP_NHAN", req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Tiếp nhận ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 5. Gán ticket vào Nhiệm vụ Thường quy và bắt đầu xử lý
exports.batDauXuLy = async (req, res) => {
  try {
    const { id } = req.params;
    const { routineDutyId, ghiChu } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (!["DA_TIEP_NHAN"].includes(ticket.status)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể bắt đầu xử lý ở trạng thái hiện tại"
          )
        );
    }

    // Kiểm tra quyền xử lý
    const hasPermission = await TicketService.kiemTraQuyenXuLy(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Không có quyền xử lý ticket này")
        );
    }

    // Validate Nhiệm vụ Thường quy
    const nhiemVu = await NhiemVuThuongQuy.findById(routineDutyId);
    if (!nhiemVu || nhiemVu.isDeleted) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse("Nhiệm vụ thường quy không hợp lệ")
        );
    }

    // Cập nhật ticket
    ticket.status = "DANG_XU_LY";
    ticket.startedAt = new Date();
    ticket.routineDutyId = routineDutyId;

    if (!ticket.handlerId) {
      ticket.handlerId = req.user._id;
    }

    ticket.statusHistory.push({
      status: "DANG_XU_LY",
      updatedBy: req.user._id,
      comment:
        ghiChu || `Bắt đầu xử lý - Gán vào nhiệm vụ: ${nhiemVu.TenNhiemVu}`,
    });

    await ticket.save();

    res.json(
      responseFormatter.successResponse(
        ticket,
        "Bắt đầu xử lý ticket thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 6. Cập nhật tiến độ xử lý
exports.capNhatTienDo = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isInternal, attachments } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (!["DANG_XU_LY", "CHO_PHAN_HOI"].includes(ticket.status)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể cập nhật ở trạng thái hiện tại"
          )
        );
    }

    // Kiểm tra quyền cập nhật
    const hasPermission = await TicketService.kiemTraQuyenXuLy(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Không có quyền cập nhật ticket này")
        );
    }

    // Thêm comment
    ticket.comments.push({
      content,
      authorId: req.user._id,
      isInternal: isInternal || false,
      attachments: attachments || [],
    });

    await ticket.save();

    // Gửi thông báo nếu không phải comment internal
    if (!isInternal) {
      await TicketService.guiThongBao(ticket, "CAP_NHAT_TIEN_DO", req.user._id);
    }

    res.json(
      responseFormatter.successResponse(ticket, "Cập nhật tiến độ thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 7. Yêu cầu phản hồi từ người tạo
exports.yeuCauPhanHoi = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (!["DANG_XU_LY"].includes(ticket.status)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể yêu cầu phản hồi ở trạng thái hiện tại"
          )
        );
    }

    // Kiểm tra quyền
    const hasPermission = await TicketService.kiemTraQuyenXuLy(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Không có quyền thao tác ticket này")
        );
    }

    // Cập nhật trạng thái
    ticket.status = "CHO_PHAN_HOI";
    ticket.statusHistory.push({
      status: "CHO_PHAN_HOI",
      updatedBy: req.user._id,
      comment: `Yêu cầu phản hồi: ${message}`,
    });

    await ticket.save();

    // Gửi thông báo cho người tạo
    await TicketService.guiThongBao(ticket, "YEU_CAU_PHAN_HOI", req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Yêu cầu phản hồi thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 8. Giải quyết ticket
exports.giaiQuyetTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { solution, attachments } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (!["DANG_XU_LY", "CHO_PHAN_HOI"].includes(ticket.status)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể giải quyết ở trạng thái hiện tại"
          )
        );
    }

    // Kiểm tra quyền
    const hasPermission = await TicketService.kiemTraQuyenXuLy(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Không có quyền giải quyết ticket này"
          )
        );
    }

    // Cập nhật ticket
    ticket.status = "DA_GIAI_QUYET";
    ticket.resolvedAt = new Date();
    ticket.solution = solution;

    if (attachments && attachments.length > 0) {
      ticket.attachments.push(
        ...attachments.map((att) => ({
          ...att,
          uploadedBy: req.user._id,
        }))
      );
    }

    ticket.statusHistory.push({
      status: "DA_GIAI_QUYET",
      updatedBy: req.user._id,
      comment: "Ticket đã được giải quyết",
    });

    await ticket.save();

    // Gửi thông báo cho người tạo
    await TicketService.guiThongBao(ticket, "DA_GIAI_QUYET", req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Giải quyết ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 9. Người tạo xác nhận và đóng ticket
exports.dongTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body; // { rating, comment }

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (ticket.status !== "DA_GIAI_QUYET") {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Ticket chưa được giải quyết"));
    }

    // Chỉ người tạo mới có quyền đóng
    if (ticket.requesterId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Chỉ người tạo mới có quyền đóng ticket"
          )
        );
    }

    // Cập nhật ticket
    ticket.status = "DA_DONG";
    ticket.closedAt = new Date();

    if (feedback) {
      ticket.feedback = {
        rating: feedback.rating,
        comment: feedback.comment,
        submittedAt: new Date(),
      };
    }

    ticket.statusHistory.push({
      status: "DA_DONG",
      updatedBy: req.user._id,
      comment: "Ticket đã được đóng",
    });

    await ticket.save();

    res.json(
      responseFormatter.successResponse(ticket, "Đóng ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 10. Mở lại ticket
exports.moLaiTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (ticket.status !== "DA_DONG") {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse("Chỉ có thể mở lại ticket đã đóng")
        );
    }

    // Chỉ người tạo mới có quyền mở lại
    if (ticket.requesterId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Chỉ người tạo mới có quyền mở lại ticket"
          )
        );
    }

    // Cập nhật trạng thái
    ticket.status = "DANG_XU_LY";
    ticket.closedAt = null;
    ticket.feedback = null;

    ticket.statusHistory.push({
      status: "DANG_XU_LY",
      updatedBy: req.user._id,
      comment: `Mở lại ticket: ${reason}`,
    });

    await ticket.save();

    // Gửi thông báo cho handler
    await TicketService.guiThongBao(ticket, "MO_LAI", req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Mở lại ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 11. Chuyển tiếp ticket
exports.chuyenTiepTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { toDepartmentId, reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    if (["DA_DONG", "HUY_BO"].includes(ticket.status)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể chuyển tiếp ticket ở trạng thái hiện tại"
          )
        );
    }

    // Kiểm tra quyền chuyển tiếp
    const hasPermission = await TicketService.kiemTraQuyenXuLy(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Không có quyền chuyển tiếp ticket này"
          )
        );
    }

    // Validate department đích
    const toDepartment = await require("../../../models/Khoa").findById(
      toDepartmentId
    );
    if (!toDepartment) {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Phòng ban đích không hợp lệ"));
    }

    // Lưu lịch sử chuyển tiếp
    ticket.transferHistory.push({
      fromDepartment: ticket.assignedDepartmentId,
      toDepartment: toDepartmentId,
      transferredBy: req.user._id,
      reason,
    });

    // Cập nhật thông tin ticket
    ticket.assignedDepartmentId = toDepartmentId;
    ticket.handlerId = null; // Reset handler
    ticket.status = "CHUYEN_TIEP";

    ticket.statusHistory.push({
      status: "CHUYEN_TIEP",
      updatedBy: req.user._id,
      comment: `Chuyển tiếp đến ${toDepartment.TenKhoa}: ${reason}`,
    });

    await ticket.save();

    // Gửi thông báo cho phòng ban mới
    await TicketService.guiThongBaoChuyenTiep(ticket, req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Chuyển tiếp ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 12. Leo thang ticket
exports.leoThangTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy ticket"));
    }

    // Kiểm tra quyền leo thang
    const hasPermission = await TicketService.kiemTraQuyenLeoThang(
      req.user,
      ticket
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Không có quyền leo thang ticket này")
        );
    }

    // Cập nhật escalation info
    ticket.escalationInfo.level += 1;
    ticket.escalationInfo.escalatedBy = req.user._id;
    ticket.escalationInfo.escalatedAt = new Date();
    ticket.escalationInfo.reason = reason;
    ticket.status = "LEO_THANG";

    ticket.statusHistory.push({
      status: "LEO_THANG",
      updatedBy: req.user._id,
      comment: `Leo thang level ${ticket.escalationInfo.level}: ${reason}`,
    });

    await ticket.save();

    // Gửi thông báo cho level cao hơn
    await TicketService.guiThongBaoLeoThang(ticket, req.user._id);

    res.json(
      responseFormatter.successResponse(ticket, "Leo thang ticket thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 13. Thống kê tickets
exports.thongKeTickets = async (req, res) => {
  try {
    const {
      khoaId,
      handlerId,
      categoryId,
      tuNgay,
      denNgay,
      loaiThongKe = "tong-quan",
    } = req.query;

    const matchStage = { isDeleted: false };

    // Apply filters
    if (khoaId)
      matchStage.assignedDepartmentId = mongoose.Types.ObjectId(khoaId);
    if (handlerId) matchStage.handlerId = mongoose.Types.ObjectId(handlerId);
    if (categoryId) matchStage.categoryId = mongoose.Types.ObjectId(categoryId);

    if (tuNgay || denNgay) {
      matchStage.createdAt = {};
      if (tuNgay) matchStage.createdAt.$gte = new Date(tuNgay);
      if (denNgay) matchStage.createdAt.$lte = new Date(denNgay);
    }

    let pipeline = [];

    switch (loaiThongKe) {
      case "theo-trang-thai":
        pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: "$status",
              soLuong: { $sum: 1 },
              diemDanhGiaTrungBinh: { $avg: "$feedback.rating" },
            },
          },
        ];
        break;

      case "theo-loai":
        pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: "$categoryId",
              soLuong: { $sum: 1 },
              daDong: {
                $sum: { $cond: [{ $eq: ["$status", "DA_DONG"] }, 1, 0] },
              },
              thoiGianXuLyTrungBinh: { $avg: "$resolutionTimeHours" },
            },
          },
          {
            $lookup: {
              from: "ticketcategories",
              localField: "_id",
              foreignField: "_id",
              as: "category",
            },
          },
        ];
        break;

      case "sla-performance":
        pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: null,
              tongSo: { $sum: 1 },
              quaHan: { $sum: { $cond: ["$slaInfo.isOverdue", 1, 0] } },
              thoiGianPhanHoiTrungBinh: { $avg: "$responseTimeHours" },
              thoiGianGiaiQuyetTrungBinh: { $avg: "$resolutionTimeHours" },
            },
          },
        ];
        break;

      default: // tong-quan
        const [tongQuan] = await Ticket.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              tongSo: { $sum: 1 },
              moiTao: {
                $sum: { $cond: [{ $eq: ["$status", "MOI_TAO"] }, 1, 0] },
              },
              dangXuLy: {
                $sum: { $cond: [{ $eq: ["$status", "DANG_XU_LY"] }, 1, 0] },
              },
              daDong: {
                $sum: { $cond: [{ $eq: ["$status", "DA_DONG"] }, 1, 0] },
              },
              quaHan: { $sum: { $cond: ["$slaInfo.isOverdue", 1, 0] } },
              diemDanhGiaTrungBinh: { $avg: "$feedback.rating" },
            },
          },
        ]);

        return res.json(
          responseFormatter.successResponse(
            tongQuan || {},
            "Thống kê tổng quan thành công"
          )
        );
    }

    const result = await Ticket.aggregate(pipeline);
    res.json(responseFormatter.successResponse(result, "Thống kê thành công"));
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

module.exports = {
  getDanhSachTickets,
  getChiTietTicket,
  taoTicketMoi,
  tiepNhanTicket,
  batDauXuLy,
  capNhatTienDo,
  yeuCauPhanHoi,
  giaiQuyetTicket,
  dongTicket,
  moLaiTicket,
  chuyenTiepTicket,
  leoThangTicket,
  thongKeTickets,
};
```

### 3. Service Layer cho Ticket Business Logic

#### 3.1 Ticket Service

**File mới**: `modules/workmanagement/services/ticket.service.js`

```javascript
const Ticket = require("../models/Ticket");
const TicketCategory = require("../models/TicketCategory");
const User = require("../../../models/User");
const NotificationService = require("./notification.service");

class TicketService {
  // Kiểm tra quyền xem ticket
  async kiemTraQuyenXem(user, ticket) {
    // Admin xem tất cả
    if (user.PhanQuyen === "admin") return true;

    // Người tạo và người xử lý luôn được xem
    if (ticket.requesterId.toString() === user._id.toString()) return true;
    if (ticket.handlerId && ticket.handlerId.toString() === user._id.toString())
      return true;

    // Manager của phòng ban được phân công
    if (
      user.PhanQuyen === "manager" &&
      ticket.assignedDepartmentId.toString() === user.KhoaID.toString()
    ) {
      return true;
    }

    return false;
  }

  // Kiểm tra quyền xử lý ticket
  async kiemTraQuyenXuLy(user, ticket) {
    // Admin có thể xử lý tất cả
    if (user.PhanQuyen === "admin") return true;

    // Handler được phân công
    if (ticket.handlerId && ticket.handlerId.toString() === user._id.toString())
      return true;

    // Manager của phòng ban được phân công
    if (
      user.PhanQuyen === "manager" &&
      ticket.assignedDepartmentId.toString() === user.KhoaID.toString()
    )
      return true;

    // Nhân viên của phòng ban được phân công (nếu chưa có handler cụ thể)
    if (
      !ticket.handlerId &&
      ticket.assignedDepartmentId.toString() === user.KhoaID.toString()
    ) {
      return true;
    }

    return false;
  }

  // Kiểm tra quyền leo thang
  async kiemTraQuyenLeoThang(user, ticket) {
    // Chỉ handler và manager có quyền leo thang
    if (ticket.handlerId && ticket.handlerId.toString() === user._id.toString())
      return true;

    if (
      user.PhanQuyen === "manager" &&
      ticket.assignedDepartmentId.toString() === user.KhoaID.toString()
    ) {
      return true;
    }

    return false;
  }

  // Gửi thông báo ticket mới
  async guiThongBaoTicketMoi(ticket) {
    // Tìm managers của phòng ban được phân công
    const managers = await User.find({
      KhoaID: ticket.assignedDepartmentId,
      PhanQuyen: "manager",
      isDeleted: false,
    });

    if (managers.length > 0) {
      await NotificationService.sendMultiple({
        recipients: managers,
        type: "TICKET_MOI",
        title: `Ticket mới: ${ticket.title}`,
        content: `Ticket #${ticket.ticketNumber} cần được xử lý`,
        relatedId: ticket._id,
        relatedType: "Ticket",
      });
    }
  }

  // Gửi thông báo chung
  async guiThongBao(ticket, loaiThongBao, nguoiGui) {
    const recipients = [];
    let title = "";
    let content = "";

    switch (loaiThongBao) {
      case "TIEP_NHAN":
        recipients.push(ticket.requesterId);
        title = `Ticket #${ticket.ticketNumber} đã được tiếp nhận`;
        content = `Ticket "${ticket.title}" đã được tiếp nhận và sẽ được xử lý sớm`;
        break;

      case "CAP_NHAT_TIEN_DO":
        recipients.push(ticket.requesterId);
        title = `Cập nhật ticket #${ticket.ticketNumber}`;
        content = `Có cập nhật mới cho ticket "${ticket.title}"`;
        break;

      case "YEU_CAU_PHAN_HOI":
        recipients.push(ticket.requesterId);
        title = `Yêu cầu phản hồi ticket #${ticket.ticketNumber}`;
        content = `Cần phản hồi thêm thông tin cho ticket "${ticket.title}"`;
        break;

      case "DA_GIAI_QUYET":
        recipients.push(ticket.requesterId);
        title = `Ticket #${ticket.ticketNumber} đã được giải quyết`;
        content = `Ticket "${ticket.title}" đã được giải quyết, vui lòng xác nhận`;
        break;

      case "MO_LAI":
        if (ticket.handlerId) recipients.push(ticket.handlerId);
        // Thêm managers
        const managers = await User.find({
          KhoaID: ticket.assignedDepartmentId,
          PhanQuyen: "manager",
        });
        recipients.push(...managers);
        title = `Ticket #${ticket.ticketNumber} đã được mở lại`;
        content = `Ticket "${ticket.title}" đã được mở lại và cần xử lý tiếp`;
        break;
    }

    if (recipients.length > 0) {
      await NotificationService.sendMultiple({
        recipients: recipients.map((r) => r._id || r),
        type: loaiThongBao,
        title,
        content,
        relatedId: ticket._id,
        relatedType: "Ticket",
      });
    }
  }

  // Gửi thông báo chuyển tiếp
  async guiThongBaoChuyenTiep(ticket, nguoiChuyenTiep) {
    const managers = await User.find({
      KhoaID: ticket.assignedDepartmentId,
      PhanQuyen: "manager",
    });

    await NotificationService.sendMultiple({
      recipients: managers,
      type: "CHUYEN_TIEP",
      title: `Ticket #${ticket.ticketNumber} được chuyển tiếp`,
      content: `Ticket "${ticket.title}" được chuyển đến phòng ban của bạn`,
      relatedId: ticket._id,
      relatedType: "Ticket",
    });
  }

  // Gửi thông báo leo thang
  async guiThongBaoLeoThang(ticket, nguoiLeoThang) {
    // Tìm giám đốc hoặc admin
    const directors = await User.find({
      PhanQuyen: { $in: ["admin"] },
    });

    await NotificationService.sendMultiple({
      recipients: directors,
      type: "LEO_THANG",
      title: `Ticket #${ticket.ticketNumber} được leo thang`,
      content: `Ticket "${ticket.title}" đã được leo thang level ${ticket.escalationInfo.level}`,
      relatedId: ticket._id,
      relatedType: "Ticket",
    });
  }

  // Tự động cập nhật SLA status
  async capNhatSLAStatus() {
    const activeTickets = await Ticket.find({
      status: { $nin: ["DA_DONG", "HUY_BO"] },
      isDeleted: false,
    });

    const updatePromises = activeTickets.map((ticket) => {
      ticket.updateSLAStatus();
      return ticket.save();
    });

    await Promise.all(updatePromises);
    return activeTickets.length;
  }

  // Tự động escalate tickets quá hạn nghiêm trọng
  async autoEscalateOverdueTickets() {
    const criticallyOverdueTickets = await Ticket.find({
      "slaInfo.isOverdue": true,
      "slaInfo.overdueHours": { $gte: 48 }, // Quá hạn hơn 48 giờ
      "escalationInfo.level": { $lt: 2 }, // Chưa escalate quá 2 level
      status: { $nin: ["DA_DONG", "HUY_BO"] },
      isDeleted: false,
    });

    const escalatePromises = criticallyOverdueTickets.map((ticket) => {
      ticket.escalationInfo.level += 1;
      ticket.escalationInfo.escalatedAt = new Date();
      ticket.escalationInfo.reason = "Auto-escalation due to SLA breach";
      ticket.status = "LEO_THANG";

      ticket.statusHistory.push({
        status: "LEO_THANG",
        updatedBy: null, // System user
        comment: `Auto-escalation level ${ticket.escalationInfo.level} - SLA breach`,
      });

      return ticket.save();
    });

    await Promise.all(escalatePromises);

    // Gửi thông báo cho từng ticket được escalate
    criticallyOverdueTickets.forEach((ticket) => {
      this.guiThongBaoLeoThang(ticket, null);
    });

    return criticallyOverdueTickets.length;
  }

  // Thống kê hiệu suất xử lý
  async thongKeHieuSuatXuLy(filters = {}) {
    const matchStage = { isDeleted: false, ...filters };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$handlerId",
          tongSoTicket: { $sum: 1 },
          daDong: { $sum: { $cond: [{ $eq: ["$status", "DA_DONG"] }, 1, 0] } },
          diemDanhGiaTrungBinh: { $avg: "$feedback.rating" },
          thoiGianXuLyTrungBinh: {
            $avg: {
              $cond: [
                { $ne: ["$resolutionTimeHours", null] },
                "$resolutionTimeHours",
                null,
              ],
            },
          },
          soLanLeoThang: {
            $sum: { $cond: [{ $gt: ["$escalationInfo.level", 0] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "handler",
        },
      },
      {
        $project: {
          handler: { $arrayElemAt: ["$handler", 0] },
          tongSoTicket: 1,
          daDong: 1,
          tyLeHoanThanh: {
            $cond: [
              { $gt: ["$tongSoTicket", 0] },
              { $multiply: [{ $divide: ["$daDong", "$tongSoTicket"] }, 100] },
              0,
            ],
          },
          diemDanhGiaTrungBinh: 1,
          thoiGianXuLyTrungBinh: 1,
          soLanLeoThang: 1,
        },
      },
    ];

    return await Ticket.aggregate(pipeline);
  }
}

module.exports = new TicketService();
```

## Kết quả mong đợi Phase 4

Sau khi hoàn thành Phase 4:

1. ✅ Hệ thống Ticket hoàn chỉnh với workflow phức tạp
2. ✅ SLA tracking và auto-escalation
3. ✅ Hệ thống phân quyền chi tiết
4. ✅ Real-time notifications
5. ✅ Comprehensive reporting và analytics
6. ✅ Chuẩn bị cho Phase 5: KPI Evaluation System

## Files cần tạo trong Phase 4

1. `modules/workmanagement/models/TicketCategory.js` (tạo mới)
2. `modules/workmanagement/controllers/ticket.controller.js` (tạo mới)
3. `modules/workmanagement/controllers/ticketCategory.controller.js` (tạo mới)
4. `modules/workmanagement/routes/ticket.routes.js` (tạo mới)
5. `modules/workmanagement/routes/ticketCategory.routes.js` (tạo mới)
6. `modules/workmanagement/services/ticket.service.js` (tạo mới)
7. `modules/workmanagement/middlewares/ticket.validation.js` (tạo mới)
8. `modules/workmanagement/tests/ticket.test.js` (tạo mới)
9. `modules/workmanagement/docs/ticket.api.md` (tạo mới)
10. Cập nhật `models/Ticket.js` (hoàn thiện)
11. Cập nhật `routes/index.js`

## Lưu ý quan trọng Phase 4

- **Workflow phức tạp**: Ticket có nhiều trạng thái và business rules
- **SLA compliance**: Implement auto-tracking và alerting
- **Security**: Strict permission checking cho mọi operation
- **Performance**: Optimize queries với proper indexing
- **Real-time**: WebSocket cho live updates
- **Integration**: Liên kết chặt chẽ với Nhiệm vụ Thường quy
