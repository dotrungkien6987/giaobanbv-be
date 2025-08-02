# Phase 3: Xây dựng Backend APIs cho Công việc Được giao (Assigned Tasks)

## Mục tiêu Phase 3

Xây dựng hệ thống Backend APIs hoàn chỉnh cho quản lý "Công việc Được giao" - thành phần quan trọng để theo dõi và đánh giá hiệu suất nhân viên.

## Tiền điều kiện

- ✅ Phase 1 & 2 đã hoàn thành
- ✅ APIs Nhiệm vụ Thường quy đã hoạt động
- ✅ Models AssignedTask đã được thiết lập

## Đặc điểm nghiệp vụ của Công việc Được giao

### Luồng nghiệp vụ chính:

1. **Người giao** (manager) tạo công việc và gán cho nhân viên
2. **Nhân viên** nhận thông báo và có thể chấp nhận/từ chối
3. **Thực hiện** công việc với cập nhật tiến độ
4. **Báo cáo hoàn thành** và chờ duyệt
5. **Người giao đánh giá** và xác nhận hoàn thành

### Liên kết quan trọng:

- **BẮT BUỘC** gán vào một Nhiệm vụ Thường quy
- Hỗ trợ giao cho **cá nhân** hoặc **nhóm**
- Tracking **tiến độ** và **thời gian** thực hiện

## Nhiệm vụ chính

### 1. Cập nhật và hoàn thiện Model AssignedTask

#### 1.1 Kiểm tra và bổ sung fields

**File**: `modules/workmanagement/models/AssignedTask.js`

```javascript
// Đảm bảo có đầy đủ các fields:
const congViecDuocGiaoSchema = Schema(
  {
    TieuDe: { type: String, required: true, trim: true, maxlength: 255 },
    MoTa: { type: String, maxlength: 5000 },

    // Liên kết bắt buộc
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
    },

    // Người giao và nhận
    NguoiGiaoViecID: { type: Schema.ObjectId, required: true, ref: "User" },

    // Loại công việc và ưu tiên
    LoaiCongViec: { type: String, enum: ["CANHAN", "NHOM"], default: "CANHAN" },
    MucDoUuTien: {
      type: String,
      enum: ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"],
      default: "BINH_THUONG",
    },

    // Trạng thái
    TrangThai: {
      type: String,
      enum: [
        "TAO_MOI", // Vừa tạo, chưa giao
        "DA_GIAO", // Đã giao cho nhân viên
        "CHAP_NHAN", // Nhân viên đã chấp nhận
        "TU_CHOI", // Nhân viên từ chối
        "DANG_THUC_HIEN", // Đang thực hiện
        "CHO_DUYET", // Báo cáo hoàn thành, chờ duyệt
        "HOAN_THANH", // Đã hoàn thành và được duyệt
        "HUY_BO", // Bị hủy bỏ
        "QUA_HAN", // Quá hạn chưa hoàn thành
      ],
      default: "TAO_MOI",
    },

    // Thời gian
    ThoiGianBatDau: { type: Date, required: true },
    ThoiGianKetThuc: { type: Date, required: true },
    ThoiGianChapNhan: { type: Date },
    ThoiGianHoanThanh: { type: Date },

    // Tiến độ
    TienDoHienTai: { type: Number, min: 0, max: 100, default: 0 },

    // Người thực hiện (hỗ trợ cả cá nhân và nhóm)
    DanhSachNguoiThucHien: [
      {
        NhanVienID: { type: Schema.ObjectId, ref: "NhanVien", required: true },
        VaiTro: {
          type: String,
          enum: ["CHINH", "PHU_TRACH"],
          default: "CHINH",
        },
        TrangThaiChapNhan: {
          type: String,
          enum: ["CHO_XAC_NHAN", "CHAP_NHAN", "TU_CHOI"],
          default: "CHO_XAC_NHAN",
        },
        LyDoTuChoi: { type: String },
        ThoiGianPhanHoi: { type: Date },
      },
    ],

    // Kết quả và đánh giá
    KetQuaThucHien: { type: String, maxlength: 2000 },
    DanhGiaCuaNguoiGiao: {
      DiemSo: { type: Number, min: 1, max: 10 },
      NhanXet: { type: String, maxlength: 1000 },
      NgayDanhGia: { type: Date },
    },

    // File đính kèm
    TepTinDinhKem: [{ type: Schema.ObjectId, ref: "TepTin" }],

    // Ghi chú và theo dõi
    GhiChu: { type: String, maxlength: 1000 },
    LichSuCapNhat: [
      {
        ThoiGian: { type: Date, default: Date.now },
        NguoiCapNhat: { type: Schema.ObjectId, ref: "User" },
        NoiDung: { type: String, required: true },
        TrangThaiCu: { type: String },
        TrangThaiMoi: { type: String },
      },
    ],

    // Soft delete
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
congViecDuocGiaoSchema.index({ NhiemVuThuongQuyID: 1 });
congViecDuocGiaoSchema.index({ NguoiGiaoViecID: 1 });
congViecDuocGiaoSchema.index({ "DanhSachNguoiThucHien.NhanVienID": 1 });
congViecDuocGiaoSchema.index({ TrangThai: 1 });
congViecDuocGiaoSchema.index({ ThoiGianKetThuc: 1 });

// Pre-save middleware
congViecDuocGiaoSchema.pre("save", function (next) {
  // Validate NhiemVuThuongQuyID bắt buộc
  if (!this.NhiemVuThuongQuyID) {
    return next(
      new Error("Công việc phải được gán vào một Nhiệm vụ Thường quy")
    );
  }

  // Validate thời gian
  if (this.ThoiGianKetThuc <= this.ThoiGianBatDau) {
    return next(new Error("Thời gian kết thúc phải sau thời gian bắt đầu"));
  }

  // Validate người thực hiện
  if (!this.DanhSachNguoiThucHien || this.DanhSachNguoiThucHien.length === 0) {
    return next(new Error("Phải có ít nhất một người thực hiện"));
  }

  next();
});
```

