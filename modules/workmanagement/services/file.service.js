const path = require("path");
const fs = require("fs-extra");
const mime = require("mime-types");
const mongoose = require("mongoose");
const sharp = require("sharp");
const TepTin = require("../models/TepTin");
const CongViec = require("../models/CongViec");
const BinhLuan = require("../models/BinhLuan");
const YeuCau = require("../models/YeuCau");
const { AppError } = require("../../../helpers/utils");
const {
  canAccessCongViec,
  canDeleteFile,
} = require("../helpers/filePermissions");
const config = require("../helpers/uploadConfig");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

async function assertAccess(congViecId, req) {
  const userModel = require("../../../models/User");
  const user = await userModel.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");
  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;
  const ok = await canAccessCongViec(congViecId, nhanVienId, isAdmin);
  if (!ok) throw new AppError(403, "Không có quyền truy cập công việc này");
  return { user, isAdmin, nhanVienId };
}

/**
 * Kiểm tra quyền truy cập file (hỗ trợ cả CongViec và YeuCau)
 */
async function assertAccessForFile(doc, req) {
  const userModel = require("../../../models/User");
  const user = await userModel.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");

  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;

  // Admin có quyền truy cập tất cả
  if (isAdmin) return { user, isAdmin, nhanVienId };

  // File thuộc CongViec
  if (doc.CongViecID) {
    const ok = await canAccessCongViec(doc.CongViecID, nhanVienId, isAdmin);
    if (!ok) throw new AppError(403, "Không có quyền truy cập công việc này");
    return { user, isAdmin, nhanVienId };
  }

  // File thuộc YeuCau
  if (doc.YeuCauID) {
    const yeuCau = await YeuCau.findById(doc.YeuCauID);
    if (!yeuCau) throw new AppError(404, "Không tìm thấy yêu cầu");

    // Kiểm tra người dùng có liên quan đến yêu cầu không
    const isRelated = yeuCau.nguoiDungLienQuan(nhanVienId);
    if (!isRelated) {
      throw new AppError(403, "Không có quyền truy cập yêu cầu này");
    }
    return { user, isAdmin, nhanVienId };
  }

  // File không thuộc CongViec hoặc YeuCau - cho phép nếu là người upload
  if (doc.NguoiTaiLenID && String(doc.NguoiTaiLenID) === String(nhanVienId)) {
    return { user, isAdmin, nhanVienId };
  }

  throw new AppError(403, "Không có quyền truy cập tệp này");
}

const service = {};

function decodeOriginalNameToUtf8(name) {
  try {
    if (!name) return "file";
    // If the string round-trips as UTF-8, assume it's already correct
    const round = Buffer.from(name, "utf8").toString("utf8");
    if (round === name) return name;
    // Otherwise try latin1 -> utf8
    const converted = Buffer.from(name, "latin1").toString("utf8");
    return converted || name;
  } catch (e) {
    return name;
  }
}

