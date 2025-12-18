const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
const ChuKyDanhGia = require("../models/ChuKyDanhGia");
const DanhGiaKPI = require("../models/DanhGiaKPI");

const assignmentController = {};

/**
 * @desc    Lấy danh sách nhiệm vụ của nhân viên theo chu kỳ
 * @route   GET /api/workmanagement/giao-nhiem-vu
 * @access  Private
 */
assignmentController.layDanhSachNhiemVu = catchAsync(async (req, res, next) => {
  const { nhanVienId, chuKyId } = req.query;

  // Validation
  if (!nhanVienId || !chuKyId) {
    throw new AppError(400, "Thiếu nhanVienId hoặc chuKyId", "Bad Request");
  }

  // Query assignments
  const assignments = await NhanVienNhiemVu.find({
    NhanVienID: nhanVienId,
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
  })
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: 1 });

  return sendResponse(
    res,
    200,
    true,
    assignments, // ✅ Return array directly for consistent response.data.data format
    null,
    `Tìm thấy ${assignments.length} nhiệm vụ`
  );
});

/**
 * @desc    Nhân viên tự chấm điểm nhiều nhiệm vụ cùng lúc (Batch update)
 * @route   POST /api/workmanagement/giao-nhiem-vu/tu-cham-diem-batch
 * @access  Private (Nhân viên)
 * @body    { assignments: [{ assignmentId, DiemTuDanhGia }] }
 */
assignmentController.nhanVienTuChamDiemBatch = catchAsync(
  async (req, res, next) => {
    const { assignments } = req.body;
    const currentNhanVienId = req.user?.NhanVienID;

    // ✅ Validation
    if (!currentNhanVienId) {
      throw new AppError(400, "User chưa được gán NhanVienID", "Bad Request");
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new AppError(400, "Danh sách nhiệm vụ không hợp lệ", "Bad Request");
    }

    // Validate từng assignment
    for (const item of assignments) {
      if (
        !item.assignmentId ||
        item.DiemTuDanhGia == null ||
        item.DiemTuDanhGia < 0 ||
        item.DiemTuDanhGia > 100
      ) {
        throw new AppError(
          400,
          "Điểm tự đánh giá phải từ 0-100",
          "Bad Request"
        );
      }
    }

    const results = {
      success: [],
      failed: [],
    };

    // ✅ Process each assignment
    for (const { assignmentId, DiemTuDanhGia } of assignments) {
      try {
        // Find assignment
        const assignment = await NhanVienNhiemVu.findOne({
          _id: assignmentId,
          isDeleted: { $ne: true },
        });

        if (!assignment) {
          results.failed.push({
            assignmentId,
            reason: "Không tìm thấy nhiệm vụ",
          });
          continue;
        }

        // ✅ Security: Chỉ cho phép tự chấm điểm cho chính mình
        if (assignment.NhanVienID.toString() !== currentNhanVienId.toString()) {
          results.failed.push({
            assignmentId,
            reason: "Bạn chỉ có thể tự chấm điểm cho nhiệm vụ của mình",
          });
          continue;
        }

        // ✅ Kiểm tra chu kỳ có đang mở không
        const chuKy = await ChuKyDanhGia.findById(assignment.ChuKyDanhGiaID);

        if (!chuKy) {
          results.failed.push({
            assignmentId,
            reason: "Không tìm thấy chu kỳ đánh giá",
          });
          continue;
        }

        if (chuKy.isDong) {
          results.failed.push({
            assignmentId,
            reason: "Chu kỳ đánh giá đã đóng, không thể tự chấm điểm",
          });
          continue;
        }

        // ✅ Kiểm tra KPI đã duyệt chưa
        const danhGiaKPI = await DanhGiaKPI.findOne({
          ChuKyDanhGiaID: assignment.ChuKyDanhGiaID,
          NhanVienID: assignment.NhanVienID,
        });

        if (danhGiaKPI && danhGiaKPI.TrangThai === "DA_DUYET") {
          results.failed.push({
            assignmentId,
            reason: "KPI đã được duyệt, không thể thay đổi điểm tự đánh giá",
          });
          continue;
        }

        // ✅ Update điểm tự đánh giá
        assignment.DiemTuDanhGia = DiemTuDanhGia;
        await assignment.save();

        // Fire notification trigger for self-evaluation
        try {
          const triggerService = require("../../../services/triggerService");
          const NhanVien = require("../../../models/NhanVien");
          const employee = await NhanVien.findById(currentNhanVienId)
            .select("Ten")
            .lean();
          const nhiemVu = await NhiemVuThuongQuy.findById(
            assignment.NhiemVuThuongQuyID
          )
            .select("TenNhiemVu")
            .lean();

          // Get manager from QuanLyNhanVien
          const QuanLyNhanVien = require("../models/QuanLyNhanVien");
          const quanLy = await QuanLyNhanVien.findOne({
            NhanVienDuocQuanLy: currentNhanVienId,
            LoaiQuanLy: "KPI",
            isDeleted: false,
          }).lean();

          await triggerService.fire("KPI.tuDanhGia", {
            assignment: assignment.toObject(),
            performerId: currentNhanVienId,
            managerId: quanLy?.NhanVienQuanLy,
            employeeName: employee?.Ten || "Nhân viên",
            taskName: nhiemVu?.TenNhiemVu || "Nhiệm vụ",
            selfScore: DiemTuDanhGia,
          });
          console.log("[AssignmentController] ✅ Fired trigger: KPI.tuDanhGia");
        } catch (error) {
          console.error(
            "[AssignmentController] ❌ KPI self-evaluation notification trigger failed:",
            error.message
          );
        }

        // Reload với populate
        const updatedAssignment = await NhanVienNhiemVu.findById(assignmentId)
          .populate("NhiemVuThuongQuyID")
          .populate("NguoiGanID", "HoTen MaNhanVien");

        results.success.push(updatedAssignment);
      } catch (error) {
        results.failed.push({
          assignmentId,
          reason: error.message || "Lỗi không xác định",
        });
      }
    }

    // ✅ Build response message
    let message = "";
    if (results.failed.length === 0) {
      message = `Đã lưu thành công ${results.success.length} nhiệm vụ`;
    } else if (results.success.length === 0) {
      message = `Lưu thất bại ${results.failed.length} nhiệm vụ`;
    } else {
      message = `Lưu thành công ${results.success.length}, thất bại ${results.failed.length} nhiệm vụ`;
    }

    return sendResponse(
      res,
      200,
      true,
      {
        success: results.success,
        failed: results.failed,
        successCount: results.success.length,
        failCount: results.failed.length,
      },
      null,
      message
    );
  }
);

module.exports = assignmentController;