### 2. Tạo Controller cho Assigned Tasks

#### 2.1 Controller chính

**File mới**: `modules/workmanagement/controllers/assignedTask.controller.js`

```javascript
const AssignedTask = require("../models/AssignedTask");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const responseFormatter = require("../utils/responseFormatter");
const QueryBuilder = require("../utils/queryBuilder");

// 1. Lấy danh sách công việc được giao
exports.getDanhSachCongViec = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      nhiemVuThuongQuyId,
      nguoiGiaoViecId,
      nguoiThucHienId,
      trangThai,
      mucDoUuTien,
      search,
      tuNgay,
      denNgay,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query filters
    const filters = { isDeleted: false };
    if (nhiemVuThuongQuyId) filters.NhiemVuThuongQuyID = nhiemVuThuongQuyId;
    if (nguoiGiaoViecId) filters.NguoiGiaoViecID = nguoiGiaoViecId;
    if (trangThai) filters.TrangThai = trangThai;
    if (mucDoUuTien) filters.MucDoUuTien = mucDoUuTien;

    // Filter by người thực hiện
    if (nguoiThucHienId) {
      filters["DanhSachNguoiThucHien.NhanVienID"] = nguoiThucHienId;
    }

    // Date range filter
    if (tuNgay || denNgay) {
      filters.ThoiGianBatDau = {};
      if (tuNgay) filters.ThoiGianBatDau.$gte = new Date(tuNgay);
      if (denNgay) filters.ThoiGianBatDau.$lte = new Date(denNgay);
    }

    const queryBuilder = new QueryBuilder(AssignedTask, req.query)
      .filter(filters)
      .search(["TieuDe", "MoTa"], search)
      .sort(sortBy, sortOrder === "desc" ? -1 : 1)
      .paginate(parseInt(page), parseInt(limit))
      .populate([
        { path: "NhiemVuThuongQuyID", select: "TenNhiemVu MucDoKho" },
        { path: "NguoiGiaoViecID", select: "HoTen Email" },
        { path: "DanhSachNguoiThucHien.NhanVienID", select: "Ten MaNhanVien" },
      ]);

    const result = await queryBuilder.execute();
    const total = await AssignedTask.countDocuments(filters);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };

    res.json(
      responseFormatter.successResponse(
        result,
        "Lấy danh sách công việc thành công",
        pagination
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 2. Lấy chi tiết công việc
exports.getChiTietCongViec = async (req, res) => {
  try {
    const { id } = req.params;

    const congViec = await AssignedTask.findById(id)
      .populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho")
      .populate("NguoiGiaoViecID", "HoTen Email KhoaID")
      .populate("DanhSachNguoiThucHien.NhanVienID", "Ten MaNhanVien KhoaID")
      .populate("TepTinDinhKem");

    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    res.json(
      responseFormatter.successResponse(
        congViec,
        "Lấy chi tiết công việc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 3. Tạo mới công việc
exports.taoMoiCongViec = async (req, res) => {
  try {
    const {
      TieuDe,
      MoTa,
      NhiemVuThuongQuyID,
      LoaiCongViec,
      MucDoUuTien,
      ThoiGianBatDau,
      ThoiGianKetThuc,
      DanhSachNguoiThucHien,
      GhiChu,
    } = req.body;

    const NguoiGiaoViecID = req.user._id;

    // Validate Nhiệm vụ Thường quy exists
    const nhiemVu = await NhiemVuThuongQuy.findById(NhiemVuThuongQuyID);
    if (!nhiemVu || nhiemVu.isDeleted) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse("Nhiệm vụ thường quy không tồn tại")
        );
    }

    // Tạo công việc mới
    const congViecMoi = new AssignedTask({
      TieuDe,
      MoTa,
      NhiemVuThuongQuyID,
      NguoiGiaoViecID,
      LoaiCongViec,
      MucDoUuTien,
      ThoiGianBatDau: new Date(ThoiGianBatDau),
      ThoiGianKetThuc: new Date(ThoiGianKetThuc),
      DanhSachNguoiThucHien: DanhSachNguoiThucHien.map((nt) => ({
        NhanVienID: nt.NhanVienID,
        VaiTro: nt.VaiTro || "CHINH",
        TrangThaiChapNhan: "CHO_XAC_NHAN",
      })),
      GhiChu,
      TrangThai: "TAO_MOI",
      LichSuCapNhat: [
        {
          NguoiCapNhat: NguoiGiaoViecID,
          NoiDung: "Tạo mới công việc",
          TrangThaiMoi: "TAO_MOI",
        },
      ],
    });

    await congViecMoi.save();

    // Populate dữ liệu trước khi trả về
    await congViecMoi.populate([
      { path: "NhiemVuThuongQuyID", select: "TenNhiemVu" },
      { path: "DanhSachNguoiThucHien.NhanVienID", select: "Ten MaNhanVien" },
    ]);

    // TODO: Gửi thông báo cho nhân viên được giao

    res
      .status(201)
      .json(
        responseFormatter.successResponse(
          congViecMoi,
          "Tạo công việc thành công"
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 4. Giao việc cho nhân viên (chuyển trạng thái từ TAO_MOI -> DA_GIAO)
exports.giaoViec = async (req, res) => {
  try {
    const { id } = req.params;
    const { ghiChu } = req.body;

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    if (congViec.TrangThai !== "TAO_MOI") {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse("Công việc đã được giao trước đó")
        );
    }

    // Cập nhật trạng thái
    congViec.TrangThai = "DA_GIAO";
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: ghiChu || "Giao việc cho nhân viên",
      TrangThaiCu: "TAO_MOI",
      TrangThaiMoi: "DA_GIAO",
    });

    await congViec.save();

    // TODO: Gửi thông báo cho các nhân viên được giao

    res.json(
      responseFormatter.successResponse(congViec, "Giao việc thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 5. Nhân viên chấp nhận/từ chối công việc
exports.phanHoiCongViec = async (req, res) => {
  try {
    const { id } = req.params;
    const { trangThaiChapNhan, lyDoTuChoi } = req.body; // 'CHAP_NHAN' hoặc 'TU_CHOI'
    const nhanVienId = req.user.NhanVienID;

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    // Tìm nhân viên trong danh sách được giao
    const nguoiThucHien = congViec.DanhSachNguoiThucHien.find(
      (nt) => nt.NhanVienID.toString() === nhanVienId.toString()
    );

    if (!nguoiThucHien) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse("Bạn không được giao công việc này")
        );
    }

    if (nguoiThucHien.TrangThaiChapNhan !== "CHO_XAC_NHAN") {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse("Bạn đã phản hồi công việc này rồi")
        );
    }

    // Cập nhật trạng thái phản hồi
    nguoiThucHien.TrangThaiChapNhan = trangThaiChapNhan;
    nguoiThucHien.ThoiGianPhanHoi = new Date();
    if (trangThaiChapNhan === "TU_CHOI") {
      nguoiThucHien.LyDoTuChoi = lyDoTuChoi;
    }

    // Kiểm tra xem tất cả người được giao đã phản hồi chưa
    const allResponded = congViec.DanhSachNguoiThucHien.every(
      (nt) => nt.TrangThaiChapNhan !== "CHO_XAC_NHAN"
    );

    if (allResponded) {
      const hasAccepted = congViec.DanhSachNguoiThucHien.some(
        (nt) => nt.TrangThaiChapNhan === "CHAP_NHAN"
      );

      if (hasAccepted) {
        congViec.TrangThai = "CHAP_NHAN";
      } else {
        congViec.TrangThai = "TU_CHOI";
      }
    }

    // Thêm vào lịch sử
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: `${
        trangThaiChapNhan === "CHAP_NHAN" ? "Chấp nhận" : "Từ chối"
      } công việc${lyDoTuChoi ? ": " + lyDoTuChoi : ""}`,
      TrangThaiCu: congViec.TrangThai,
      TrangThaiMoi: allResponded
        ? hasAccepted
          ? "CHAP_NHAN"
          : "TU_CHOI"
        : congViec.TrangThai,
    });

    await congViec.save();

    res.json(
      responseFormatter.successResponse(
        congViec,
        "Phản hồi công việc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 6. Cập nhật tiến độ công việc
exports.capNhatTienDo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tienDo, ghiChu } = req.body;
    const nhanVienId = req.user.NhanVienID;

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    // Kiểm tra quyền cập nhật
    const coQuyenCapNhat = congViec.DanhSachNguoiThucHien.some(
      (nt) =>
        nt.NhanVienID.toString() === nhanVienId.toString() &&
        nt.TrangThaiChapNhan === "CHAP_NHAN"
    );

    if (!coQuyenCapNhat) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Bạn không có quyền cập nhật công việc này"
          )
        );
    }

    if (!["CHAP_NHAN", "DANG_THUC_HIEN"].includes(congViec.TrangThai)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể cập nhật tiến độ ở trạng thái hiện tại"
          )
        );
    }

    // Cập nhật tiến độ
    const tienDoCu = congViec.TienDoHienTai;
    congViec.TienDoHienTai = tienDo;

    if (congViec.TrangThai === "CHAP_NHAN" && tienDo > 0) {
      congViec.TrangThai = "DANG_THUC_HIEN";
    }

    // Thêm vào lịch sử
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: `Cập nhật tiến độ từ ${tienDoCu}% lên ${tienDo}%${
        ghiChu ? ": " + ghiChu : ""
      }`,
      TrangThaiCu: tienDoCu === 0 ? "CHAP_NHAN" : "DANG_THUC_HIEN",
      TrangThaiMoi: "DANG_THUC_HIEN",
    });

    await congViec.save();

    res.json(
      responseFormatter.successResponse(congViec, "Cập nhật tiến độ thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 7. Báo cáo hoàn thành
exports.baoCaoHoanThanh = async (req, res) => {
  try {
    const { id } = req.params;
    const { ketQuaThucHien, tepTinKetQua } = req.body;
    const nhanVienId = req.user.NhanVienID;

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    // Kiểm tra quyền báo cáo
    const coQuyenBaoCao = congViec.DanhSachNguoiThucHien.some(
      (nt) =>
        nt.NhanVienID.toString() === nhanVienId.toString() &&
        nt.TrangThaiChapNhan === "CHAP_NHAN"
    );

    if (!coQuyenBaoCao) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Bạn không có quyền báo cáo công việc này"
          )
        );
    }

    if (!["DANG_THUC_HIEN"].includes(congViec.TrangThai)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể báo cáo hoàn thành ở trạng thái hiện tại"
          )
        );
    }

    // Cập nhật thông tin hoàn thành
    congViec.TrangThai = "CHO_DUYET";
    congViec.TienDoHienTai = 100;
    congViec.KetQuaThucHien = ketQuaThucHien;
    if (tepTinKetQua && tepTinKetQua.length > 0) {
      congViec.TepTinDinhKem.push(...tepTinKetQua);
    }

    // Thêm vào lịch sử
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: "Báo cáo hoàn thành công việc",
      TrangThaiCu: "DANG_THUC_HIEN",
      TrangThaiMoi: "CHO_DUYET",
    });

    await congViec.save();

    // TODO: Gửi thông báo cho người giao việc

    res.json(
      responseFormatter.successResponse(
        congViec,
        "Báo cáo hoàn thành thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 8. Người giao việc đánh giá và duyệt
exports.danhGiaVaDuyet = async (req, res) => {
  try {
    const { id } = req.params;
    const { diemSo, nhanXet, trangThaiDuyet } = req.body; // 'HOAN_THANH' hoặc 'DANG_THUC_HIEN' (yêu cầu sửa)

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    // Kiểm tra quyền duyệt
    if (congViec.NguoiGiaoViecID.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Chỉ người giao việc mới có quyền đánh giá"
          )
        );
    }

    if (congViec.TrangThai !== "CHO_DUYET") {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Công việc chưa được báo cáo hoàn thành"
          )
        );
    }

    // Cập nhật đánh giá
    congViec.DanhGiaCuaNguoiGiao = {
      DiemSo: diemSo,
      NhanXet: nhanXet,
      NgayDanhGia: new Date(),
    };

    congViec.TrangThai = trangThaiDuyet;
    if (trangThaiDuyet === "HOAN_THANH") {
      congViec.ThoiGianHoanThanh = new Date();
    }

    // Thêm vào lịch sử
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: `${
        trangThaiDuyet === "HOAN_THANH" ? "Duyệt hoàn thành" : "Yêu cầu sửa lại"
      } - Điểm: ${diemSo}`,
      TrangThaiCu: "CHO_DUYET",
      TrangThaiMoi: trangThaiDuyet,
    });

    await congViec.save();

    res.json(
      responseFormatter.successResponse(
        congViec,
        "Đánh giá công việc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 9. Hủy bỏ công việc
exports.huyBoCongViec = async (req, res) => {
  try {
    const { id } = req.params;
    const { lyDoHuy } = req.body;

    const congViec = await AssignedTask.findById(id);
    if (!congViec || congViec.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy công việc"));
    }

    // Kiểm tra quyền hủy
    if (congViec.NguoiGiaoViecID.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json(
          responseFormatter.errorResponse(
            "Chỉ người giao việc mới có quyền hủy"
          )
        );
    }

    if (["HOAN_THANH", "HUY_BO"].includes(congViec.TrangThai)) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "Không thể hủy công việc ở trạng thái hiện tại"
          )
        );
    }

    // Cập nhật trạng thái
    const trangThaiCu = congViec.TrangThai;
    congViec.TrangThai = "HUY_BO";
    congViec.LichSuCapNhat.push({
      NguoiCapNhat: req.user._id,
      NoiDung: `Hủy bỏ công việc: ${lyDoHuy}`,
      TrangThaiCu: trangThaiCu,
      TrangThaiMoi: "HUY_BO",
    });

    await congViec.save();

    res.json(
      responseFormatter.successResponse(congViec, "Hủy bỏ công việc thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 10. Thống kê công việc
exports.thongKeCongViec = async (req, res) => {
  try {
    const {
      khoaId,
      nguoiGiaoViecId,
      nguoiThucHienId,
      tuNgay,
      denNgay,
      loaiThongKe = "tong-quan", // 'tong-quan', 'theo-trang-thai', 'theo-nhiem-vu'
    } = req.query;

    const matchStage = { isDeleted: false };

    if (khoaId) {
      // Thêm lookup để filter theo khoa (cần join với User)
    }
    if (nguoiGiaoViecId)
      matchStage.NguoiGiaoViecID = mongoose.Types.ObjectId(nguoiGiaoViecId);
    if (nguoiThucHienId)
      matchStage["DanhSachNguoiThucHien.NhanVienID"] =
        mongoose.Types.ObjectId(nguoiThucHienId);

    if (tuNgay || denNgay) {
      matchStage.ThoiGianBatDau = {};
      if (tuNgay) matchStage.ThoiGianBatDau.$gte = new Date(tuNgay);
      if (denNgay) matchStage.ThoiGianBatDau.$lte = new Date(denNgay);
    }

    let pipeline = [];

    switch (loaiThongKe) {
      case "theo-trang-thai":
        pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: "$TrangThai",
              soLuong: { $sum: 1 },
              tongDiem: { $avg: "$DanhGiaCuaNguoiGiao.DiemSo" },
            },
          },
        ];
        break;

      case "theo-nhiem-vu":
        pipeline = [
          { $match: matchStage },
          {
            $group: {
              _id: "$NhiemVuThuongQuyID",
              soLuong: { $sum: 1 },
              hoanThanh: {
                $sum: { $cond: [{ $eq: ["$TrangThai", "HOAN_THANH"] }, 1, 0] },
              },
              diemTrungBinh: { $avg: "$DanhGiaCuaNguoiGiao.DiemSo" },
            },
          },
          {
            $lookup: {
              from: "nhiemvuthuongquys",
              localField: "_id",
              foreignField: "_id",
              as: "nhiemVu",
            },
          },
        ];
        break;

      default: // tong-quan
        const [tongQuan] = await AssignedTask.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              tongSo: { $sum: 1 },
              hoanThanh: {
                $sum: { $cond: [{ $eq: ["$TrangThai", "HOAN_THANH"] }, 1, 0] },
              },
              dangThucHien: {
                $sum: {
                  $cond: [{ $eq: ["$TrangThai", "DANG_THUC_HIEN"] }, 1, 0],
                },
              },
              quaHan: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$TrangThai", "HOAN_THANH"] },
                        { $lt: ["$ThoiGianKetThuc", new Date()] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              diemTrungBinh: { $avg: "$DanhGiaCuaNguoiGiao.DiemSo" },
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

    const result = await AssignedTask.aggregate(pipeline);
    res.json(responseFormatter.successResponse(result, "Thống kê thành công"));
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

module.exports = {
  getDanhSachCongViec,
  getChiTietCongViec,
  taoMoiCongViec,
  giaoViec,
  phanHoiCongViec,
  capNhatTienDo,
  baoCaoHoanThanh,
  danhGiaVaDuyet,
  huyBoCongViec,
  thongKeCongViec,
};
```

