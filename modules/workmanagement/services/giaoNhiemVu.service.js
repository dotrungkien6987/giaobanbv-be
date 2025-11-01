const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
const DanhGiaKPI = require("../models/DanhGiaKPI");
const DanhGiaNhiemVuThuongQuy = require("../models/DanhGiaNhiemVuThuongQuy");
const ChuKyDanhGia = require("../models/ChuKyDanhGia");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

async function getCurrentUser(req) {
  if (!req.userId) throw new AppError(401, "Login required");
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, "User not found");
  return user;
}

function isAdminUser(user) {
  return user?.PhanQuyen === "admin";
}

async function ensureManagerPermission(
  user,
  managerNhanVienId,
  targetNhanVienId
) {
  if (isAdminUser(user)) return true; // Admin bypass
  const userNhanVienId = user.NhanVienID?.toString();
  if (!userNhanVienId)
    throw new AppError(403, "Tài khoản không gắn NhanVienID");

  if (managerNhanVienId && userNhanVienId !== managerNhanVienId.toString()) {
    throw new AppError(403, "Bạn không có quyền xem danh sách này");
  }

  if (targetNhanVienId) {
    const relation = await QuanLyNhanVien.findOne({
      NhanVienQuanLy: toObjectId(userNhanVienId),
      NhanVienDuocQuanLy: toObjectId(targetNhanVienId),
      isDeleted: false,
    });
    if (!relation)
      throw new AppError(403, "Bạn không có quyền thao tác với nhân viên này");
  }
  return true;
}

const service = {};

// ============================================================================
// 🚀 Cycle-based assignment management
// ============================================================================

/**
 * Get assignments by employee and cycle
 * Returns both assigned tasks and available tasks for the cycle
 */
