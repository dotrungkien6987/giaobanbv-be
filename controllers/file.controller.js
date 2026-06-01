const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sanitize = require("sanitize-filename");
const { sendResponse, AppError } = require("../helpers/utils");
const {
  MAX_FILE_SIZE,
  ALLOWED_MIME,
  UPLOAD_DIR,
} = require("../modules/workmanagement/helpers/uploadConfig");

const LEGACY_UPLOAD_PATH = UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
const TEXT_MIME = "text/plain";
const OLE2_CONTAINER_MIME = "application/x-cfb";
const ZIP_CONTAINER_MIME = "application/zip";

const MAGIC_MIME_COMPATIBILITY = {
  "application/msword": [OLE2_CONTAINER_MIME],
  "application/vnd.ms-excel": [OLE2_CONTAINER_MIME],
  "application/vnd.ms-powerpoint": [OLE2_CONTAINER_MIME],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ZIP_CONTAINER_MIME,
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ZIP_CONTAINER_MIME,
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ZIP_CONTAINER_MIME,
  ],
};

const MAGIC_EXTENSION_COMPATIBILITY = {
  [OLE2_CONTAINER_MIME]: [".doc", ".xls", ".ppt"],
  [ZIP_CONTAINER_MIME]: [".docx", ".xlsx", ".pptx"],
};

function isMimeAllowed(mime) {
  if (!mime) return false;
  return (
    ALLOWED_MIME.includes(mime) ||
    (mime.startsWith("image/") && ALLOWED_MIME.includes("image/*"))
  );
}

function buildUploadFilename(originalName = "file") {
  const ext = path.extname(originalName) || "";
  const base = path.basename(originalName, ext) || "file";
  const safeBase = (sanitize(base).trim() || "file")
    .slice(0, 80)
    .replace(/\s+/g, "-");
  const safeExt = sanitize(ext) || "";

  return `${Date.now()}-${safeBase}${safeExt}`;
}

function isLikelyTextBuffer(buffer) {
  if (!buffer?.length) return true;

  let controlBytes = 0;

  for (const byte of buffer) {
    if (byte === 0) return false;
    const isAllowedWhitespace = byte === 9 || byte === 10 || byte === 13;
    const isAsciiControl = byte < 32 && !isAllowedWhitespace;

    if (isAsciiControl) controlBytes += 1;
  }

  return controlBytes / buffer.length < 0.1;
}

async function readFileChunk(filePath, chunkSize = 4096) {
  const handle = await fs.promises.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await handle.read(buffer, 0, chunkSize, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }
}

function isDetectedMimeCompatible(
  declaredMime,
  detectedMime,
  originalName = "",
) {
  if (!declaredMime || !detectedMime) return false;

  if (declaredMime === detectedMime) return true;

  if (declaredMime.startsWith("image/") && detectedMime.startsWith("image/")) {
    return true;
  }

  const compatibleMimes = MAGIC_MIME_COMPATIBILITY[declaredMime] || [];
  if (!compatibleMimes.includes(detectedMime)) return false;

  const ext = path.extname(originalName).toLowerCase();
  const compatibleExts = MAGIC_EXTENSION_COMPATIBILITY[detectedMime] || [];
  return compatibleExts.includes(ext);
}

async function verifyUploadedFileContent(file) {
  if (!file?.path) return;

  const { fileTypeFromFile } = await import("file-type");
  const detected = await fileTypeFromFile(file.path);
  const detectedMime = detected?.mime;

  if (file.mimetype === TEXT_MIME) {
    const chunk = await readFileChunk(file.path);
    if (detectedMime || !isLikelyTextBuffer(chunk)) {
      throw new AppError(
        400,
        "File không đúng định dạng nội dung",
        "Upload File Error",
      );
    }

    return;
  }

  if (
    !detectedMime ||
    !isDetectedMimeCompatible(file.mimetype, detectedMime, file.originalname)
  ) {
    throw new AppError(
      400,
      "File không đúng định dạng nội dung",
      "Upload File Error",
    );
  }
}

function normalizeUploadError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError(
        400,
        `Kích thước tệp vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB`,
        "Upload File Error",
      );
    }

    if (
      err.code === "LIMIT_FILE_COUNT" ||
      err.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return new AppError(
        400,
        "Chỉ hỗ trợ tải lên 1 tệp hợp lệ",
        "Upload File Error",
      );
    }

    return new AppError(400, err.message, "Upload File Error");
  }

  return new AppError(
    400,
    err?.message || "Upload không hợp lệ",
    "Upload File Error",
  );
}

function runSingleUpload(req, res) {
  return new Promise((resolve, reject) => {
    try {
      upload.single("file")(req, res, (err) => {
        if (err) return reject(normalizeUploadError(err));
        return resolve();
      });
    } catch (err) {
      reject(normalizeUploadError(err));
    }
  });
}

// Cấu hình multer để lưu trữ file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = LEGACY_UPLOAD_PATH; // Đường dẫn đến thư mục riêng trên server
    // Kiểm tra và tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, buildUploadFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!isMimeAllowed(file.mimetype)) {
      return cb(new Error("Loại file không được phép"));
    }

    cb(null, true);
  },
});

const fileController = {};

fileController.uploadFile = async (req, res, next) => {
  try {
    await runSingleUpload(req, res);

    if (!req.file) {
      throw new AppError(
        400,
        "Không có tệp nào được tải lên",
        "Upload File Error",
      );
    }

    try {
      await verifyUploadedFileContent(req.file);
    } catch (err) {
      await removeUploadedFile(req.file.path);
      throw err;
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/api/file/view/${encodeURIComponent(req.file.filename)}`;

    return sendResponse(
      res,
      200,
      true,
      { filename: req.file.filename, path: req.file.path, url: fileUrl },
      null,
      "File uploaded successfully",
    );
  } catch (err) {
    return next(normalizeUploadError(err));
  }
};

fileController.downloadFile = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join(LEGACY_UPLOAD_PATH, filename); // Đường dẫn đến thư mục riêng trên server
  res.download(filepath, (err) => {
    if (err) {
      return next(new AppError(404, "File not found", "Download File Error"));
    }
  });
};

fileController.viewFile = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join(LEGACY_UPLOAD_PATH, filename); // Đường dẫn đến thư mục riêng trên server
  fs.readFile(filepath, (err, data) => {
    if (err) {
      return next(new AppError(404, "File not found", "View File Error"));
    }
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream"; // Default content type

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      // Add more content types as needed
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
};

module.exports = fileController;