### 3. Tạo Routes cho Assigned Tasks

#### 3.1 Route File

**File mới**: `modules/workmanagement/routes/assignedTask.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const assignedTaskController = require("../controllers/assignedTask.controller");
const {
  authenticate,
  authorize,
} = require("../../../middlewares/authentication");
const {
  validateAssignedTask,
} = require("../middlewares/assignedTask.validation");

// Routes công khai (cần authentication)
router.get("/", authenticate, assignedTaskController.getDanhSachCongViec);

router.get("/thong-ke", authenticate, assignedTaskController.thongKeCongViec);

router.get("/:id", authenticate, assignedTaskController.getChiTietCongViec);

// Routes cho nhân viên (cập nhật tiến độ, phản hồi)
router.put(
  "/:id/phan-hoi",
  authenticate,
  validateAssignedTask.phanHoi,
  assignedTaskController.phanHoiCongViec
);

router.put(
  "/:id/tien-do",
  authenticate,
  validateAssignedTask.capNhatTienDo,
  assignedTaskController.capNhatTienDo
);

router.put(
  "/:id/hoan-thanh",
  authenticate,
  validateAssignedTask.baoCaoHoanThanh,
  assignedTaskController.baoCaoHoanThanh
);

// Routes cho manager (tạo, giao, đánh giá)
router.post(
  "/",
  authenticate,
  authorize(["manager", "admin"]),
  validateAssignedTask.taoMoi,
  assignedTaskController.taoMoiCongViec
);

router.put(
  "/:id/giao-viec",
  authenticate,
  authorize(["manager", "admin"]),
  assignedTaskController.giaoViec
);

router.put(
  "/:id/danh-gia",
  authenticate,
  authorize(["manager", "admin"]),
  validateAssignedTask.danhGia,
  assignedTaskController.danhGiaVaDuyet
);

router.delete(
  "/:id",
  authenticate,
  authorize(["manager", "admin"]),
  assignedTaskController.huyBoCongViec
);

module.exports = router;
```

