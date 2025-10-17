const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");
const NhanVien = require("../../../models/NhanVien");

const quanLyNhanVienController = {};

/**
 * GET /api/workmanagement/quan-ly-nhan-vien/nhan-vien-duoc-quan-ly
 * Lấy danh sách nhân viên mà current user được phép quản lý (cho KPI/Giao việc)
 * Middleware validateQuanLy đã gắn req.currentNhanVienID
 */
quanLyNhanVienController.getNhanVienDuocQuanLyByCurrentUser = catchAsync(
  async (req, res, next) => {
    const currentNhanVienID = req.currentNhanVienID; // Từ validateQuanLy middleware
    const { LoaiQuanLy = "KPI" } = req.query;

    if (!currentNhanVienID) {
      throw new AppError(400, "Thiếu thông tin nhân viên");
    }

    // Query quan hệ quản lý và populate thông tin nhân viên được quản lý
    const quanHeQuanLy = await QuanLyNhanVien.find({
      NhanVienQuanLy: currentNhanVienID,
      LoaiQuanLy,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "NhanVienDuocQuanLy",
        select: "Ten MaNhanVien Email KhoaID ChucDanh ChucVu Images isDeleted",
        populate: [{ path: "KhoaID", select: "TenKhoa MaKhoa" }],
      })
      .sort({ createdAt: -1 });

    // Extract danh sách nhân viên và lọc những nhân viên đã bị xóa
    const nhanviens = quanHeQuanLy
      .map((qh) => qh.NhanVienDuocQuanLy)
      .filter((nv) => nv && nv.isDeleted !== true);

    return sendResponse(
      res,
      200,
      true,
      {
        nhanviens,
        total: nhanviens.length,
        loaiQuanLy: LoaiQuanLy,
      },
      null,
      "Lấy danh sách nhân viên được quản lý thành công"
    );
  }
);

/**
 * GET /api/workmanagement/quanlynhanvien/:nhanvienid/managed
 * Lấy danh sách nhân viên được quản lý theo NhanVienID cụ thể
 */
quanLyNhanVienController.getNhanVienDuocQuanLy = catchAsync(
  async (req, res, next) => {
    const { nhanvienid } = req.params;

    const quanHeQuanLy = await QuanLyNhanVien.find({
      NhanVienQuanLy: nhanvienid,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "NhanVienDuocQuanLy",
        select: "Ten MaNhanVien Email KhoaID ChucDanh ChucVu Images",
        populate: [{ path: "KhoaID", select: "TenKhoa MaKhoa" }],
      })
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      { relations: quanHeQuanLy },
      null,
      "Lấy danh sách nhân viên được quản lý thành công"
    );
  }
);

/**
 * GET /api/workmanagement/quanlynhanvien/:nhanvienid/info
 * Lấy thông tin quan hệ quản lý của nhân viên
 */
quanLyNhanVienController.getThongTinQuanLy = catchAsync(
  async (req, res, next) => {
    const { nhanvienid } = req.params;

    // Nhân viên này đang quản lý ai
    const duocQuanLy = await QuanLyNhanVien.find({
      NhanVienQuanLy: nhanvienid,
      isDeleted: { $ne: true },
    }).populate("NhanVienDuocQuanLy");

    // Nhân viên này được quản lý bởi ai
    const quanLyBoi = await QuanLyNhanVien.find({
      NhanVienDuocQuanLy: nhanvienid,
      isDeleted: { $ne: true },
    }).populate("NhanVienQuanLy");

    return sendResponse(
      res,
      200,
      true,
      { duocQuanLy, quanLyBoi },
      null,
      "Lấy thông tin quản lý thành công"
    );
  }
);

/**
 * POST /api/workmanagement/quanlynhanvien/:nhanvienid/add-relation
 * Thêm quan hệ quản lý mới
 */