service.getAssignmentsByCycle = async (req, employeeId, chuKyId = null) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);

  // Get employee's department
  const emp = await NhanVien.findById(employeeId).populate({
    path: "KhoaID",
    select: "_id TenKhoa",
  });
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");

  // Build assignment filter
  const assignmentFilter = {
    NhanVienID: toObjectId(employeeId),
    isDeleted: false,
    TrangThaiHoatDong: true,
  };

  // If chuKyId provided, filter by cycle; otherwise get permanent assignments (null)
  if (chuKyId) {
    assignmentFilter.ChuKyDanhGiaID = toObjectId(chuKyId);
  } else {
    assignmentFilter.ChuKyDanhGiaID = null;
  }

  // Get assigned tasks for this cycle
  const assignedTasks = await NhanVienNhiemVu.find(assignmentFilter)
    .populate({
      path: "NhiemVuThuongQuyID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    })
    .populate({
      path: "ChuKyDanhGiaID",
      select: "_id TenChuKy TuNgay DenNgay",
    })
    .sort({ createdAt: -1 });

  // Get all active duties from the same department
  const allDuties = await NhiemVuThuongQuy.find({
    KhoaID: emp.KhoaID,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate({ path: "KhoaID", select: "_id TenKhoa" })
    .sort({ TenNhiemVu: 1 });

  // Extract assigned duty IDs
  const assignedDutyIds = assignedTasks.map((a) =>
    a.NhiemVuThuongQuyID._id.toString()
  );

  // Filter available duties (not yet assigned in this cycle)
  const availableDuties = allDuties.filter(
    (d) => !assignedDutyIds.includes(d._id.toString())
  );

  return {
    assignedTasks,
    availableDuties,
    employee: {
      _id: emp._id,
      Ten: emp.Ten,
      MaNhanVien: emp.MaNhanVien,
      KhoaID: emp.KhoaID,
    },
  };
};

/**
 * Batch update assignments for a cycle
 * - Add new assignments with difficulty
 * - Update existing assignments' difficulty
 * - Remove assignments not in the list
 */
service.batchUpdateCycleAssignments = async (
  req,
  employeeId,
  chuKyId,
  tasks
) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);

  // Validate employee and department
  const emp = await NhanVien.findById(employeeId);
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");

  // ✅ STRICT MODE VALIDATION 1: Check chu kỳ đã đóng chưa
  if (chuKyId) {
    const chuKy = await ChuKyDanhGia.findById(chuKyId);
    if (!chuKy) {
      throw new AppError(404, "Không tìm thấy chu kỳ đánh giá", "NOT_FOUND");
    }
    if (chuKy.isDong) {
      throw new AppError(
        403,
        "Chu kỳ đánh giá đã đóng. Không thể thay đổi phân công nhiệm vụ.",
        "CYCLE_CLOSED"
      );
    }
  }

  // ✅ STRICT MODE VALIDATION 2: Check KPI đã duyệt chưa
  const danhGiaKPI = await DanhGiaKPI.findOne({
    NhanVienID: toObjectId(employeeId),
    ChuKyDanhGiaID: chuKyId ? toObjectId(chuKyId) : null,
  });

  if (danhGiaKPI && danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(
      403,
      "KPI đã được duyệt. Không thể thêm/sửa/xóa nhiệm vụ.\nVui lòng hủy duyệt KPI trên trang 'Đánh giá KPI' trước khi thay đổi phân công.",
      "KPI_APPROVED"
    );
  }

  // Validate tasks array
  if (!Array.isArray(tasks)) {
    throw new AppError(400, "tasks phải là mảng");
  }

  // Validate no duplicate duties in the same cycle
  const dutyIds = tasks.map((t) => t.NhiemVuThuongQuyID);
  const uniqueDutyIds = new Set(dutyIds);
  if (dutyIds.length !== uniqueDutyIds.size) {
    throw new AppError(400, "Không được gán trùng nhiệm vụ trong cùng chu kỳ");
  }

  // Validate all duties exist and belong to same department
  for (const task of tasks) {
    const duty = await NhiemVuThuongQuy.findById(task.NhiemVuThuongQuyID);
    if (!duty) {
      throw new AppError(
        404,
        `Nhiệm vụ ${task.NhiemVuThuongQuyID} không tồn tại`
      );
    }
    if (duty.KhoaID.toString() !== emp.KhoaID.toString()) {
      throw new AppError(
        400,
        `Nhiệm vụ ${duty.TenNhiemVu} không thuộc khoa ${emp.KhoaID.TenKhoa}`
      );
    }

    // Validate MucDoKho
    if (task.MucDoKho !== null && task.MucDoKho !== undefined) {
      if (
        typeof task.MucDoKho !== "number" ||
        task.MucDoKho < 1.0 ||
        task.MucDoKho > 10.0
      ) {
        throw new AppError(400, "MucDoKho phải là số từ 1.0 đến 10.0");
      }
      if (Math.round(task.MucDoKho * 10) !== task.MucDoKho * 10) {
        throw new AppError(
          400,
          "MucDoKho chỉ cho phép tối đa 1 chữ số thập phân"
        );
      }
    }
  }

  // Get current assignments for this cycle
  const currentAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(employeeId),
    ChuKyDanhGiaID: chuKyId ? toObjectId(chuKyId) : null,
    isDeleted: false,
  });

  const currentDutyIds = currentAssignments.map((a) =>
    a.NhiemVuThuongQuyID.toString()
  );
  const newDutyIds = tasks.map((t) => t.NhiemVuThuongQuyID);

  // Determine which to add, update, remove
  const toAdd = tasks.filter(
    (t) => !currentDutyIds.includes(t.NhiemVuThuongQuyID)
  );
  const toUpdate = tasks.filter((t) =>
    currentDutyIds.includes(t.NhiemVuThuongQuyID)
  );
  const toRemove = currentAssignments.filter(
    (a) => !newDutyIds.includes(a.NhiemVuThuongQuyID.toString())
  );

  // ✅ STRICT MODE VALIDATION 3: Check điểm cho nhiệm vụ bị XÓA
  const deleteViolations = [];

  for (const assignment of toRemove) {
    const nhiemVu = await NhiemVuThuongQuy.findById(
      assignment.NhiemVuThuongQuyID
    );
    const tenNhiemVu = nhiemVu?.TenNhiemVu || "Không rõ";

    // Check điểm tự đánh giá
    if (assignment.DiemTuDanhGia && assignment.DiemTuDanhGia > 0) {
      deleteViolations.push({
        tenNhiemVu,
        loai: "DiemTuDanhGia",
        diem: assignment.DiemTuDanhGia,
      });
    }

    // Check điểm quản lý chấm
    const managerScore = await DanhGiaNhiemVuThuongQuy.findOne({
      NhanVienID: toObjectId(employeeId),
      NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
      ChuKyDanhGiaID: chuKyId ? toObjectId(chuKyId) : null,
    });

    if (managerScore) {
      deleteViolations.push({
        tenNhiemVu,
        loai: "DiemQuanLy",
        diem: null,
      });
    }
  }

  if (deleteViolations.length > 0) {
    const selfAssessmentItems = deleteViolations.filter(
      (v) => v.loai === "DiemTuDanhGia"
    );
    const managerScoreItems = deleteViolations.filter(
      (v) => v.loai === "DiemQuanLy"
    );

    let errorMessage = "Không thể xóa các nhiệm vụ sau:\n\n";

    if (selfAssessmentItems.length > 0) {
      errorMessage += "📝 Đã có điểm tự đánh giá:\n";
      errorMessage += selfAssessmentItems
        .map((v) => `  • ${v.tenNhiemVu} (${v.diem} điểm)`)
        .join("\n");
      errorMessage +=
        "\n  → Vui lòng nhân viên đưa điểm về 0 trên trang 'Tự đánh giá KPI'\n\n";
    }

    if (managerScoreItems.length > 0) {
      errorMessage += "✅ Đã có điểm chấm từ quản lý:\n";
      errorMessage += managerScoreItems
        .map((v) => `  • ${v.tenNhiemVu}`)
        .join("\n");
      errorMessage +=
        "\n  → Vui lòng xóa điểm trên trang 'Quản lý chấm điểm' trước";
    }

    throw new AppError(400, errorMessage, "HAS_EVALUATION_SCORE");
  }

  // ✅ STRICT MODE VALIDATION 4: Check điểm quản lý cho nhiệm vụ bị SỬA MucDoKho
  const updateViolations = [];

  for (const task of toUpdate) {
    const existing = currentAssignments.find(
      (a) => a.NhiemVuThuongQuyID.toString() === task.NhiemVuThuongQuyID
    );

    // Chỉ check nếu MucDoKho thay đổi
    if (existing && existing.MucDoKho !== task.MucDoKho) {
      // Chỉ check điểm quản lý (IGNORE DiemTuDanhGia)
      const managerScore = await DanhGiaNhiemVuThuongQuy.findOne({
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: task.NhiemVuThuongQuyID,
        ChuKyDanhGiaID: chuKyId ? toObjectId(chuKyId) : null,
      });

      if (managerScore) {
        const nhiemVu = await NhiemVuThuongQuy.findById(
          task.NhiemVuThuongQuyID
        );
        updateViolations.push({
          tenNhiemVu: nhiemVu?.TenNhiemVu || "Không rõ",
          mucDoKhoCu: existing.MucDoKho,
          mucDoKhoMoi: task.MucDoKho,
        });
      }
    }
  }

  if (updateViolations.length > 0) {
    let errorMessage =
      "Không thể thay đổi mức độ khó cho các nhiệm vụ sau (đã có điểm chấm từ quản lý):\n\n";
    errorMessage += updateViolations
      .map((v) => `  • ${v.tenNhiemVu}: ${v.mucDoKhoCu} → ${v.mucDoKhoMoi}`)
      .join("\n");
    errorMessage +=
      "\n\n→ Vui lòng xóa điểm trên trang 'Quản lý chấm điểm' trước khi thay đổi mức độ khó.";

    throw new AppError(400, errorMessage, "HAS_MANAGER_SCORE");
  }

  // Execute operations
  const operations = [];

  // Add new assignments
  for (const task of toAdd) {
    const assignmentData = {
      NhanVienID: toObjectId(employeeId),
      NhiemVuThuongQuyID: toObjectId(task.NhiemVuThuongQuyID),
      ChuKyDanhGiaID: chuKyId ? toObjectId(chuKyId) : null,
      MucDoKho: task.MucDoKho,
      TrangThaiHoatDong: true,
      isDeleted: false,
      NgayGan: new Date(),
      NguoiGanID: user.NhanVienID || null,
    };
    operations.push(NhanVienNhiemVu.create(assignmentData));
  }

  // Update existing assignments
  for (const task of toUpdate) {
    const existing = currentAssignments.find(
      (a) => a.NhiemVuThuongQuyID.toString() === task.NhiemVuThuongQuyID
    );
    if (existing) {
      existing.MucDoKho = task.MucDoKho;
      operations.push(existing.save());
    }
  }

  // Hard delete removed assignments
  for (const assignment of toRemove) {
    operations.push(NhanVienNhiemVu.findByIdAndDelete(assignment._id));
  }

  await Promise.all(operations);

  // Return updated list
  return await service.getAssignmentsByCycle(req, employeeId, chuKyId);
};

