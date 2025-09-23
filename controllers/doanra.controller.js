const { sendResponse, AppError, catchAsync } = require("../helpers/utils");
const DoanRa = require("../models/DoanRa");
const NhanVien = require("../models/NhanVien");

const doanRaController = {};

// Tạo mới đoàn ra
doanRaController.createDoanRa = catchAsync(async (req, res, next) => {
  const payload = req.body || {};
  const doanRa = await DoanRa.create(payload);

  // Đồng bộ SoHoChieu về NhanVien khi có
  const updates = Array.isArray(doanRa.ThanhVien)
    ? doanRa.ThanhVien.filter((m) => m?.NhanVienId && m?.SoHoChieu).map(
        (m) => ({
          updateOne: {
            filter: { _id: m.NhanVienId },
            update: { $set: { SoHoChieu: m.SoHoChieu } },
          },
        })
      )
    : [];
  if (updates.length) await NhanVien.bulkWrite(updates, { ordered: false });

  const populated = await DoanRa.findById(doanRa._id).populate(
    "ThanhVien.NhanVienId",
    "HoTen Ten MaNhanVien MaNV username KhoaID TenKhoa ChucDanh ChucDanhID ChucVu ChucVuID SoHoChieu"
  );
  sendResponse(
    res,
    200,
    true,
    populated || doanRa,
    null,
    "Tạo thông tin đoàn ra thành công"
  );
});

// Lấy tất cả đoàn ra (không phân trang, không filter)
doanRaController.getAllDoanRas = catchAsync(async (req, res, next) => {
  const doanRas = await DoanRa.find({ isDeleted: false })
    .populate(
      "ThanhVien.NhanVienId",
      "HoTen Ten MaNhanVien MaNV username KhoaID TenKhoa ChucDanh ChucDanhID ChucVu ChucVuID SoHoChieu"
    )
    .sort({ NgayKyVanBan: -1 });
  sendResponse(res, 200, true, doanRas, null, "Lấy tất cả đoàn ra thành công");
});

// Lấy chi tiết đoàn ra
doanRaController.getDoanRaById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doanRa = await DoanRa.findById(id).populate(
    "ThanhVien.NhanVienId",
    "HoTen Ten MaNhanVien MaNV username KhoaID TenKhoa ChucDanh ChucDanhID ChucVu ChucVuID SoHoChieu"
  );
  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Get DoanRa Error"
    );
  }
  sendResponse(res, 200, true, doanRa, null, "Lấy chi tiết đoàn ra thành công");
});

// Cập nhật đoàn ra
doanRaController.updateDoanRa = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const payload = req.body || {};
  const doanRa = await DoanRa.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate(
    "ThanhVien.NhanVienId",
    "HoTen Ten MaNhanVien MaNV username KhoaID TenKhoa ChucDanh ChucDanhID ChucVu ChucVuID SoHoChieu"
  );
  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Update DoanRa Error"
    );
  }
  // Đồng bộ SoHoChieu về NhanVien khi có
  const updates = Array.isArray(doanRa.ThanhVien)
    ? doanRa.ThanhVien.filter((m) => m?.NhanVienId && m?.SoHoChieu).map(
        (m) => ({
          updateOne: {
            filter: { _id: m.NhanVienId },
            update: { $set: { SoHoChieu: m.SoHoChieu } },
          },
        })
      )
    : [];
  if (updates.length) await NhanVien.bulkWrite(updates, { ordered: false });

  sendResponse(res, 200, true, doanRa, null, "Cập nhật đoàn ra thành công");
});

// Xóa đoàn ra (soft delete)
doanRaController.deleteDoanRa = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doanRa = await DoanRa.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Delete DoanRa Error"
    );
  }
  sendResponse(res, 200, true, {}, null, "Xóa đoàn ra thành công");
});

// (Bỏ các hàm thống kê)

module.exports = doanRaController;
/**
 * Danh sách thành viên Đoàn ra (server-side pagination)
 * Query: page, limit, search, fromDate, toDate, hasPassport
 */