function encodeRFC5987ValueChars(str) {
  return encodeURIComponent(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}

function toAsciiFilename(name, fallback = "file") {
  try {
    if (!name) return fallback;
    // Remove CR/LF just in case
    let s = String(name).replace(/[\r\n]/g, " ");
    // Strip accents
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Remove any non-ASCII
    s = s.replace(/[^\x20-\x7E]/g, "");
    // Collapse spaces
    s = s.replace(/\s+/g, " ").trim();
    const sanitized = require("sanitize-filename")(s);
    return sanitized || fallback;
  } catch {
    return fallback;
  }
}

service.uploadForTask = async (
  congViecId,
  files,
  { moTa },
  req,
  binhLuanId = null
) => {
  if (!mongoose.Types.ObjectId.isValid(congViecId))
    throw new AppError(400, "CongViecID không hợp lệ");
  const cv = await CongViec.findById(congViecId);
  if (!cv || cv.isDeleted) throw new AppError(404, "Không tìm thấy công việc");
  const { nhanVienId } = await assertAccess(congViecId, req);

  const items = [];
  for (const f of files || []) {
    // Prefer name normalized by upload middleware if provided
    const tenGocUtf8 = decodeOriginalNameToUtf8(
      f.originalnameUtf8 || f.originalname
    );
    // Determine a relative storage path under UPLOAD_DIR
    let relPath;
    try {
      const root = path.resolve(config.UPLOAD_DIR);
      const abs = path.resolve(f.path);
      const candidate = path.relative(root, abs);
      relPath =
        candidate && !candidate.startsWith("..")
          ? candidate
          : f.filename || path.basename(abs);
    } catch {
      relPath = f.filename || path.basename(f.path);
    }

    let doc = await TepTin.create({
      TenFile: path.basename(f.filename || f.path),
      TenGoc: (tenGocUtf8 || "file").trim(),
      LoaiFile: f.mimetype,
      KichThuoc: f.size,
      // Store RELATIVE path for portability; old records may contain absolute
      DuongDan: relPath,
      CongViecID: toObjectId(congViecId),
      BinhLuanID: binhLuanId ? toObjectId(binhLuanId) : undefined,
      NguoiTaiLenID: toObjectId(nhanVienId),
      MoTa: moTa || "",
    });
    // Populate uploader so FE can display name/avatar immediately after upload
    doc = await doc.populate(
      "NguoiTaiLenID",
      "Ten HoTen MaNhanVien AnhDaiDien"
    );
    items.push(doc);
  }

  // Fire notification trigger for file upload
  if (items.length > 0) {
    try {
      const triggerService = require("../../../services/triggerService");
      const NhanVien = require("../../../models/NhanVien");
      const cv = await CongViec.findById(congViecId).lean();
      const uploader = await NhanVien.findById(nhanVienId).select("Ten").lean();

      for (const item of items) {
        await triggerService.fire("CongViec.uploadFile", {
          congViec: cv,
          performerId: nhanVienId,
          taskCode: cv.MaCongViec,
          taskTitle: cv.TieuDe,
          taskId: cv._id.toString(),
          uploaderName: uploader?.Ten || "Người tải lên",
          fileName: item.TenGoc,
          fileSize: Math.round(item.KichThuoc / 1024) + " KB",
        });
      }
      console.log(
        `[FileService] ✅ Fired trigger: CongViec.uploadFile (${items.length} files)`
      );
    } catch (error) {
      console.error(
        "[FileService] ❌ File upload notification trigger failed:",
        error.message
      );
    }
  }

  return items.map((d) => service.toDTO(d));
};

service.createCommentWithFiles = async (
  congViecId,
  noiDung,
  files,
  req,
  parentId = null
) => {
  const { nhanVienId } = await assertAccess(congViecId, req);
  const comment = await BinhLuan.create({
    NoiDung: typeof noiDung === "string" ? noiDung.trim() : "",
    CongViecID: toObjectId(congViecId),
    NguoiBinhLuanID: toObjectId(nhanVienId),
    BinhLuanChaID: parentId ? toObjectId(parentId) : undefined,
  });
  const filesDTO = await service.uploadForTask(
    congViecId,
    files,
    { moTa: "" },
    req,
    comment._id
  );
  // Enrich commenter display name from NhanVien or fallback to User
  const userModel = require("../../../models/User");
  const user = await userModel
    .findById(req.userId)
    .populate({ path: "NhanVienID", select: "Ten" })
    .lean();
  const tenNguoiBinhLuan =
    (user && user.NhanVienID && user.NhanVienID.Ten) ||
    (user && user.HoTen) ||
    (user && user.UserName) ||
    "Người dùng";
  const base = comment.toObject();

  // ✅ Fire notification trigger for comment
  try {
    const triggerService = require("../../../services/triggerService");
    const cv = await CongViec.findById(congViecId).lean();
    await triggerService.fire("CongViec.comment", {
      congViec: cv,
      comment: base,
      nguoiBinhLuan: { _id: nhanVienId, Ten: tenNguoiBinhLuan },
      performerId: nhanVienId, // NhanVienID của người bình luận để excludePerformer hoạt động
    });
  } catch (triggerErr) {
    console.error("[file.service] Trigger error:", triggerErr.message);
  }

  return {
    _id: String(base._id),
    CongViecID: String(base.CongViecID),
    BinhLuanChaID: base.BinhLuanChaID ? String(base.BinhLuanChaID) : null,
    NguoiBinhLuanID: String(nhanVienId),
    NoiDung: base.NoiDung,
    NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
    NgayBinhLuan: base.NgayBinhLuan || base.createdAt || new Date(),
    TrangThai: base.TrangThai || "ACTIVE",
    Files: filesDTO,
  };
};

service.listByTask = async (congViecId, { page = 1, size = 50 } = {}, req) => {
  await assertAccess(congViecId, req);
  const skip = (Math.max(1, +page) - 1) * Math.max(1, +size);
  const [items, total] = await Promise.all([
    TepTin.find({ CongViecID: congViecId, TrangThai: "ACTIVE" })
      // Populate uploader employee fields used by FE
      .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
      .sort({ NgayTaiLen: -1 })
      .skip(skip)
      .limit(Math.max(1, +size)),
    TepTin.countDocuments({ CongViecID: congViecId, TrangThai: "ACTIVE" }),
  ]);
  return { items: items.map(service.toDTO), total };
};

service.listByComment = async (binhLuanId, req) => {
  const file = await BinhLuan.findById(binhLuanId).lean();
  if (!file) throw new AppError(404, "Không tìm thấy bình luận");
  await assertAccess(file.CongViecID, req);
  const items = await TepTin.find({
    BinhLuanID: binhLuanId,
    TrangThai: "ACTIVE",
  })
    .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
    .sort({ NgayTaiLen: -1 });
  return items.map(service.toDTO);
};

service.countByTask = async (congViecId, req) => {
  await assertAccess(congViecId, req);
  return TepTin.countDocuments({ CongViecID: congViecId, TrangThai: "ACTIVE" });
};

service.softDelete = async (fileId, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  const { isAdmin, nhanVienId } = await (async () => {
    const user = await require("../../../models/User")
      .findById(req.userId)
      .lean();
    return {
      isAdmin:
        user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager"),
      nhanVienId: user && user.NhanVienID,
    };
  })();
  if (!canDeleteFile(doc, nhanVienId, isAdmin))
    throw new AppError(403, "Không có quyền xóa");
  doc.TrangThai = "DELETED";
  await doc.save();

  // Fire notification trigger for file deletion
  if (doc.CongViecID) {
    try {
      const triggerService = require("../../../services/triggerService");
      const NhanVien = require("../../../models/NhanVien");
      const cv = await CongViec.findById(doc.CongViecID).lean();
      const deleter = await NhanVien.findById(nhanVienId).select("Ten").lean();

      await triggerService.fire("CongViec.xoaFile", {
        congViec: cv,
        performerId: nhanVienId,
        taskCode: cv?.MaCongViec || "",
        taskTitle: cv?.TieuDe || "Công việc",
        taskId: doc.CongViecID.toString(),
        deleterName: deleter?.Ten || "Người xóa",
        fileName: doc.TenGoc,
      });
      console.log("[FileService] ✅ Fired trigger: CongViec.xoaFile");
    } catch (error) {
      console.error(
        "[FileService] ❌ File delete notification trigger failed:",
        error.message
      );
    }
  }

  return service.toDTO(doc);
};

service.renameOrUpdateDesc = async (fileId, { TenGoc, MoTa }, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  const { isAdmin, nhanVienId } = await (async () => {
    const user = await require("../../../models/User")
      .findById(req.userId)
      .lean();
    return {
      isAdmin:
        user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager"),
      nhanVienId: user && user.NhanVienID,
    };
  })();
  if (!canDeleteFile(doc, nhanVienId, isAdmin))
    throw new AppError(403, "Không có quyền cập nhật");
  if (typeof TenGoc === "string" && TenGoc.trim()) doc.TenGoc = TenGoc.trim();
  if (typeof MoTa === "string") doc.MoTa = MoTa;
  await doc.save();
  return service.toDTO(doc);
};

service.streamInline = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  await assertAccessForFile(doc, req);
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  // Check file existence before streaming to prevent ENOENT crash
  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(
      410,
      `Tệp không tồn tại trên hệ thống lưu trữ (ID: ${fileId})`
    );
  }

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "file"
  ).replace(/"/g, "'");
  const sanitized = toAsciiFilename(displayName, "file");
  const encoded = encodeRFC5987ValueChars(displayName);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  );

  const stream = fs.createReadStream(filePath);
  // Prevent unhandled error crash
  stream.on("error", (err) => {
    console.error(`Stream error for file ${fileId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { message: "Lỗi khi đọc tệp" },
      });
    }
  });
  return stream;
};

service.streamDownload = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  await assertAccessForFile(doc, req);
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  // Check file existence before streaming to prevent ENOENT crash
  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(
      410,
      `Tệp không tồn tại trên hệ thống lưu trữ (ID: ${fileId})`
    );
  }

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "download"
  ).replace(/"/g, "'");
  const sanitized = toAsciiFilename(displayName, "download");
  const encoded = encodeRFC5987ValueChars(displayName);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  );

  const stream = fs.createReadStream(filePath);
  // Prevent unhandled error crash
  stream.on("error", (err) => {
    console.error(`Stream error for file ${fileId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { message: "Lỗi khi đọc tệp" },
      });
    }
  });
  return stream;
};