/**
 * Copy assignments from previous cycle to new cycle
 * Copies both duties and their difficulty levels
 */
service.copyFromPreviousCycle = async (
  req,
  employeeId,
  fromChuKyId,
  toChuKyId
) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);

  // Validate employee
  const emp = await NhanVien.findById(employeeId);
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");

  // Get assignments from previous cycle
  const previousAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(employeeId),
    ChuKyDanhGiaID: toObjectId(fromChuKyId),
    isDeleted: false,
    TrangThaiHoatDong: true,
  });

  if (previousAssignments.length === 0) {
    throw new AppError(404, "Không tìm thấy nhiệm vụ nào từ chu kỳ trước");
  }

  // Check if target cycle already has assignments
  const existingInTarget = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(employeeId),
    ChuKyDanhGiaID: toObjectId(toChuKyId),
    isDeleted: false,
  });

  if (existingInTarget.length > 0) {
    throw new AppError(
      409,
      "Chu kỳ đích đã có nhiệm vụ được gán. Vui lòng xóa trước khi copy."
    );
  }

  // Copy assignments
  const newAssignments = previousAssignments.map((a) => ({
    NhanVienID: a.NhanVienID,
    NhiemVuThuongQuyID: a.NhiemVuThuongQuyID,
    ChuKyDanhGiaID: toObjectId(toChuKyId),
    MucDoKho: a.MucDoKho, // Copy difficulty level
    TrangThaiHoatDong: true,
    isDeleted: false,
    NgayGan: new Date(),
    NguoiGanID: user.NhanVienID || null,
  }));

  await NhanVienNhiemVu.insertMany(newAssignments);

  return {
    copiedCount: newAssignments.length,
    fromCycle: fromChuKyId,
    toCycle: toChuKyId,
  };
};

