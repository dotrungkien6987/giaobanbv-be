const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");

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

service.getManagedEmployees = async (req, managerId, loaiQuanLy) => {
  const user = await getCurrentUser(req);
  await ensureManagerPermission(user, managerId, null);

  const filter = {
    NhanVienQuanLy: toObjectId(managerId),
    isDeleted: false,
  };
  if (loaiQuanLy && ["KPI", "Giao_Viec"].includes(loaiQuanLy))
    filter.LoaiQuanLy = loaiQuanLy;

  const list = await QuanLyNhanVien.find(filter)
    .populate({
      path: "ThongTinNhanVienDuocQuanLy",
      select: "_id Ten MaNhanVien KhoaID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    })
    .sort({ createdAt: -1 });
  return list;
};

service.getDutiesByEmployee = async (req, employeeId) => {
  await getCurrentUser(req); // cần đăng nhập
  const emp = await NhanVien.findById(employeeId).populate({
    path: "KhoaID",
    select: "_id TenKhoa",
  });
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");
  const duties = await NhiemVuThuongQuy.find({
    KhoaID: emp.KhoaID,
    TrangThaiHoatDong: true,
    isDeleted: false,
  }).populate({ path: "KhoaID", select: "_id TenKhoa" });
  return duties;
};

service.getAssignmentsByEmployee = async (req, employeeId) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);
  const list = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(employeeId),
    isDeleted: false,
    TrangThaiHoatDong: true,
  })
    .populate({
      path: "NhiemVuThuongQuyID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    })
    .populate({ path: "NguoiGanID", select: "_id Ten MaNhanVien" })
    .sort({ NgayGan: -1 });
  return list;
};

async function ensureSameKhoa(employeeId, dutyId) {
  const [emp, duty] = await Promise.all([
    NhanVien.findById(employeeId).select("_id KhoaID"),
    NhiemVuThuongQuy.findById(dutyId).select(
      "_id KhoaID TrangThaiHoatDong isDeleted"
    ),
  ]);
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");
  if (!duty || duty.isDeleted || !duty.TrangThaiHoatDong)
    throw new AppError(
      404,
      "Không tìm thấy nhiệm vụ hoặc nhiệm vụ không hoạt động"
    );
  if (
    !emp.KhoaID ||
    !duty.KhoaID ||
    emp.KhoaID.toString() !== duty.KhoaID.toString()
  )
    throw new AppError(400, "Nhiệm vụ và nhân viên phải cùng KhoaID");
}

service.assignOne = async (req, employeeId, dutyId, mucDoKho = null) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);
  await ensureSameKhoa(employeeId, dutyId);

  // ✅ SLICE 1: Validate MucDoKho if provided
  if (mucDoKho !== null && mucDoKho !== undefined) {
    if (typeof mucDoKho !== "number" || mucDoKho < 1.0 || mucDoKho > 10.0) {
      throw new AppError(400, "MucDoKho phải là số từ 1.0 đến 10.0");
    }
    // Validate max 1 decimal place
    if (Math.round(mucDoKho * 10) !== mucDoKho * 10) {
      throw new AppError(
        400,
        "MucDoKho chỉ cho phép tối đa 1 chữ số thập phân (VD: 5.5, 7.2)"
      );
    }
  }

  // Kiểm tra xem đã có assignment bị xóa (soft delete) hay chưa
  // Lưu ý: model có pre(/^find/) tự loại bỏ isDeleted=true nếu không chỉ định
  // Để hỗ trợ khôi phục (restore), cần bao gồm cả bản ghi đã xóa mềm
  const existingAssignment = await NhanVienNhiemVu.findOne({
    NhanVienID: toObjectId(employeeId),
    NhiemVuThuongQuyID: toObjectId(dutyId),
    isDeleted: { $in: [true, false] },
  });

  let result;

  // Optional cycle id from request body
  const chuKyId = req.body?.ChuKyDanhGiaID
    ? toObjectId(req.body.ChuKyDanhGiaID)
    : undefined;

  if (existingAssignment) {
    if (!existingAssignment.isDeleted && existingAssignment.TrangThaiHoatDong) {
      // Đã tồn tại và đang hoạt động -> báo lỗi trùng lặp
      throw new AppError(409, "Nhiệm vụ đã được gán cho nhân viên này");
    } else {
      // Đã tồn tại nhưng bị xóa/vô hiệu hóa -> khôi phục và cập nhật
      existingAssignment.isDeleted = false;
      existingAssignment.TrangThaiHoatDong = true;
      existingAssignment.NgayGan = new Date(); // Cập nhật thời gian gán mới
      existingAssignment.NguoiGanID = user.NhanVienID || null; // Cập nhật người gán

      // ✅ SLICE 1: Update MucDoKho if provided
      if (mucDoKho !== null && mucDoKho !== undefined) {
        existingAssignment.MucDoKho = mucDoKho;
      }

      // 🆕 If cycle provided, attach to assignment
      if (chuKyId) {
        existingAssignment.ChuKyDanhGiaID = chuKyId;
      }

      await existingAssignment.save();
      result = existingAssignment;
    }
  } else {
    // Chưa có assignment nào -> tạo mới
    try {
      const assignmentData = {
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: toObjectId(dutyId),
        TrangThaiHoatDong: true,
        isDeleted: false,
        NgayGan: new Date(),
        NguoiGanID: user.NhanVienID || null,
      };

      // ✅ SLICE 1: Add MucDoKho if provided
      if (mucDoKho !== null && mucDoKho !== undefined) {
        assignmentData.MucDoKho = mucDoKho;
      }

      // 🆕 Attach cycle id if provided
      if (chuKyId) {
        assignmentData.ChuKyDanhGiaID = chuKyId;
      }

      result = await NhanVienNhiemVu.create(assignmentData);
    } catch (err) {
      if (err?.code === 11000) {
        // Race condition: assignment được tạo bởi request khác trong lúc này
        throw new AppError(409, "Nhiệm vụ đã được gán cho nhân viên này");
      }
      throw err;
    }
  }

  // Populate dữ liệu trước khi trả về (không chain populate trên Document ở Mongoose v6+)
  await result.populate([
    {
      path: "NhiemVuThuongQuyID",
      populate: { path: "KhoaID", select: "_id TenKhoa" },
    },
    { path: "NguoiGanID", select: "_id Ten MaNhanVien" },
  ]);
  return result;
};