### 4. Validation Middleware

#### 4.1 Validation cho Assigned Tasks

**File mới**: `modules/workmanagement/middlewares/assignedTask.validation.js`

```javascript
const { body, param } = require("express-validator");
const { handleValidationErrors } = require("../utils/validationHandler");

exports.validateAssignedTask = {
  taoMoi: [
    body("TieuDe")
      .notEmpty()
      .withMessage("Tiêu đề không được để trống")
      .isLength({ max: 255 })
      .withMessage("Tiêu đề không được quá 255 ký tự"),

    body("NhiemVuThuongQuyID")
      .isMongoId()
      .withMessage("ID Nhiệm vụ Thường quy không hợp lệ"),

    body("ThoiGianBatDau")
      .isISO8601()
      .withMessage("Thời gian bắt đầu không hợp lệ")
      .custom((value, { req }) => {
        if (new Date(value) <= new Date()) {
          throw new Error("Thời gian bắt đầu phải trong tương lai");
        }
        return true;
      }),

    body("ThoiGianKetThuc")
      .isISO8601()
      .withMessage("Thời gian kết thúc không hợp lệ")
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.ThoiGianBatDau)) {
          throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        return true;
      }),

    body("DanhSachNguoiThucHien")
      .isArray({ min: 1 })
      .withMessage("Phải có ít nhất một người thực hiện"),

    body("DanhSachNguoiThucHien.*.NhanVienID")
      .isMongoId()
      .withMessage("ID nhân viên không hợp lệ"),

    handleValidationErrors,
  ],

  phanHoi: [
    param("id").isMongoId().withMessage("ID công việc không hợp lệ"),
    body("trangThaiChapNhan")
      .isIn(["CHAP_NHAN", "TU_CHOI"])
      .withMessage("Trạng thái phản hồi không hợp lệ"),
    body("lyDoTuChoi")
      .if(body("trangThaiChapNhan").equals("TU_CHOI"))
      .notEmpty()
      .withMessage("Phải có lý do khi từ chối"),
    handleValidationErrors,
  ],

  capNhatTienDo: [
    param("id").isMongoId().withMessage("ID công việc không hợp lệ"),
    body("tienDo")
      .isFloat({ min: 0, max: 100 })
      .withMessage("Tiến độ phải từ 0 đến 100"),
    handleValidationErrors,
  ],

  baoCaoHoanThanh: [
    param("id").isMongoId().withMessage("ID công việc không hợp lệ"),
    body("ketQuaThucHien").notEmpty().withMessage("Phải có kết quả thực hiện"),
    handleValidationErrors,
  ],

  danhGia: [
    param("id").isMongoId().withMessage("ID công việc không hợp lệ"),
    body("diemSo")
      .isFloat({ min: 1, max: 10 })
      .withMessage("Điểm số phải từ 1 đến 10"),
    body("trangThaiDuyet")
      .isIn(["HOAN_THANH", "DANG_THUC_HIEN"])
      .withMessage("Trạng thái duyệt không hợp lệ"),
    handleValidationErrors,
  ],
};
```