quanLyNhanVienController.themQuanHe = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;
  const { NhanVienDuocQuanLy, LoaiQuanLy } = req.body;

  if (!NhanVienDuocQuanLy || !LoaiQuanLy) {
    throw new AppError(400, "Thiếu thông tin nhân viên hoặc loại quản lý");
  }

  // Kiểm tra duplicate
  const existing = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nhanvienid,
    NhanVienDuocQuanLy,
    LoaiQuanLy,
    isDeleted: { $ne: true },
  });

  if (existing) {
    throw new AppError(400, "Quan hệ quản lý đã tồn tại");
  }

  const newRelation = await QuanLyNhanVien.create({
    NhanVienQuanLy: nhanvienid,
    NhanVienDuocQuanLy,
    LoaiQuanLy,
  });

  const populated = await QuanLyNhanVien.findById(newRelation._id)
    .populate("NhanVienQuanLy")
    .populate("NhanVienDuocQuanLy");

  return sendResponse(
    res,
    201,
    true,
    populated,
    null,
    "Thêm quan hệ quản lý thành công"
  );
});

/**
 * DELETE /api/workmanagement/quanlynhanvien/:nhanvienid/:managedid
 * Xóa quan hệ quản lý
 */
quanLyNhanVienController.xoaQuanHe = catchAsync(async (req, res, next) => {
  const { nhanvienid, managedid } = req.params;

  const relation = await QuanLyNhanVien.findOneAndUpdate(
    {
      NhanVienQuanLy: nhanvienid,
      NhanVienDuocQuanLy: managedid,
    },
    { isDeleted: true },
    { new: true }
  );

  if (!relation) {
    throw new AppError(404, "Không tìm thấy quan hệ quản lý");
  }

  return sendResponse(
    res,
    200,
    true,
    { deletedId: relation._id },
    null,
    "Xóa quan hệ quản lý thành công"
  );
});

// GET /api/quanlynhanvien/giaoviec/:nhanVienId
// Lấy danh sách nhân viên được giao việc bởi nhanVienId
quanLyNhanVienController.getGiaoViecByNhanVienQuanLy = catchAsync(
  async (req, res, next) => {
    const { nhanVienId } = req.params;

    const giaoViecs = await QuanLyNhanVien.find({
      NhanVienQuanLy: nhanVienId,
      LoaiQuanLy: "Giao_Viec",
    })
      .populate({
        path: "NhanVienDuocQuanLy",
        populate: { path: "KhoaID" },
      })
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      giaoViecs,
      null,
      "Get GiaoViec by NhanVienQuanLy successful"
    );
  }
);

// GET /api/quanlynhanvien/chamkpi/:nhanVienId
// Lấy danh sách nhân viên được chấm KPI bởi nhanVienId
quanLyNhanVienController.getChamKPIByNhanVienQuanLy = catchAsync(
  async (req, res, next) => {
    const { nhanVienId } = req.params;

    const chamKPIs = await QuanLyNhanVien.find({
      NhanVienQuanLy: nhanVienId,
      LoaiQuanLy: "KPI",
    })
      .populate({
        path: "NhanVienDuocQuanLy",
        populate: { path: "KhoaID" },
      })
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      chamKPIs,
      null,
      "Get ChamKPI by NhanVienQuanLy successful"
    );
  }
);

// POST /api/quanlynhanvien/batch
// Tạo nhiều quan hệ quản lý cùng lúc (cho multi-select add)
quanLyNhanVienController.createBatchQuanLyNhanVien = catchAsync(
  async (req, res, next) => {
    const { NhanVienQuanLy, NhanVienDuocQuanLys, LoaiQuanLy } = req.body;

    // Validation
    if (
      !NhanVienQuanLy ||
      !NhanVienDuocQuanLys ||
      !Array.isArray(NhanVienDuocQuanLys) ||
      !LoaiQuanLy
    ) {
      throw new AppError(400, "Missing required fields");
    }

    // Kiểm tra nhân viên quản lý tồn tại
    const nhanVienQuanLy = await NhanVien.findById(NhanVienQuanLy);
    if (!nhanVienQuanLy) {
      throw new AppError(400, "NhanVienQuanLy not found");
    }

    // Tạo bulk relations
    const newRelations = NhanVienDuocQuanLys.map((nhanVienId) => ({
      NhanVienQuanLy: NhanVienQuanLy,
      NhanVienDuocQuanLy: nhanVienId,
      LoaiQuanLy: LoaiQuanLy,
    }));

    const createdRelations = await QuanLyNhanVien.insertMany(newRelations);

    // Populate và trả về kết quả
    const populatedRelations = await QuanLyNhanVien.find({
      _id: { $in: createdRelations.map((rel) => rel._id) },
    }).populate({
      path: "NhanVienDuocQuanLy",
      populate: { path: "KhoaID" },
    });

    return sendResponse(
      res,
      200,
      true,
      populatedRelations,
      null,
      "Batch create QuanLyNhanVien successful"
    );
  }
);