/**
 * 🆕 GET MANAGED EMPLOYEES WITH CYCLE ASSIGNMENT STATS
 * Purpose: For CycleAssignmentListPage - shows all managed employees with assignment progress
 * Returns: Array of { employee, assignedCount, totalDuties }
 */
service.getEmployeesWithCycleStats = async (req, chuKyId) => {
  const user = await getCurrentUser(req);
  const userNhanVienId = user.NhanVienID?.toString();

  if (!userNhanVienId) {
    throw new AppError(403, "Tài khoản không gắn NhanVienID");
  }

  // Get all employees managed by current user (for KPI or both types)
  const managedRelations = await QuanLyNhanVien.find({
    NhanVienQuanLy: toObjectId(userNhanVienId),
    isDeleted: false,
    LoaiQuanLy: { $in: ["KPI", "Giao_Viec"] }, // Manager can assign tasks if they manage KPI
  })
    .populate({
      path: "NhanVienDuocQuanLy",
      select: "_id Ten MaNhanVien KhoaID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    })
    .sort({ createdAt: -1 });

  // Build result array with stats for each employee
  const employeesWithStats = await Promise.all(
    managedRelations.map(async (relation) => {
      const employee = relation.NhanVienDuocQuanLy;

      if (!employee) return null; // Skip if employee not found

      // Count assigned tasks for this cycle
      const assignmentFilter = {
        NhanVienID: employee._id,
        isDeleted: false,
        TrangThaiHoatDong: true,
      };

      if (chuKyId) {
        assignmentFilter.ChuKyDanhGiaID = toObjectId(chuKyId);
      } else {
        assignmentFilter.ChuKyDanhGiaID = null; // Permanent assignments
      }

      const assignedCount = await NhanVienNhiemVu.countDocuments(
        assignmentFilter
      );

      // 🆕 Calculate total difficulty (sum of MucDoKho)
      const assignedTasks = await NhanVienNhiemVu.find(assignmentFilter).select(
        "MucDoKho"
      );
      const totalMucDoKho = assignedTasks.reduce(
        (sum, task) => sum + (task.MucDoKho || 0),
        0
      );

      // Count total available duties for employee's department
      const totalDuties = await NhiemVuThuongQuy.countDocuments({
        KhoaID: employee.KhoaID,
        TrangThaiHoatDong: true,
        isDeleted: false,
      });

      return {
        employee: {
          _id: employee._id,
          Ten: employee.Ten,
          MaNhanVien: employee.MaNhanVien,
          KhoaID: employee.KhoaID,
        },
        assignedCount,
        totalDuties,
        totalMucDoKho, // 🆕 Added total difficulty
        LoaiQuanLy: relation.LoaiQuanLy,
      };
    })
  );

  // Filter out null entries (employees not found)
  return employeesWithStats.filter((item) => item !== null);
};

module.exports = service;
