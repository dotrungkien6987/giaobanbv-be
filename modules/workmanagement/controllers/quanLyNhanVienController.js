const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");
const NhanVien = require("../../../models/NhanVien");

const quanLyNhanVienController = {};

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