// ═══════════════════════════════════════════════════════════════
// 🔓 THUMBNAIL - Public endpoint (không kiểm tra quyền)
// ═══════════════════════════════════════════════════════════════
service.streamThumbnail = async (fileId, res) => {
  console.log("========================================");
  console.log("[THUMB DEBUG] Request for fileId:", fileId);

  // 1. Tìm file
  const doc = await TepTin.findById(fileId);
  console.log("[THUMB DEBUG] File found:", doc ? "YES" : "NO");
  if (doc) {
    console.log("[THUMB DEBUG] File info:", {
      TenGoc: doc.TenGoc,
      LoaiFile: doc.LoaiFile,
      DuongDan: doc.DuongDan,
      TrangThai: doc.TrangThai,
    });
  }
  if (!doc || doc.TrangThai === "DELETED") {
    console.log("[THUMB DEBUG] ❌ File not found or deleted");
    throw new AppError(404, "Không tìm thấy tệp");
  }

  // 2. Kiểm tra có phải ảnh không
  const isImage = /^image\/(jpeg|jpg|png|gif|webp|bmp)/i.test(doc.LoaiFile);
  console.log("[THUMB DEBUG] Is image:", isImage, "| LoaiFile:", doc.LoaiFile);
  if (!isImage) {
    console.log("[THUMB DEBUG] ❌ Not an image file");
    // Không phải ảnh → trả 404 để <img> hiển thị broken image thay vì JSON
    return res.status(404).send("File không phải là ảnh");
  }

  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  // 3. Kiểm tra file tồn tại
  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(404, "Tệp không tồn tại trên hệ thống");
  }

  // 4. Kiểm tra kích thước file (chống resize bomb)
  const stats = await fs.stat(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  if (fileSizeMB > 20) {
    // File quá lớn → trả 413 plain text để <img> hiển thị broken image
    return res.status(413).send("File quá lớn để tạo thumbnail");
  }

  // 5. Set headers
  const ctype = mime.lookup(doc.TenGoc) || doc.LoaiFile || "image/jpeg";
  res.setHeader("Content-Type", ctype);
  res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h

  // 6. Resize và stream
  try {
    const buffer = await Promise.race([
      sharp(filePath)
        .resize(200, 200, {
          fit: "cover",
          withoutEnlargement: true, // Không phóng to ảnh nhỏ
        })
        .timeout({ seconds: 5 })
        .toBuffer(),

      // Timeout fallback
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Resize timeout")), 5000)
      ),
    ]);

    console.log(
      "[THUMB DEBUG] ✅ SUCCESS! Thumbnail buffer size:",
      buffer.length,
      "bytes"
    );
    res.send(buffer);
  } catch (err) {
    console.error("[THUMB DEBUG] ❌ ERROR during resize:", err.message);
    // Trả về 500 plain text thay vì JSON để <img> hiển thị broken image
    if (!res.headersSent) {
      res.status(500).send("Lỗi khi tạo thumbnail");
    }
  }
};