doanRaController.getMembers = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    fromDate,
    toDate,
    hasPassport,
    quocGiaDen,
    mucDichXuatCanh,
    nguonKinhPhi,
  } = req.query;

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);

  const match = { isDeleted: { $ne: true } };
  const dateRange = {};
  if (fromDate) dateRange.$gte = new Date(fromDate);
  if (toDate) dateRange.$lte = new Date(toDate);
  if (Object.keys(dateRange).length) {
    match.$or = [
      { TuNgay: dateRange },
      { DenNgay: dateRange },
      { NgayKyVanBan: dateRange },
    ];
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        EventDate: {
          $ifNull: ["$TuNgay", { $ifNull: ["$NgayKyVanBan", "$createdAt"] }],
        },
      },
    },
    { $unwind: "$ThanhVien" },
  ];

  if (hasPassport === "true") {
    pipeline.push({
      $match: { "ThanhVien.SoHoChieu": { $nin: [null, "", undefined] } },
    });
  }
  if (hasPassport === "false") {
    pipeline.push({
      $match: {
        $or: [
          { "ThanhVien.SoHoChieu": "" },
          { "ThanhVien.SoHoChieu": null },
          { "ThanhVien.SoHoChieu": { $exists: false } },
        ],
      },
    });
  }

  if (quocGiaDen) {
    const regex = new RegExp(String(quocGiaDen).trim(), "i");
    pipeline.push({ $match: { QuocGiaDen: regex } });
  }

  if (mucDichXuatCanh) {
    const regex = new RegExp(String(mucDichXuatCanh).trim(), "i");
    pipeline.push({ $match: { MucDichXuatCanh: regex } });
  }

  if (nguonKinhPhi) {
    const regex = new RegExp(String(nguonKinhPhi).trim(), "i");
    pipeline.push({ $match: { NguonKinhPhi: regex } });
  }

  // Lookup thông tin nhân viên
  pipeline.push(
    {
      $lookup: {
        from: "nhanviens",
        localField: "ThanhVien.NhanVienId",
        foreignField: "_id",
        as: "NV",
      },
    },
    { $unwind: { path: "$NV", preserveNullAndEmptyArrays: true } }
  );

  // Lookup TenKhoa from KhoaID (fallback if NV doesn't have denormalized TenKhoa)
  pipeline.push(
    {
      $lookup: {
        from: "khoas",
        localField: "NV.KhoaID",
        foreignField: "_id",
        as: "Khoa",
      },
    },
    { $unwind: { path: "$Khoa", preserveNullAndEmptyArrays: true } }
  );

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    pipeline.push({
      $match: {
        $or: [
          { "NV.Ten": regex },
          { "NV.ChucVu": regex },
          { "NV.SoHoChieu": regex },
          { "ThanhVien.SoHoChieu": regex },
          { QuocGiaDen: regex },
          { SoVanBanChoPhep: regex },
          { MucDichXuatCanh: regex },
        ],
      },
    });
  }

  // Project trường cần thiết
  pipeline.push({
    $project: {
      // Member level
      MemberId: "$ThanhVien.NhanVienId",
      SoHoChieu: { $ifNull: ["$ThanhVien.SoHoChieu", "$NV.SoHoChieu"] },
      Ten: "$NV.Ten",
      NgaySinh: "$NV.NgaySinh",
      GioiTinh: "$NV.GioiTinh",
      ChucVu: "$NV.ChucVu",
      KhoaID: "$NV.KhoaID",
      TenKhoa: { $ifNull: ["$NV.TenKhoa", "$Khoa.TenKhoa"] },
      TrinhDoChuyenMon: "$NV.TrinhDoChuyenMon",
      isDangVien: "$NV.isDangVien",

      // Parent
      DoanId: "$_id",
      NgayKyVanBan: 1,
      SoVanBanChoPhep: 1,
      MucDichXuatCanh: 1,
      TuNgay: 1,
      DenNgay: 1,
      NguonKinhPhi: 1,
      QuocGiaDen: 1,
      BaoCao: 1,
      TaiLieuKemTheo: 1,
      GhiChu: 1,
      EventDate: 1,
      createdAt: 1,
    },
  });

  // Facet for pagination
  const facet = [
    {
      $facet: {
        items: [
          { $sort: { EventDate: -1, _id: -1 } },
          { $skip: (p - 1) * l },
          { $limit: l },
        ],
        total: [{ $count: "count" }],
      },
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    },
  ];

  const [result] = await DoanRa.aggregate([...pipeline, ...facet]);
  return sendResponse(
    res,
    200,
    true,
    { items: result.items, total: result.total, page: p, limit: l },
    null,
    "Danh sách thành viên Đoàn ra"
  );
});

// Distinct options for Autocomplete filters
doanRaController.getOptions = catchAsync(async (req, res, next) => {
  const agg = await DoanRa.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        MucDichXuatCanh: { $addToSet: "$MucDichXuatCanh" },
        NguonKinhPhi: { $addToSet: "$NguonKinhPhi" },
      },
    },
    {
      $project: {
        _id: 0,
        MucDichXuatCanh: {
          $filter: {
            input: "$MucDichXuatCanh",
            as: "v",
            cond: { $and: [{ $ne: ["$$v", null] }, { $ne: ["$$v", ""] }] },
          },
        },
        NguonKinhPhi: {
          $filter: {
            input: "$NguonKinhPhi",
            as: "v",
            cond: { $and: [{ $ne: ["$$v", null] }, { $ne: ["$$v", ""] }] },
          },
        },
      },
    },
  ]);
  const options = agg?.[0] || { MucDichXuatCanh: [], NguonKinhPhi: [] };
  // Sort alphabetically (case-insensitive)
  const sortStr = (a, b) =>
    String(a).localeCompare(String(b), "vi", { sensitivity: "base" });
  options.MucDichXuatCanh = (options.MucDichXuatCanh || []).sort(sortStr);
  options.NguonKinhPhi = (options.NguonKinhPhi || []).sort(sortStr);
  return sendResponse(res, 200, true, options, null, "Tùy chọn lọc đoàn ra");
});