### 5. Service Layer cho Business Logic phức tạp

#### 5.1 Assigned Task Service

**File mới**: `modules/workmanagement/services/assignedTask.service.js`

```javascript
const AssignedTask = require("../models/AssignedTask");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const User = require("../../../models/User");
const NotificationService = require("./notification.service");

class AssignedTaskService {
  // Kiểm tra quyền thao tác với công việc
  async kiemTraQuyenThaoTac(userId, congViecId, loaiThaoTac) {
    const congViec = await AssignedTask.findById(congViecId);
    const user = await User.findById(userId);

    if (!congViec || !user) return false;

    switch (loaiThaoTac) {
      case "GIAO_VIEC":
      case "DANH_GIA":
      case "HUY_BO":
        return congViec.NguoiGiaoViecID.toString() === userId;

      case "PHAN_HOI":
      case "CAP_NHAT_TIEN_DO":
      case "BAO_CAO_HOAN_THANH":
        return congViec.DanhSachNguoiThucHien.some(
          (nt) => nt.NhanVienID.toString() === user.NhanVienID?.toString()
        );

      default:
        return false;
    }
  }

  // Tự động cập nhật trạng thái quá hạn
  async capNhatTrangThaiQuaHan() {
    const congViecQuaHan = await AssignedTask.find({
      TrangThai: { $in: ["DA_GIAO", "CHAP_NHAN", "DANG_THUC_HIEN"] },
      ThoiGianKetThuc: { $lt: new Date() },
      isDeleted: false,
    });

    const updatePromises = congViecQuaHan.map((cv) => {
      cv.TrangThai = "QUA_HAN";
      cv.LichSuCapNhat.push({
        NoiDung: "Tự động cập nhật trạng thái quá hạn",
        TrangThaiCu: cv.TrangThai,
        TrangThaiMoi: "QUA_HAN",
      });
      return cv.save();
    });

    await Promise.all(updatePromises);
    return congViecQuaHan.length;
  }

  // Gửi thông báo khi có cập nhật
  async guiThongBao(congViecId, loaiThongBao, nguoiGui) {
    const congViec = await AssignedTask.findById(congViecId)
      .populate("NguoiGiaoViecID")
      .populate("DanhSachNguoiThucHien.NhanVienID");

    const recipients = [];

    switch (loaiThongBao) {
      case "GIAO_VIEC_MOI":
        recipients.push(
          ...congViec.DanhSachNguoiThucHien.map((nt) => nt.NhanVienID)
        );
        break;

      case "PHAN_HOI_CONG_VIEC":
      case "CAP_NHAT_TIEN_DO":
      case "BAO_CAO_HOAN_THANH":
        recipients.push(congViec.NguoiGiaoViecID);
        break;

      case "DANH_GIA_HOAN_THANH":
        recipients.push(
          ...congViec.DanhSachNguoiThucHien.map((nt) => nt.NhanVienID)
        );
        break;
    }

    // Gửi thông báo qua NotificationService
    await NotificationService.sendMultiple({
      recipients,
      type: loaiThongBao,
      title: `Cập nhật công việc: ${congViec.TieuDe}`,
      content: this.taoNoiDungThongBao(congViec, loaiThongBao),
      relatedId: congViecId,
      relatedType: "AssignedTask",
    });
  }

  taoNoiDungThongBao(congViec, loaiThongBao) {
    switch (loaiThongBao) {
      case "GIAO_VIEC_MOI":
        return `Bạn được giao công việc mới: ${congViec.TieuDe}`;
      case "PHAN_HOI_CONG_VIEC":
        return `Nhân viên đã phản hồi công việc: ${congViec.TieuDe}`;
      case "CAP_NHAT_TIEN_DO":
        return `Tiến độ công việc được cập nhật: ${congViec.TieuDe} (${congViec.TienDoHienTai}%)`;
      case "BAO_CAO_HOAN_THANH":
        return `Công việc đã được báo cáo hoàn thành: ${congViec.TieuDe}`;
      case "DANH_GIA_HOAN_THANH":
        return `Công việc đã được đánh giá và duyệt: ${congViec.TieuDe}`;
      default:
        return `Có cập nhật mới cho công việc: ${congViec.TieuDe}`;
    }
  }

  // Lấy thống kê hiệu suất
  async thongKeHieuSuat(filters) {
    const pipeline = [
      { $match: { ...filters, isDeleted: false } },
      {
        $group: {
          _id: "$DanhSachNguoiThucHien.NhanVienID",
          tongCongViec: { $sum: 1 },
          hoanThanh: { $sum: { $cond: ["$TrangThai" === "HOAN_THANH", 1, 0] } },
          diemTrungBinh: { $avg: "$DanhGiaCuaNguoiGiao.DiemSo" },
          thoiGianTrungBinh: {
            $avg: {
              $divide: [
                { $subtract: ["$ThoiGianHoanThanh", "$ThoiGianBatDau"] },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
        },
      },
    ];

    return await AssignedTask.aggregate(pipeline);
  }
}

module.exports = new AssignedTaskService();
```

