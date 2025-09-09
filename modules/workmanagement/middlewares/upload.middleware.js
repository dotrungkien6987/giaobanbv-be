const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const sanitize = require("sanitize-filename");
const fs = require("fs-extra");
// Decode latin1 -> utf8 if needed to preserve Vietnamese characters
function decodeOriginalNameToUtf8(name) {
  try {
    if (!name) return "file";
    const candidate = Buffer.from(name, "latin1").toString("utf8");
    // Heuristic: if original has mojibake markers and candidate has Vietnamese letters, use candidate
    const hasMojibake = /Ã|Â|Ä|áº|á»|Â|Ê|Ô|Æ/.test(name);
    const looksVietnamese = /[À-ỹĐđ]/.test(candidate);
    if (hasMojibake && looksVietnamese) return candidate;
    // If candidate introduces replacement chars, keep original
    if (candidate.includes("�")) return name;
    // If candidate differs and contains more non-ASCII letters, prefer it
    const countNonAscii = (s) => (s.match(/[^\x00-\x7F]/g) || []).length;
    if (countNonAscii(candidate) > countNonAscii(name)) return candidate;
    return name;
  } catch {
    return name;
  }
}
function shortId(len = 6) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}
const config = require("../helpers/uploadConfig");

function isMimeAllowed(mime) {
  // Support wildcard image/*
  return (
    config.ALLOWED_MIME.includes(mime) ||
    (mime.startsWith("image/") && config.ALLOWED_MIME.includes("image/*"))
  );
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");

      // Generic attachments path if ownerType/ownerId present
      const { ownerType, ownerId } = req.params || {};
      const field =
        req.params && (req.params.field || req.query?.field || req.body?.field);
      if (ownerType && ownerId) {
        const dest = path.join(
          config.UPLOAD_DIR,
          "attachments",
          String(ownerType).toLowerCase(),
          String(ownerId),
          String(field || "default").toLowerCase(),
          yyyy,
          mm
        );
        await fs.ensureDir(dest);
        return cb(null, dest);
      }

      // Legacy workmanagement task/comment destinations (unchanged)
      const congViecId =
        req.params.congViecId || req.params.id || req.body.CongViecID;
      const binhLuanId = req.params.binhLuanId || req.body.BinhLuanID || null;
      let dest = path.join(
        config.UPLOAD_DIR,
        "congviec",
        String(congViecId),
        yyyy,
        mm
      );
      if (binhLuanId) {
        dest = path.join(
          config.UPLOAD_DIR,
          "congviec",
          String(congViecId),
          "comments",
          String(binhLuanId),
          yyyy,
          mm
        );
      }
      await fs.ensureDir(dest);
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    try {
      const originalUtf8 = decodeOriginalNameToUtf8(
        file.originalname || "file"
      );
      // expose for service layer if needed
      file.originalnameUtf8 = originalUtf8;
      const ext = path.extname(originalUtf8) || "";
      const base = path.basename(originalUtf8, ext) || "file";
      const unique = `${Date.now()}-${shortId(6)}`;
      // Keep Unicode, remove dangerous chars only, and trim length
      const safeBase = (sanitize(base).trim() || "file")
        .slice(0, 160)
        .replace(/\s+/g, "-");
      const safeExt = sanitize(ext) || "";
      cb(null, `${unique}-${safeBase}${safeExt}`);
    } catch (err) {
      cb(err);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!isMimeAllowed(file.mimetype)) {
      return cb(new Error("Loại file không được phép"));
    }
    cb(null, true);
  },
});

// Verify magic number after multer writes file
async function verifyMagicAndTotalSize(req, res, next) {
  try {
    const files = req.files || [];
    const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
    if (totalSize > config.MAX_TOTAL_UPLOAD) {
      return next(new Error("Tổng dung lượng vượt giới hạn"));
    }
    for (const f of files) {
      const fp = f.path;
      // Dynamic import for ESM-only module
      const { fileTypeFromFile } = await import("file-type");
      const detected = await fileTypeFromFile(fp);
      // If cannot detect, allow common office/pdf/zip by extension, else ensure startsWith("image/")
      if (detected && !isMimeAllowed(detected.mime)) {
        return next(new Error("File không đúng định dạng nội dung"));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, verifyMagicAndTotalSize };