service.bulkAssign = async (req, employeeIds, dutyIds) => {
  const user = await getCurrentUser(req);
  if (!Array.isArray(dutyIds) || dutyIds.length === 0)
    throw new AppError(400, "Thiếu danh sách nhiệm vụ");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0)
    throw new AppError(400, "Thiếu danh sách nhân viên");

  if (!isAdminUser(user)) {
    const relations = await QuanLyNhanVien.find({
      NhanVienQuanLy: toObjectId(user.NhanVienID),
      NhanVienDuocQuanLy: { $in: employeeIds.map(toObjectId) },
      isDeleted: false,
    }).select("NhanVienDuocQuanLy");
    const managedIds = new Set(
      relations.map((r) => r.NhanVienDuocQuanLy.toString())
    );
    for (const eid of employeeIds) {
      if (!managedIds.has(eid.toString()))
        throw new AppError(
          403,
          "Bạn không có quyền với một số nhân viên trong danh sách"
        );
    }
  }

  const now = new Date();
  const chuKyId = req.body?.ChuKyDanhGiaID
    ? toObjectId(req.body.ChuKyDanhGiaID)
    : undefined;
  const ops = [];
  for (const eid of employeeIds) {
    for (const did of dutyIds) {
      try {
        await ensureSameKhoa(eid, did);
      } catch (e) {
        continue;
      }
      // Sử dụng upsert với logic khôi phục assignment đã bị xóa
      ops.push({
        updateOne: {
          filter: {
            NhanVienID: toObjectId(eid),
            NhiemVuThuongQuyID: toObjectId(did),
          },
          update: {
            $setOnInsert: {
              NhanVienID: toObjectId(eid),
              NhiemVuThuongQuyID: toObjectId(did),
              ...(chuKyId ? { ChuKyDanhGiaID: chuKyId } : {}),
            },
            $set: {
              TrangThaiHoatDong: true,
              isDeleted: false,
              NgayGan: now, // Cập nhật thời gian gán (cho cả tạo mới và khôi phục)
              NguoiGanID: user.NhanVienID || null, // Cập nhật người gán
              ...(chuKyId ? { ChuKyDanhGiaID: chuKyId } : {}),
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (ops.length === 0)
    return {
      created: 0,
      restored: 0,
      skipped: 0,
      count: { created: 0, restored: 0, skipped: 0 },
    };

  const result = await NhanVienNhiemVu.bulkWrite(ops, { ordered: false });
  const created = result.upsertedCount || 0;
  const modified = result.modifiedCount || 0;
  const restored = modified; // Assignments được khôi phục (đã tồn tại nhưng bị update)
  const skipped = ops.length - created - restored;

  return {
    created,
    restored,
    skipped,
    count: { created, restored, skipped },
    message: `Tạo mới: ${created}, Khôi phục: ${restored}, Bỏ qua: ${skipped}`,
  };
};

service.unassignById = async (req, assignmentId) => {
  const user = await getCurrentUser(req);
  const item = await NhanVienNhiemVu.findById(assignmentId);
  if (!item) throw new AppError(404, "Không tìm thấy assignment");
  if (!isAdminUser(user))
    await ensureManagerPermission(user, null, item.NhanVienID?.toString());
  item.isDeleted = true;
  item.TrangThaiHoatDong = false;
  await item.save();
  return { _id: assignmentId };
};

service.unassignByPair = async (req, employeeId, dutyId) => {
  const user = await getCurrentUser(req);
  const item = await NhanVienNhiemVu.findOne({
    NhanVienID: toObjectId(employeeId),
    NhiemVuThuongQuyID: toObjectId(dutyId),
    isDeleted: false,
  });
  if (!item) throw new AppError(404, "Không tìm thấy assignment");
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);
  item.isDeleted = true;
  item.TrangThaiHoatDong = false;
  await item.save();
  return { _id: item._id };
};

// ==================== NEW: Batch update for single employee ====================
service.batchUpdateEmployeeAssignments = async (req, employeeId, dutyIds) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);

  // Validate input
  if (!Array.isArray(dutyIds)) {
    throw new AppError(400, "dutyIds phải là mảng");
  }

  // Get employee info
  const emp = await NhanVien.findById(employeeId).select("_id KhoaID");
  if (!emp) throw new AppError(404, "Không tìm thấy nhân viên");

  // Get all duties của khoa này
  const allDuties = await NhiemVuThuongQuy.find({
    KhoaID: emp.KhoaID,
    TrangThaiHoatDong: true,
    isDeleted: false,
  }).select("_id");

  const validDutyIds = allDuties.map((d) => d._id.toString());
  const requestedDutyIds = dutyIds.map((id) => id.toString());

  // Filter chỉ những nhiệm vụ hợp lệ
  const dutyIdsToAssign = requestedDutyIds.filter((id) =>
    validDutyIds.includes(id)
  );

  // ✅ IMPORTANT: Remove duplicates from input array
  const uniqueDutyIdsToAssign = [...new Set(dutyIdsToAssign)];

  // Get current assignments (active only)
  const currentAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(employeeId),
    isDeleted: false,
    TrangThaiHoatDong: true,
  }).select("_id NhiemVuThuongQuyID");

  const currentDutyIds = currentAssignments.map((a) =>
    a.NhiemVuThuongQuyID.toString()
  );

  // Calculate diff (using unique array)
  const toAdd = uniqueDutyIdsToAssign.filter(
    (id) => !currentDutyIds.includes(id)
  );
  const toRemove = currentDutyIds.filter(
    (id) => !uniqueDutyIdsToAssign.includes(id)
  );
  const unchanged = uniqueDutyIdsToAssign.filter((id) =>
    currentDutyIds.includes(id)
  );

  const now = new Date();
  let addedCount = 0;
  let removedCount = 0;
  let restoredCount = 0;

  // Add new assignments (hoặc restore nếu đã tồn tại bị xóa)
  for (const dutyId of toAdd) {
    // Bước 1: Cố gắng RESTORE (nếu record đang bị xóa mềm)
    const restoreRes = await NhanVienNhiemVu.updateOne(
      {
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: toObjectId(dutyId),
        isDeleted: true,
      },
      {
        $set: {
          TrangThaiHoatDong: true,
          isDeleted: false,
          NgayGan: now,
          NguoiGanID: user.NhanVienID || null,
        },
      }
    );

    if (restoreRes.matchedCount && restoreRes.matchedCount > 0) {
      restoredCount++;
      continue; // sang duty tiếp theo
    }

    // Bước 2: Nếu không có record để restore, thực hiện UPSERT (atomic)
    const upsertRes = await NhanVienNhiemVu.updateOne(
      {
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: toObjectId(dutyId),
      },
      {
        $set: {
          TrangThaiHoatDong: true,
          isDeleted: false,
          NgayGan: now,
          NguoiGanID: user.NhanVienID || null,
        },
      },
      { upsert: true }
    );

    if (upsertRes.upsertedCount && upsertRes.upsertedCount > 0) {
      addedCount++;
    } else if (upsertRes.matchedCount && upsertRes.matchedCount > 0) {
      // Đã tồn tại và được cập nhật (trường hợp hiếm khi concurrent), coi như giữ nguyên
      // Không tăng restoredCount vì không chắc trạng thái trước đó
    }
  }

  // Remove assignments (soft delete)
  for (const dutyId of toRemove) {
    const assignment = currentAssignments.find(
      (a) => a.NhiemVuThuongQuyID.toString() === dutyId
    );
    if (assignment) {
      assignment.isDeleted = true;
      assignment.TrangThaiHoatDong = false;
      await assignment.save();
      removedCount++;
    }
  }

  // Unchanged: không làm gì cả (giữ nguyên NgayGan)

  return {
    success: true,
    added: addedCount,
    removed: removedCount,
    restored: restoredCount,
    unchanged: unchanged.length,
    total: uniqueDutyIdsToAssign.length,
    message: `Thêm: ${addedCount}, Khôi phục: ${restoredCount}, Xóa: ${removedCount}, Giữ nguyên: ${unchanged.length}`,
  };
};

// ============================================================================
// 🚀 NEW: Cycle-based assignment management (Option 2: Two-column layout)
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
service.getAssignmentTotals = async (req, nhanVienIds, selectedOnly) => {
  const user = await getCurrentUser(req);

  // Parse nhanVienIds: can be array or comma-separated string
  let ids = [];
  if (Array.isArray(nhanVienIds)) ids = nhanVienIds;
  else if (typeof nhanVienIds === "string" && nhanVienIds.trim().length > 0)
    ids = nhanVienIds.split(",").map((s) => s.trim());

  // If not provided or selectedOnly=true, fallback to single selected employee from query NhanVienID
  if ((!ids || ids.length === 0) && selectedOnly) {
    const eid = req.query.NhanVienID || req.params.employeeId;
    if (eid) ids = [eid];
  }

  // If not admin, ensure all target employees are managed by current user
  if (!isAdminUser(user) && ids.length > 0) {
    const relations = await QuanLyNhanVien.find({
      NhanVienQuanLy: toObjectId(user.NhanVienID),
      NhanVienDuocQuanLy: { $in: ids.map(toObjectId) },
      isDeleted: false,
    }).select("NhanVienDuocQuanLy");
    const managedIds = new Set(
      relations.map((r) => r.NhanVienDuocQuanLy.toString())
    );
    for (const id of ids) {
      if (!managedIds.has(id.toString()))
        throw new AppError(403, "Bạn không có quyền với nhân viên: " + id);
    }
  }

  // If ids not provided, scope to all employees managed by current user (or all if admin)
  if (!ids || ids.length === 0) {
    if (!isAdminUser(user)) {
      const relations = await QuanLyNhanVien.find({
        NhanVienQuanLy: toObjectId(user.NhanVienID),
        isDeleted: false,
      }).select("NhanVienDuocQuanLy");
      ids = relations.map((r) => r.NhanVienDuocQuanLy.toString());
    }
  }

  const matchStage = { TrangThaiHoatDong: true, isDeleted: false };
  if (ids && ids.length > 0)
    matchStage.NhanVienID = { $in: ids.map(toObjectId) };

  const agg = await NhanVienNhiemVu.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "nhiemvuthuongquy",
        localField: "NhiemVuThuongQuyID",
        foreignField: "_id",
        as: "duty",
      },
    },
    { $unwind: "$duty" },
    {
      $match: {
        "duty.isDeleted": { $ne: true },
        "duty.TrangThaiHoatDong": true,
      },
    },
    {
      $group: {
        _id: "$NhanVienID",
        totalMucDoKho: { $sum: { $ifNull: ["$duty.MucDoKho", 0] } },
        assignments: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "nhanviens",
        localField: "_id",
        foreignField: "_id",
        as: "nhanvien",
      },
    },
    { $unwind: { path: "$nhanvien", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        NhanVienID: "$_id",
        _id: 0,
        totalMucDoKho: 1,
        assignments: 1,
        nhanvien: {
          _id: "$nhanvien._id",
          Ten: "$nhanvien.Ten",
          MaNhanVien: "$nhanvien.MaNhanVien",
        },
      },
    },
    { $sort: { totalMucDoKho: -1 } },
  ]);

  return agg;
};
