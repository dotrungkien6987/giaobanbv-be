const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const { sendResponse, catchAsync, AppError } = require("../helpers/utils");

// NOTE: Yêu cầu server cài đặt bộ MongoDB Database Tools (mongodump, mongorestore)
// Các thao tác này có thể tốn thời gian -> có thể cải tiến dùng hàng đợi nếu DB lớn.

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve({ stdout, stderr });
    });
  });
}

// Thư mục lưu backup tạm (không nên để lâu dài). Có thể đổi sang storage khác.
const BACKUP_BASE_DIR = path.join(process.cwd(), "_backups");
if (!fs.existsSync(BACKUP_BASE_DIR))
  fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });

const backupController = {};

backupController.createAndDownload = catchAsync(async (req, res, next) => {
  // Nếu có query ?f=filename thì trả file backup đã có
  const existing = req.query.f;
  if (existing) {
    const target = path.join(BACKUP_BASE_DIR, path.basename(existing));
    if (!fs.existsSync(target))
      throw new AppError(404, "Không tìm thấy file", "BackupDownloadError");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${path.basename(target)}`
    );
    return fs.createReadStream(target).pipe(res);
  }
  const mongoUri =
    process.env.MONGO_URI || process.env.DATABASE_URL || process.env.DB_URL;
  if (!mongoUri)
    throw new AppError(500, "Chưa cấu hình biến MONGO_URI", "BackupError");

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpDir = path.join(os.tmpdir(), `dump-${ts}`);
  const archiveName = `backup-${ts}.zip`;
  const archivePath = path.join(BACKUP_BASE_DIR, archiveName);

  try {
    await execPromise(`mongodump --uri="${mongoUri}" --out="${dumpDir}"`);
    await execPromise(
      `powershell Compress-Archive -Path "${dumpDir}/*" -DestinationPath "${archivePath}"`
    );
  } catch (e) {
    // Thử lại với zip (Linux environment) nếu powershell fail
    if (!fs.existsSync(archivePath)) {
      try {
        await execPromise(`zip -r "${archivePath}" "${dumpDir}"`);
      } catch (err2) {
        throw new AppError(
          500,
          `Lỗi tạo backup: ${e.message} | ${err2.message}`,
          "BackupError"
        );
      }
    }
  } finally {
    // Xoá thư mục dump tạm
    try {
      fs.rmSync(dumpDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // Cấu hình headers tải file
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename=${archiveName}`);
  const stream = fs.createReadStream(archivePath);
  stream.on("close", () => {
    // Giữ file backup trên server để có thể list (tuỳ chính sách retention)
  });
  stream.pipe(res);
});

backupController.listBackups = catchAsync(async (req, res, next) => {
  const files = fs
    .readdirSync(BACKUP_BASE_DIR)
    .filter((f) => f.endsWith(".zip"))
    .map((f) => {
      const p = path.join(BACKUP_BASE_DIR, f);
      const stat = fs.statSync(p);
      return { file: f, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return sendResponse(res, 200, true, { files }, null, "Danh sách backup");
});

backupController.restore = catchAsync(async (req, res, next) => {
  const mongoUri =
    process.env.MONGO_URI || process.env.DATABASE_URL || process.env.DB_URL;
  if (!mongoUri)
    throw new AppError(500, "Chưa cấu hình biến MONGO_URI", "RestoreError");
  const file = req.file;
  if (!file) throw new AppError(400, "Thiếu file tải lên", "RestoreError");

  const uploadPath = file.path; // ví dụ tmp/uploads/xxxxx
  const extractDir = `${uploadPath}-extract`;

  // Giải nén: ưu tiên powershell Expand-Archive (Windows) sau đó fallback unzip
  try {
    await execPromise(
      `powershell Expand-Archive -Path "${uploadPath}" -DestinationPath "${extractDir}" -Force`
    );
  } catch (e) {
    try {
      await execPromise(`unzip -o "${uploadPath}" -d "${extractDir}"`);
    } catch (e2) {
      throw new AppError(
        500,
        `Giải nén lỗi: ${e.message} | ${e2.message}`,
        "RestoreError"
      );
    }
  }

  // Tìm thư mục dump (mongodump tạo subfolder theo tên DB)
  let dumpFolder = null;
  const walk = (dir) => {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (fs.lstatSync(full).isDirectory()) {
        if (
          fs.existsSync(path.join(full, "system.version.bson")) ||
          fs.readdirSync(full).some((f) => f.endsWith(".bson"))
        ) {
          dumpFolder = dir; // parent chứa collection dirs
          return;
        }
        walk(full);
        if (dumpFolder) return;
      }
    }
  };
  walk(extractDir);
  if (!dumpFolder) dumpFolder = extractDir; // fallback

  // Thực thi mongorestore với --drop (cảnh báo)
  try {
    await execPromise(
      `mongorestore --uri="${mongoUri}" --drop "${dumpFolder}"`
    );
  } catch (e) {
    throw new AppError(500, `Restore thất bại: ${e.message}`, "RestoreError");
  } finally {
    try {
      fs.rmSync(uploadPath, { force: true });
    } catch (_) {}
    try {
      fs.rmSync(extractDir, { recursive: true, force: true });
    } catch (_) {}
  }

  return sendResponse(
    res,
    200,
    true,
    { restored: true },
    null,
    "Đã phục hồi dữ liệu (hãy kiểm tra lại)"
  );
});

module.exports = backupController;