## Kết quả mong đợi Phase 3

Sau khi hoàn thành Phase 3:

1. ✅ Hệ thống Backend APIs hoàn chỉnh cho Assigned Tasks
2. ✅ Luồng nghiệp vụ từ tạo → giao → thực hiện → hoàn thành
3. ✅ Tracking tiến độ và đánh giá hiệu suất
4. ✅ Hệ thống thông báo tự động
5. ✅ Reports và thống kê chi tiết
6. ✅ Chuẩn bị cho Phase 4: APIs Tickets/Support Requests

## Files cần tạo trong Phase 3

1. `modules/workmanagement/controllers/assignedTask.controller.js`
2. `modules/workmanagement/routes/assignedTask.routes.js`
3. `modules/workmanagement/services/assignedTask.service.js`
4. `modules/workmanagement/middlewares/assignedTask.validation.js`
5. `modules/workmanagement/tests/assignedTask.test.js`
6. `modules/workmanagement/docs/assignedTask.api.md`
7. Cập nhật `routes/index.js`

## Lưu ý quan trọng

- **Luôn đảm bảo** mọi Assigned Task đều được gán vào một Nhiệm vụ Thường quy
- Implement **real-time notifications** cho user experience tốt hơn
- **Optimize queries** cho performance với large datasets
- **Security**: Validate quyền truy cập ở mọi endpoints
- **Logging**: Track tất cả thao tác quan trọng để audit