// DELETE /api/quanlynhanvien/batch
// Xóa nhiều quan hệ quản lý cùng lúc (cho multi-select delete)
quanLyNhanVienController.deleteBatchQuanLyNhanVien = catchAsync(
  async (req, res, next) => {
    const { quanLyIds } = req.body;

    if (!quanLyIds || !Array.isArray(quanLyIds)) {
      throw new AppError(400, "quanLyIds array is required");
    }

    const result = await QuanLyNhanVien.updateMany(
      { _id: { $in: quanLyIds } },
      { isDeleted: true }
    );

    return sendResponse(
      res,
      200,
      true,
      { deletedCount: result.modifiedCount },
      null,
      "Batch delete QuanLyNhanVien successful"
    );
  }
);

// POST /api/quanlynhanvien/sync
// Sync toàn bộ danh sách quan hệ quản lý (tổng hợp add/delete)
quanLyNhanVienController.syncQuanLyNhanVienList = catchAsync(
  async (req, res, next) => {
    const {
      NhanVienQuanLy,
      SelectedNhanVienIds,
      selectedRowIds,
      selectedNhanVienIds,
      NhanVienDuocQuanLyIds, // Added this field from Redux slice
      nhanVienIds: directNhanVienIds,
      LoaiQuanLy,
    } = req.body;

    // Debug logging
    console.log("Sync request data:", {
      NhanVienQuanLy,
      SelectedNhanVienIds,
      selectedRowIds,
      selectedNhanVienIds,
      NhanVienDuocQuanLyIds,
      directNhanVienIds,
      LoaiQuanLy,
    });

    // Xử lý nhiều trường hợp field names khác nhau
    let nhanVienIds = [];

    // Thử các field names khác nhau
    const possibleArrays = [
      NhanVienDuocQuanLyIds, // From Redux slice
      SelectedNhanVienIds,
      selectedRowIds,
      selectedNhanVienIds,
      directNhanVienIds,
    ];

    for (let arr of possibleArrays) {
      if (Array.isArray(arr)) {
        if (arr.length > 0 && typeof arr[0] === "string") {
          // Mảng ID strings
          nhanVienIds = arr;
          break;
        } else if (arr.length > 0 && typeof arr[0] === "object") {
          // Mảng objects, extract ID
          nhanVienIds = arr
            .map((item) => item._id || item.id)
            .filter((id) => id);
          break;
        } else if (arr.length === 0) {
          // Mảng rỗng hợp lệ (xóa tất cả)
          nhanVienIds = [];
          break;
        }
      }
    }

    console.log("Processed nhanVienIds:", nhanVienIds);

    // Safeguard: Nếu chưa có mảng hợp lệ nào, set mảng rỗng
    if (!Array.isArray(nhanVienIds)) {
      console.log("No valid array found, setting empty array");
      nhanVienIds = [];
    }

    // Validation - cho phép nhanVienIds là mảng rỗng (trường hợp xóa tất cả)
    if (!NhanVienQuanLy || !LoaiQuanLy) {
      console.log("Validation failed:", {
        NhanVienQuanLy: !!NhanVienQuanLy,
        nhanVienIds: Array.isArray(nhanVienIds)
          ? `Array[${nhanVienIds.length}]`
          : nhanVienIds,
        LoaiQuanLy: !!LoaiQuanLy,
        allFields: Object.keys(req.body),
      });
      throw new AppError(
        400,
        "Missing required fields. NhanVienQuanLy and LoaiQuanLy are required."
      );
    }

    // Kiểm tra nhân viên quản lý tồn tại
    const nhanVienQuanLy = await NhanVien.findById(NhanVienQuanLy);
    if (!nhanVienQuanLy) {
      throw new AppError(400, "NhanVienQuanLy not found");
    }

    // 1. Lấy quan hệ hiện tại (không cần filter isDeleted vì sử dụng hard delete)
    const currentRelations = await QuanLyNhanVien.find({
      NhanVienQuanLy: NhanVienQuanLy,
      LoaiQuanLy: LoaiQuanLy,
    });

    const currentIds = currentRelations.map((rel) =>
      rel.NhanVienDuocQuanLy.toString()
    );

    // 2. Phân tích changes
    const toAdd = nhanVienIds.filter((id) => !currentIds.includes(id));
    const toDeleteIds = currentIds.filter((id) => !nhanVienIds.includes(id));

    // 3. Batch operations
    const operations = [];

    // THAY ĐỔI: Xóa cứng quan hệ không còn cần thiết (Hard Delete)
    if (toDeleteIds.length > 0) {
      console.log("🗑️ Relations to DELETE (Hard Delete):", toDeleteIds);

      operations.push(
        QuanLyNhanVien.deleteMany({
          NhanVienQuanLy: NhanVienQuanLy,
          NhanVienDuocQuanLy: { $in: toDeleteIds },
          LoaiQuanLy: LoaiQuanLy,
        })
      );
    }

    // Thêm quan hệ mới
    if (toAdd.length > 0) {
      console.log("➕ Relations to ADD:", toAdd);

      const newRelations = toAdd.map((nhanVienId) => ({
        NhanVienQuanLy: NhanVienQuanLy,
        NhanVienDuocQuanLy: nhanVienId,
        LoaiQuanLy: LoaiQuanLy,
      }));

      operations.push(QuanLyNhanVien.insertMany(newRelations));
    }

    // Thực hiện song song
    await Promise.all(operations);

    // 4. Trả về kết quả updated (không cần filter isDeleted)
    const updatedRelations = await QuanLyNhanVien.find({
      NhanVienQuanLy: NhanVienQuanLy,
      LoaiQuanLy: LoaiQuanLy,
    }).populate({
      path: "NhanVienDuocQuanLy",
      populate: { path: "KhoaID" },
    });

    return sendResponse(
      res,
      200,
      true,
      {
        relations: updatedRelations,
        summary: {
          added: toAdd.length,
          deleted: toDeleteIds.length,
          total: updatedRelations.length,
        },
      },
      null,
      "Sync QuanLyNhanVien successful"
    );
  }
);

// PUT /api/quanlynhanvien/:id/loai
// Chuyển đổi loại quản lý (Giao_Viec <-> KPI)
quanLyNhanVienController.updateLoaiQuanLy = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    const { LoaiQuanLy } = req.body;

    if (!LoaiQuanLy || !["Giao_Viec", "KPI"].includes(LoaiQuanLy)) {
      throw new AppError(
        400,
        "Invalid LoaiQuanLy. Must be 'Giao_Viec' or 'KPI'"
      );
    }

    const updatedRelation = await QuanLyNhanVien.findByIdAndUpdate(
      id,
      { LoaiQuanLy: LoaiQuanLy },
      { new: true }
    ).populate({
      path: "NhanVienDuocQuanLy",
      populate: { path: "KhoaID" },
    });

    if (!updatedRelation) {
      throw new AppError(404, "QuanLyNhanVien not found");
    }

    return sendResponse(
      res,
      200,
      true,
      updatedRelation,
      null,
      "Update LoaiQuanLy successful"
    );
  }
);

module.exports = quanLyNhanVienController;