service.toDTO = (doc) => {
  const d = doc.toObject ? doc.toObject() : doc;
  // If populated, NguoiTaiLenID will be an object; otherwise it's an id
  const uploaderPop =
    d &&
    d.NguoiTaiLenID &&
    typeof d.NguoiTaiLenID === "object" &&
    d.NguoiTaiLenID._id
      ? d.NguoiTaiLenID
      : null;
  const uploader = uploaderPop
    ? {
        _id: String(uploaderPop._id),
        Ten:
          uploaderPop.Ten ||
          uploaderPop.HoTen ||
          uploaderPop.name ||
          uploaderPop.FullName ||
          undefined,
        HoTen: uploaderPop.HoTen || undefined,
        MaNhanVien: uploaderPop.MaNhanVien || undefined,
        AnhDaiDien: uploaderPop.AnhDaiDien || undefined,
      }
    : null;
  const uploaderId = uploaderPop
    ? String(uploaderPop._id)
    : d.NguoiTaiLenID
    ? String(d.NguoiTaiLenID)
    : null;

  return {
    _id: String(d._id),
    TenFile: d.TenFile,
    TenGoc: d.TenGoc,
    LoaiFile: d.LoaiFile,
    KichThuoc: d.KichThuoc,
    DuongDan: d.DuongDan,
    OwnerType: d.OwnerType || null,
    OwnerID: d.OwnerID ? String(d.OwnerID) : null,
    OwnerField: d.OwnerField || null,
    CongViecID: d.CongViecID ? String(d.CongViecID) : null,
    BinhLuanID: d.BinhLuanID ? String(d.BinhLuanID) : null,
    NguoiTaiLenID: uploaderId,
    // New: structured uploader info for FE display
    NguoiTaiLen: uploader,
    // Convenience fallback name (for legacy FE)
    NguoiTaiLenName:
      uploader && (uploader.Ten || uploader.HoTen)
        ? uploader.Ten || uploader.HoTen
        : undefined,
    MoTa: d.MoTa || "",
    TrangThai: d.TrangThai,
    NgayTaiLen: d.NgayTaiLen || d.createdAt,
    thumbUrl: `/api/workmanagement/files/${d._id}/thumb`,
    inlineUrl: `/api/workmanagement/files/${d._id}/inline`,
    downloadUrl: `/api/workmanagement/files/${d._id}/download`,
  };
};

module.exports = service;
