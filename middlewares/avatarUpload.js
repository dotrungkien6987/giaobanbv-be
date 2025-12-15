const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const sanitize = require("sanitize-filename");
const fs = require("fs-extra");
const uploadConfig = require("../modules/workmanagement/helpers/uploadConfig");

const MB = 1024 * 1024;

function shortId(len = 6) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

function safeBaseName(originalName) {
  const ext = path.extname(originalName || "") || "";
  const base = path.basename(originalName || "file", ext) || "file";
  const safeBase = (sanitize(base).trim() || "file")
    .slice(0, 160)
    .replace(/\s+/g, "-");
  const safeExt = sanitize(ext) || "";
  return { safeBase, safeExt };
}

const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const nhanVienId = req.user?.NhanVienID;
      if (!nhanVienId) {
        return cb(new Error("User chưa được gán nhân viên"));
      }
      const dest = path.join(
        uploadConfig.UPLOAD_ROOT,
        "avatars",
        String(nhanVienId)
      );
      await fs.ensureDir(dest);
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    try {
      const { safeBase, safeExt } = safeBaseName(file.originalname || "avatar");
      const unique = `${Date.now()}-${shortId(6)}`;
      cb(null, `${unique}-${safeBase}${safeExt}`);
    } catch (err) {
      cb(err);
    }
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * MB },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ cho phép upload ảnh"));
    }
    cb(null, true);
  },
});

async function verifyAvatarMagic(req, res, next) {
  try {
    const f = req.file;
    if (!f?.path) return next();

    const { fileTypeFromFile } = await import("file-type");
    const detected = await fileTypeFromFile(f.path);
    if (!detected || !detected.mime || !detected.mime.startsWith("image/")) {
      await fs.remove(f.path);
      return next(new Error("File không đúng định dạng ảnh"));
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAvatar, verifyAvatarMagic };
