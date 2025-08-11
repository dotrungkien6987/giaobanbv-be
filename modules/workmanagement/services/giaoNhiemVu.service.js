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

service.assignOne = async (req, employeeId, dutyId) => {
  const user = await getCurrentUser(req);
  if (!isAdminUser(user)) await ensureManagerPermission(user, null, employeeId);
  await ensureSameKhoa(employeeId, dutyId);

  // Kiểm tra xem đã có assignment bị xóa (soft delete) hay chưa
  // Lưu ý: model có pre(/^find/) tự loại bỏ isDeleted=true nếu không chỉ định
  // Để hỗ trợ khôi phục (restore), cần bao gồm cả bản ghi đã xóa mềm
  const existingAssignment = await NhanVienNhiemVu.findOne({
    NhanVienID: toObjectId(employeeId),
    NhiemVuThuongQuyID: toObjectId(dutyId),
    isDeleted: { $in: [true, false] },
  });

  let result;

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

      await existingAssignment.save();
      result = existingAssignment;
    }
  } else {
    // Chưa có assignment nào -> tạo mới
    try {
      result = await NhanVienNhiemVu.create({
        NhanVienID: toObjectId(employeeId),
        NhiemVuThuongQuyID: toObjectId(dutyId),
        TrangThaiHoatDong: true,
        isDeleted: false,
        NgayGan: new Date(),
        NguoiGanID: user.NhanVienID || null,
      });
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
            },
            $set: {
              TrangThaiHoatDong: true,
              isDeleted: false,
              NgayGan: now, // Cập nhật thời gian gán (cho cả tạo mới và khôi phục)
              NguoiGanID: user.NhanVienID || null, // Cập nhật người gán
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
