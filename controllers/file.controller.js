const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { sendResponse, AppError } = require("../helpers/utils");

// Cấu hình multer để lưu trữ file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "/var/www/uploads/"; // Đường dẫn đến thư mục riêng trên server
    // Kiểm tra và tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const fileController = {};

fileController.uploadFile = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return next(new AppError(400, err.message, "Upload File Error"));
    }
    if (!req.file) {
      return next(new AppError(400, "No file uploaded", "Upload File Error"));
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    sendResponse(res, 200, true, { filename: req.file.filename, path: req.file.path, url: fileUrl }, null, "File uploaded successfully");
  });
};

fileController.downloadFile = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join("/var/www/uploads", filename); // Đường dẫn đến thư mục riêng trên server
  res.download(filepath, (err) => {
    if (err) {
      return next(new AppError(404, "File not found", "Download File Error"));
    }
  });
};

fileController.viewFile = (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join("/var/www/uploads", filename); // Đường dẫn đến thư mục riêng trên server
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