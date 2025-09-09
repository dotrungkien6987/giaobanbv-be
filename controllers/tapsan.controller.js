const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const TapSan = require("../models/TapSan");

function normalize(input = {}) {
  const o = {};
  if (typeof input.Loai === "string") o.Loai = input.Loai.trim();
  if (typeof input.NamXuatBan === "string")
    o.NamXuatBan = input.NamXuatBan.trim();
  if (input.SoXuatBan !== undefined) o.SoXuatBan = Number(input.SoXuatBan);
  return o;
}

async function assertUnique({ Loai, NamXuatBan, SoXuatBan }, excludeId = null) {
  if (!Loai || !NamXuatBan || !SoXuatBan) return;
  const cond = { Loai, NamXuatBan, SoXuatBan, isDeleted: false };
  if (excludeId) cond._id = { $ne: excludeId };
  const exists = await TapSan.findOne(cond).lean();
  if (exists)
    throw new AppError(409, "Tập san đã tồn tại (Loai, Năm, Số trùng)");
}

exports.create = catchAsync(async (req, res) => {
  const { Loai, NamXuatBan, SoXuatBan } = normalize(req.body || {});
  if (!Loai || !NamXuatBan || !SoXuatBan)
    throw new AppError(400, "Thiếu dữ liệu bắt buộc");
  if (!/^\d{4}$/.test(NamXuatBan))
    throw new AppError(400, "Năm xuất bản phải gồm 4 chữ số");
  if (!Number.isInteger(SoXuatBan) || SoXuatBan <= 0)
    throw new AppError(400, "Số xuất bản phải là số nguyên dương");

  await assertUnique({ Loai, NamXuatBan, SoXuatBan });
  const doc = await TapSan.create({ Loai, NamXuatBan, SoXuatBan });
  return sendResponse(res, 201, true, doc, null, "Tạo Tập san thành công");
});

exports.list = catchAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const size = Math.max(1, parseInt(req.query.size || "20", 10));
  const skip = (page - 1) * size;
  const { Loai, NamXuatBan, SoXuatBan, search } = req.query || {};
  const filter = { isDeleted: false };
  if (Loai) filter.Loai = String(Loai);
  if (NamXuatBan) filter.NamXuatBan = String(NamXuatBan);
  if (SoXuatBan) filter.SoXuatBan = Number(SoXuatBan);
  if (search) {
    const s = String(search).trim();
    filter.$or = [
      { NamXuatBan: { $regex: s, $options: "i" } },
      { Loai: { $regex: s, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    TapSan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(size),
    TapSan.countDocuments(filter),
  ]);
  return sendResponse(
    res,
    200,
    true,
    { items, total, page, size, totalPages: Math.ceil(total / size) },
    null,
    "Lấy danh sách Tập san thành công"
  );
});

exports.getById = catchAsync(async (req, res) => {
  const doc = await TapSan.findById(req.params.id);
  if (!doc || doc.isDeleted) throw new AppError(404, "Không tìm thấy Tập san");
  return sendResponse(res, 200, true, doc, null, "Lấy chi tiết thành công");
});

exports.update = catchAsync(async (req, res) => {
  const id = req.params.id;
  const doc = await TapSan.findById(id);
  if (!doc || doc.isDeleted) throw new AppError(404, "Không tìm thấy Tập san");
  const { Loai, NamXuatBan, SoXuatBan } = normalize(req.body || {});
  const next = { ...doc.toObject() };
  if (Loai) next.Loai = Loai;
  if (NamXuatBan) next.NamXuatBan = NamXuatBan;
  if (SoXuatBan !== undefined) next.SoXuatBan = SoXuatBan;

  if (next.NamXuatBan && !/^\d{4}$/.test(next.NamXuatBan))
    throw new AppError(400, "Năm xuất bản phải gồm 4 chữ số");
  if (!Number.isInteger(next.SoXuatBan) || next.SoXuatBan <= 0)
    throw new AppError(400, "Số xuất bản phải là số nguyên dương");

  await assertUnique(
    {
      Loai: next.Loai,
      NamXuatBan: next.NamXuatBan,
      SoXuatBan: next.SoXuatBan,
    },
    id
  );
  doc.Loai = next.Loai;
  doc.NamXuatBan = next.NamXuatBan;
  doc.SoXuatBan = next.SoXuatBan;
  await doc.save();
  return sendResponse(res, 200, true, doc, null, "Cập nhật thành công");
});

exports.remove = catchAsync(async (req, res) => {
  const id = req.params.id;
  const doc = await TapSan.findById(id);
  if (!doc || doc.isDeleted) throw new AppError(404, "Không tìm thấy Tập san");
  doc.isDeleted = true;
  await doc.save();
  return sendResponse(
    res,
    200,
    true,
    { _id: doc._id },
    null,
    "Xóa (ẩn) thành công"
  );
});

exports.restore = catchAsync(async (req, res) => {
  const id = req.params.id;
  const doc = await TapSan.findById(id);
  if (!doc) throw new AppError(404, "Không tìm thấy Tập san");
  doc.isDeleted = false;
  await doc.save();
  return sendResponse(res, 200, true, doc, null, "Khôi phục thành công");
});
