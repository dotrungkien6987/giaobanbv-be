# Phase 9: Quản lý Tài liệu đính kèm (File Attachments Management)

## Mục tiêu Phase 9

Xây dựng hệ thống quản lý file attachments hoàn chỉnh để hỗ trợ đính kèm tài liệu, hình ảnh, và các file liên quan đến công việc, tickets, và đánh giá KPI.

## Tiền điều kiện

- ✅ Phase 1-8 đã hoàn thành
- ✅ Multer middleware đã được cài đặt
- ✅ Cloud storage (AWS S3 hoặc tương tự) đã được cấu hình
- ✅ Antivirus scanning service sẵn sàng (tùy chọn)

## Đặc điểm nghiệp vụ của File Attachments

### Các loại file attachments:

1. **Task Attachments**: File mô tả công việc, báo cáo kết quả
2. **Ticket Attachments**: Ảnh chụp màn hình, file log, tài liệu hỗ trợ
3. **KPI Attachments**: Báo cáo, bằng chứng hoàn thành
4. **User Avatar**: Ảnh đại diện người dùng
5. **System Documents**: Hướng dẫn, chính sách, template

### Yêu cầu kỹ thuật:

- **File Types**: Hỗ trợ image, document, archive files
- **File Size**: Giới hạn dung lượng theo loại file
- **Security**: Virus scanning, file type validation
- **Storage**: Local storage và cloud storage
- **Compression**: Tự động nén ảnh
- **Versioning**: Lưu trữ nhiều phiên bản file

## Nhiệm vụ chính

### 1. Tạo Models cho File Management

#### 1.1 FileAttachment Model

**File mới**: `modules/filemanagement/models/FileAttachment.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const path = require("path");

const fileAttachmentSchema = Schema(
  {
    // Thông tin file cơ bản
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileExtension: {
      type: String,
      required: true,
    },

    // File metadata
    metadata: {
      width: { type: Number }, // For images
      height: { type: Number }, // For images
      duration: { type: Number }, // For videos
      pageCount: { type: Number }, // For documents
      encoding: { type: String },
    },

    // Phân loại file
    category: {
      type: String,
      enum: [
        "TASK_ATTACHMENT",
        "TICKET_ATTACHMENT",
        "KPI_ATTACHMENT",
        "USER_AVATAR",
        "SYSTEM_DOCUMENT",
        "TEMP_FILE",
      ],
      required: true,
    },

    // Liên kết với entities
    relatedModel: {
      type: String,
      enum: [
        "AssignedTask",
        "Ticket",
        "DanhGiaKPI",
        "User",
        "NhiemVuThuongQuy",
        null,
      ],
    },
    relatedId: {
      type: Schema.ObjectId,
    },

    // File upload info
    uploadedBy: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    // Storage info
    storageType: {
      type: String,
      enum: ["LOCAL", "S3", "CLOUDINARY"],
      default: "LOCAL",
    },
    storageLocation: {
      type: String, // S3 bucket, cloudinary folder, etc.
    },

    // Security
    isPublic: {
      type: Boolean,
      default: false,
    },
    accessibleBy: [
      {
        type: Schema.ObjectId,
        ref: "User",
      },
    ],
    downloadCount: {
      type: Number,
      default: 0,
    },

    // File processing
    processingStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    virusScanStatus: {
      type: String,
      enum: ["PENDING", "CLEAN", "INFECTED", "FAILED"],
      default: "PENDING",
    },

    // Thumbnails and variants
    thumbnails: [
      {
        size: { type: String }, // small, medium, large
        fileName: { type: String },
        filePath: { type: String },
        fileSize: { type: Number },
      },
    ],

    // File versions (for documents)
    versions: [
      {
        version: { type: Number },
        fileName: { type: String },
        filePath: { type: String },
        uploadedAt: { type: Date },
        uploadedBy: { type: Schema.ObjectId, ref: "User" },
        changelog: { type: String },
      },
    ],

    // Expiry and cleanup
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "file_attachments",
  }
);

// Indexes
fileAttachmentSchema.index({ fileName: 1 }, { unique: true });
fileAttachmentSchema.index({ uploadedBy: 1, uploadedAt: -1 });
fileAttachmentSchema.index({ relatedModel: 1, relatedId: 1 });
fileAttachmentSchema.index({ category: 1 });
fileAttachmentSchema.index({ storageType: 1 });
fileAttachmentSchema.index({ isDeleted: 1 });

// Virtuals
fileAttachmentSchema.virtual("fileUrl").get(function () {
  if (this.storageType === "LOCAL") {
    return `${process.env.BASE_URL}/api/files/${this.fileName}`;
  } else if (this.storageType === "S3") {
    return `https://${this.storageLocation}/${this.fileName}`;
  }
  return this.filePath;
});

fileAttachmentSchema.virtual("downloadUrl").get(function () {
  return `${process.env.BASE_URL}/api/files/download/${this.fileName}`;
});

fileAttachmentSchema.virtual("isImage").get(function () {
  return this.mimeType.startsWith("image/");
});

fileAttachmentSchema.virtual("isDocument").get(function () {
  const documentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  return documentTypes.includes(this.mimeType);
});

fileAttachmentSchema.virtual("humanFileSize").get(function () {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (this.fileSize === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(this.fileSize) / Math.log(1024)));
  return (
    Math.round((this.fileSize / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  );
});

// Methods
fileAttachmentSchema.methods.incrementDownloadCount = function () {
  this.downloadCount += 1;
  return this.save();
};

fileAttachmentSchema.methods.addVersion = function (versionData) {
  const currentVersion =
    this.versions.length > 0
      ? Math.max(...this.versions.map((v) => v.version))
      : 0;

  this.versions.push({
    version: currentVersion + 1,
    ...versionData,
  });

  return this.save();
};

fileAttachmentSchema.methods.createThumbnail = function (thumbnailData) {
  this.thumbnails.push(thumbnailData);
  return this.save();
};

// Static methods
fileAttachmentSchema.statics.findByEntity = function (entityType, entityId) {
  return this.find({
    relatedModel: entityType,
    relatedId: entityId,
    isDeleted: false,
  }).populate("uploadedBy", "HoTen");
};

fileAttachmentSchema.statics.findByUser = function (userId, category = null) {
  const query = { uploadedBy: userId, isDeleted: false };
  if (category) query.category = category;

  return this.find(query).sort({ uploadedAt: -1 });
};

fileAttachmentSchema.statics.getStorageStats = function () {
  return this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$storageType",
        totalFiles: { $sum: 1 },
        totalSize: { $sum: "$fileSize" },
        avgSize: { $avg: "$fileSize" },
      },
    },
  ]);
};

// Pre-save middleware
fileAttachmentSchema.pre("save", function (next) {
  if (!this.fileExtension && this.originalName) {
    this.fileExtension = path.extname(this.originalName).toLowerCase();
  }
  next();
});

// Pre-remove middleware (for cleanup)
fileAttachmentSchema.pre("remove", async function (next) {
  try {
    // Delete physical file
    await this.constructor.deletePhysicalFile(this);
    next();
  } catch (error) {
    next(error);
  }
});

const FileAttachment = mongoose.model("FileAttachment", fileAttachmentSchema);
module.exports = FileAttachment;
```

#### 1.2 FileUploadLog Model (for audit trail)

**File mới**: `modules/filemanagement/models/FileUploadLog.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileUploadLogSchema = Schema(
  {
    fileId: {
      type: Schema.ObjectId,
      ref: "FileAttachment",
      required: true,
    },

    action: {
      type: String,
      enum: ["UPLOAD", "DOWNLOAD", "DELETE", "VIEW", "SHARE"],
      required: true,
    },

    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    details: {
      type: Schema.Types.Mixed,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "file_upload_logs",
  }
);

fileUploadLogSchema.index({ fileId: 1, timestamp: -1 });
fileUploadLogSchema.index({ userId: 1, timestamp: -1 });
fileUploadLogSchema.index({ action: 1, timestamp: -1 });

const FileUploadLog = mongoose.model("FileUploadLog", fileUploadLogSchema);
module.exports = FileUploadLog;
```

### 2. File Storage Services

#### 2.1 Storage Service Interface

**File mới**: `modules/filemanagement/services/storage.service.js`

```javascript
const fs = require("fs").promises;
const path = require("path");
const AWS = require("aws-sdk");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || "LOCAL";
    this.uploadDir = process.env.UPLOAD_DIR || "./uploads";

    // AWS S3 setup
    if (this.storageType === "S3") {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
      this.bucketName = process.env.S3_BUCKET_NAME;
    }
  }

  // Upload file to storage
  async uploadFile(file, options = {}) {
    try {
      const fileName = this.generateFileName(file.originalname);
      const filePath = options.folder
        ? `${options.folder}/${fileName}`
        : fileName;

      let result;

      switch (this.storageType) {
        case "LOCAL":
          result = await this.uploadToLocal(file, filePath);
          break;
        case "S3":
          result = await this.uploadToS3(file, filePath);
          break;
        default:
          throw new Error(`Unsupported storage type: ${this.storageType}`);
      }

      return {
        fileName,
        filePath: result.filePath,
        fileSize: file.size,
        storageType: this.storageType,
        storageLocation: result.storageLocation,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  // Upload to local storage
  async uploadToLocal(file, filePath) {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, file.buffer);

    return {
      filePath: fullPath,
      storageLocation: this.uploadDir,
    };
  }

  // Upload to AWS S3
  async uploadToS3(file, filePath) {
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: "AES256",
    };

    const result = await this.s3.upload(params).promise();

    return {
      filePath: result.Location,
      storageLocation: this.bucketName,
    };
  }

  // Get file from storage
  async getFile(fileName, storageType = null) {
    const type = storageType || this.storageType;

    switch (type) {
      case "LOCAL":
        return await this.getFromLocal(fileName);
      case "S3":
        return await this.getFromS3(fileName);
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }

  // Get from local storage
  async getFromLocal(fileName) {
    const filePath = path.join(this.uploadDir, fileName);
    const buffer = await fs.readFile(filePath);
    return buffer;
  }

  // Get from S3
  async getFromS3(fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
    };

    const result = await this.s3.getObject(params).promise();
    return result.Body;
  }

  // Delete file from storage
  async deleteFile(fileName, storageType = null) {
    const type = storageType || this.storageType;

    switch (type) {
      case "LOCAL":
        return await this.deleteFromLocal(fileName);
      case "S3":
        return await this.deleteFromS3(fileName);
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }

  // Delete from local storage
  async deleteFromLocal(fileName) {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.unlink(filePath);
    return true;
  }

  // Delete from S3
  async deleteFromS3(fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
    };

    await this.s3.deleteObject(params).promise();
    return true;
  }

  // Generate unique filename
  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);

    return `${name}_${timestamp}_${uuid}${ext}`;
  }

  // Create image thumbnails
  async createThumbnails(file, fileName) {
    if (!file.mimetype.startsWith("image/")) {
      return [];
    }

    const thumbnails = [];
    const sizes = [
      { name: "small", width: 150, height: 150 },
      { name: "medium", width: 300, height: 300 },
      { name: "large", width: 600, height: 600 },
    ];

    for (const size of sizes) {
      try {
        const thumbnailBuffer = await sharp(file.buffer)
          .resize(size.width, size.height, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        const thumbnailName = `thumb_${size.name}_${fileName}`;
        const thumbnailFile = {
          ...file,
          buffer: thumbnailBuffer,
          originalname: thumbnailName,
          size: thumbnailBuffer.length,
        };

        const uploadResult = await this.uploadFile(thumbnailFile, {
          folder: "thumbnails",
        });

        thumbnails.push({
          size: size.name,
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          fileSize: uploadResult.fileSize,
        });
      } catch (error) {
        console.error(`Error creating ${size.name} thumbnail:`, error);
      }
    }

    return thumbnails;
  }
}

module.exports = new StorageService();
```

#### 2.2 File Validation Service

**File mới**: `modules/filemanagement/services/validation.service.js`

```javascript
const FileType = require("file-type");
const virusScan = require("clamscan");

class FileValidationService {
  constructor() {
    this.allowedTypes = {
      TASK_ATTACHMENT: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-rar-compressed",
      ],
      TICKET_ATTACHMENT: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-rar-compressed",
      ],
      KPI_ATTACHMENT: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
      ],
      USER_AVATAR: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    };

    this.maxFileSizes = {
      TASK_ATTACHMENT: 50 * 1024 * 1024, // 50MB
      TICKET_ATTACHMENT: 20 * 1024 * 1024, // 20MB
      KPI_ATTACHMENT: 30 * 1024 * 1024, // 30MB
      USER_AVATAR: 5 * 1024 * 1024, // 5MB
      SYSTEM_DOCUMENT: 100 * 1024 * 1024, // 100MB
    };

    // Initialize antivirus scanner (optional)
    this.virusScanner = null;
    this.initVirusScanner();
  }

  async initVirusScanner() {
    try {
      this.virusScanner = await virusScan.createEngine({
        scanTimeout: 30000,
        preference: "clamdscan",
        clamdscan: {
          socket: process.env.CLAMD_SOCKET,
          host: process.env.CLAMD_HOST || "localhost",
          port: process.env.CLAMD_PORT || 3310,
        },
      });
    } catch (error) {
      console.warn("Virus scanner not available:", error.message);
    }
  }

  // Validate file type and size
  async validateFile(file, category) {
    const errors = [];

    // Check file size
    const maxSize =
      this.maxFileSizes[category] || this.maxFileSizes["TASK_ATTACHMENT"];
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${this.formatFileSize(maxSize)}`);
    }

    // Check MIME type
    const allowedTypes =
      this.allowedTypes[category] || this.allowedTypes["TASK_ATTACHMENT"];
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed for ${category}`);
    }

    // Verify actual file type vs declared MIME type
    try {
      const detectedType = await FileType.fromBuffer(file.buffer);
      if (detectedType && detectedType.mime !== file.mimetype) {
        errors.push("File type mismatch detected");
      }
    } catch (error) {
      console.warn("File type detection failed:", error);
    }

    // Check for malicious content patterns
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
    ];

    const fileContent = file.buffer.toString(
      "utf8",
      0,
      Math.min(file.buffer.length, 1024)
    );
    for (const pattern of maliciousPatterns) {
      if (pattern.test(fileContent)) {
        errors.push("Potentially malicious content detected");
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Scan file for viruses
  async scanForVirus(file) {
    if (!this.virusScanner) {
      return { isClean: true, scanResult: "Scanner not available" };
    }

    try {
      const scanResult = await this.virusScanner.scanBuffer(file.buffer);

      return {
        isClean: scanResult.isInfected === false,
        scanResult: scanResult.viruses?.join(", ") || "Clean",
      };
    } catch (error) {
      console.error("Virus scan failed:", error);
      return {
        isClean: false,
        scanResult: `Scan failed: ${error.message}`,
      };
    }
  }

  // Get file metadata
  async getFileMetadata(file) {
    const metadata = {};

    // For images
    if (file.mimetype.startsWith("image/")) {
      try {
        const sharp = require("sharp");
        const imageInfo = await sharp(file.buffer).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;
      } catch (error) {
        console.warn("Failed to extract image metadata:", error);
      }
    }

    // For videos (if needed)
    if (file.mimetype.startsWith("video/")) {
      // Could use ffprobe or similar
      metadata.type = "video";
    }

    // For documents
    if (file.mimetype === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(file.buffer);
        metadata.pageCount = pdfData.numpages;
        metadata.text = pdfData.text.substring(0, 500); // First 500 chars for indexing
      } catch (error) {
        console.warn("Failed to extract PDF metadata:", error);
      }
    }

    return metadata;
  }

  // Format file size for display
  formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Byte";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  // Get allowed file types for category
  getAllowedTypes(category) {
    return this.allowedTypes[category] || this.allowedTypes["TASK_ATTACHMENT"];
  }

  // Get max file size for category
  getMaxFileSize(category) {
    return this.maxFileSizes[category] || this.maxFileSizes["TASK_ATTACHMENT"];
  }
}

module.exports = new FileValidationService();
```

### 3. File Management Controllers

#### 3.1 File Upload Controller

**File mới**: `modules/filemanagement/controllers/file.controller.js`

```javascript
const FileAttachment = require("../models/FileAttachment");
const FileUploadLog = require("../models/FileUploadLog");
const StorageService = require("../services/storage.service");
const ValidationService = require("../services/validation.service");
const responseFormatter = require("../../workmanagement/utils/responseFormatter");

// Upload single file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Không có file được upload"));
    }

    const { category, relatedModel, relatedId } = req.body;

    // Validate file
    const validation = await ValidationService.validateFile(req.file, category);
    if (!validation.isValid) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "File không hợp lệ",
            validation.errors
          )
        );
    }

    // Virus scan (if available)
    const virusScan = await ValidationService.scanForVirus(req.file);
    if (!virusScan.isClean) {
      return res
        .status(400)
        .json(
          responseFormatter.errorResponse(
            "File chứa virus hoặc nội dung độc hại"
          )
        );
    }

    // Upload to storage
    const uploadResult = await StorageService.uploadFile(req.file, {
      folder: category.toLowerCase(),
    });

    // Get file metadata
    const metadata = await ValidationService.getFileMetadata(req.file);

    // Create file record
    const fileRecord = new FileAttachment({
      originalName: req.file.originalname,
      fileName: uploadResult.fileName,
      filePath: uploadResult.filePath,
      fileSize: uploadResult.fileSize,
      mimeType: req.file.mimetype,
      category,
      relatedModel,
      relatedId,
      uploadedBy: req.user._id,
      storageType: uploadResult.storageType,
      storageLocation: uploadResult.storageLocation,
      metadata,
      virusScanStatus: virusScan.isClean ? "CLEAN" : "INFECTED",
      processingStatus: "COMPLETED",
    });

    await fileRecord.save();

    // Create thumbnails for images
    if (req.file.mimetype.startsWith("image/")) {
      try {
        const thumbnails = await StorageService.createThumbnails(
          req.file,
          uploadResult.fileName
        );
        fileRecord.thumbnails = thumbnails;
        await fileRecord.save();
      } catch (error) {
        console.warn("Failed to create thumbnails:", error);
      }
    }

    // Log upload action
    await FileUploadLog.create({
      fileId: fileRecord._id,
      action: "UPLOAD",
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      details: {
        category,
        relatedModel,
        relatedId,
        fileSize: uploadResult.fileSize,
      },
    });

    // Populate and return
    await fileRecord.populate("uploadedBy", "HoTen");

    res
      .status(201)
      .json(
        responseFormatter.successResponse(fileRecord, "Upload file thành công")
      );
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi upload file", error.message));
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json(responseFormatter.errorResponse("Không có file được upload"));
    }

    const { category, relatedModel, relatedId } = req.body;
    const uploadedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Validate file
        const validation = await ValidationService.validateFile(file, category);
        if (!validation.isValid) {
          errors.push({
            fileName: file.originalname,
            errors: validation.errors,
          });
          continue;
        }

        // Virus scan
        const virusScan = await ValidationService.scanForVirus(file);
        if (!virusScan.isClean) {
          errors.push({
            fileName: file.originalname,
            errors: ["File chứa virus hoặc nội dung độc hại"],
          });
          continue;
        }

        // Upload to storage
        const uploadResult = await StorageService.uploadFile(file, {
          folder: category.toLowerCase(),
        });

        // Get metadata
        const metadata = await ValidationService.getFileMetadata(file);

        // Create file record
        const fileRecord = new FileAttachment({
          originalName: file.originalname,
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          fileSize: uploadResult.fileSize,
          mimeType: file.mimetype,
          category,
          relatedModel,
          relatedId,
          uploadedBy: req.user._id,
          storageType: uploadResult.storageType,
          storageLocation: uploadResult.storageLocation,
          metadata,
          virusScanStatus: "CLEAN",
          processingStatus: "COMPLETED",
        });

        await fileRecord.save();

        // Create thumbnails for images
        if (file.mimetype.startsWith("image/")) {
          try {
            const thumbnails = await StorageService.createThumbnails(
              file,
              uploadResult.fileName
            );
            fileRecord.thumbnails = thumbnails;
            await fileRecord.save();
          } catch (error) {
            console.warn("Failed to create thumbnails:", error);
          }
        }

        await fileRecord.populate("uploadedBy", "HoTen");
        uploadedFiles.push(fileRecord);

        // Log upload
        await FileUploadLog.create({
          fileId: fileRecord._id,
          action: "UPLOAD",
          userId: req.user._id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });
      } catch (error) {
        errors.push({
          fileName: file.originalname,
          errors: [error.message],
        });
      }
    }

    res.json(
      responseFormatter.successResponse(
        {
          uploadedFiles,
          errors,
          summary: {
            total: req.files.length,
            success: uploadedFiles.length,
            failed: errors.length,
          },
        },
        "Upload multiple files hoàn thành"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(
        responseFormatter.errorResponse(
          "Lỗi upload multiple files",
          error.message
        )
      );
  }
};

// Get file details
exports.getFileDetails = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await FileAttachment.findById(fileId)
      .populate("uploadedBy", "HoTen Email")
      .populate("accessibleBy", "HoTen");

    if (!file || file.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy file"));
    }

    // Check permission
    if (!(await this.checkFileAccess(req.user, file))) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền truy cập file"));
    }

    res.json(
      responseFormatter.successResponse(file, "Lấy thông tin file thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const { fileName } = req.params;

    const file = await FileAttachment.findOne({ fileName, isDeleted: false });
    if (!file) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy file"));
    }

    // Check permission
    if (!(await this.checkFileAccess(req.user, file))) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền tải file"));
    }

    // Get file from storage
    const fileBuffer = await StorageService.getFile(fileName, file.storageType);

    // Increment download count
    await file.incrementDownloadCount();

    // Log download
    await FileUploadLog.create({
      fileId: file._id,
      action: "DOWNLOAD",
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Set headers
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`
    );
    res.setHeader("Content-Length", file.fileSize);

    res.send(fileBuffer);
  } catch (error) {
    res
      .status(500)
      .json(
        responseFormatter.errorResponse("Lỗi download file", error.message)
      );
  }
};

// View file (stream for images/PDFs)
exports.viewFile = async (req, res) => {
  try {
    const { fileName } = req.params;

    const file = await FileAttachment.findOne({ fileName, isDeleted: false });
    if (!file) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy file"));
    }

    // Check permission
    if (!(await this.checkFileAccess(req.user, file))) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền xem file"));
    }

    // Get file from storage
    const fileBuffer = await StorageService.getFile(fileName, file.storageType);

    // Log view
    await FileUploadLog.create({
      fileId: file._id,
      action: "VIEW",
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Set headers for inline viewing
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.originalName}"`
    );
    res.setHeader("Content-Length", file.fileSize);

    res.send(fileBuffer);
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi view file", error.message));
  }
};

// Get thumbnail
exports.getThumbnail = async (req, res) => {
  try {
    const { fileName, size = "medium" } = req.params;

    const file = await FileAttachment.findOne({ fileName, isDeleted: false });
    if (!file) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy file"));
    }

    // Find thumbnail
    const thumbnail = file.thumbnails.find((t) => t.size === size);
    if (!thumbnail) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy thumbnail"));
    }

    // Get thumbnail from storage
    const thumbnailBuffer = await StorageService.getFile(
      thumbnail.fileName,
      file.storageType
    );

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
    res.send(thumbnailBuffer);
  } catch (error) {
    res
      .status(500)
      .json(
        responseFormatter.errorResponse("Lỗi get thumbnail", error.message)
      );
  }
};

// Get files by entity
exports.getFilesByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const files = await FileAttachment.findByEntity(entityType, entityId)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ uploadedAt: -1 });

    const total = await FileAttachment.countDocuments({
      relatedModel: entityType,
      relatedId: entityId,
      isDeleted: false,
    });

    res.json(
      responseFormatter.successResponse(
        files,
        "Lấy danh sách file thành công",
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        }
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await FileAttachment.findById(fileId);
    if (!file || file.isDeleted) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy file"));
    }

    // Check permission
    if (!(await this.checkFileDeleteAccess(req.user, file))) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền xóa file"));
    }

    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = req.user._id;
    await file.save();

    // Log delete
    await FileUploadLog.create({
      fileId: file._id,
      action: "DELETE",
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json(responseFormatter.successResponse(null, "Xóa file thành công"));
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi delete file", error.message));
  }
};

// Get upload statistics
exports.getUploadStats = async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user._id;

    // Check permission for viewing other user's stats
    if (
      userId &&
      userId !== req.user._id.toString() &&
      req.user.PhanQuyen !== "admin"
    ) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền xem thống kê"));
    }

    const stats = await FileAttachment.aggregate([
      {
        $match: {
          uploadedBy: mongoose.Types.ObjectId(targetUserId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          avgSize: { $avg: "$fileSize" },
        },
      },
    ]);

    const totalStats = await FileAttachment.aggregate([
      {
        $match: {
          uploadedBy: mongoose.Types.ObjectId(targetUserId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          avgSize: { $avg: "$fileSize" },
        },
      },
    ]);

    res.json(
      responseFormatter.successResponse(
        {
          byCategory: stats,
          total: totalStats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 },
        },
        "Lấy thống kê upload thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Helper method to check file access permission
exports.checkFileAccess = async (user, file) => {
  // Admin có quyền truy cập tất cả
  if (user.PhanQuyen === "admin") return true;

  // Người upload luôn có quyền
  if (file.uploadedBy.toString() === user._id.toString()) return true;

  // File public
  if (file.isPublic) return true;

  // Trong danh sách accessibleBy
  if (file.accessibleBy.includes(user._id)) return true;

  // Kiểm tra quyền theo related entity
  if (file.relatedModel && file.relatedId) {
    return await this.checkEntityAccess(
      user,
      file.relatedModel,
      file.relatedId
    );
  }

  return false;
};

// Helper method to check delete permission
exports.checkFileDeleteAccess = async (user, file) => {
  // Admin có quyền xóa tất cả
  if (user.PhanQuyen === "admin") return true;

  // Người upload có quyền xóa
  if (file.uploadedBy.toString() === user._id.toString()) return true;

  // Manager có quyền xóa file trong khoa
  if (user.PhanQuyen === "manager") {
    // Logic kiểm tra file thuộc khoa
    return await this.checkFileInDepartment(user.KhoaID, file);
  }

  return false;
};

// Helper method to check entity access
exports.checkEntityAccess = async (user, entityModel, entityId) => {
  // Implementation depends on specific business rules
  // Example for AssignedTask
  if (entityModel === "AssignedTask") {
    const AssignedTask = require("../../workmanagement/models/AssignedTask");
    const task = await AssignedTask.findById(entityId);
    if (!task) return false;

    return (
      task.NguoiThucHienID.toString() === user._id.toString() ||
      task.NguoiGiaoID.toString() === user._id.toString()
    );
  }

  // Add more entity types as needed
  return false;
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  getFileDetails,
  downloadFile,
  viewFile,
  getThumbnail,
  getFilesByEntity,
  deleteFile,
  getUploadStats,
  checkFileAccess,
  checkFileDeleteAccess,
  checkEntityAccess,
};
```

### 4. Middleware cho File Upload

#### 4.1 Multer Configuration

**File mới**: `modules/filemanagement/middlewares/upload.middleware.js`

```javascript
const multer = require("multer");
const ValidationService = require("../services/validation.service");

// Memory storage for processing before saving
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const { category } = req.body;

  if (!category) {
    return cb(new Error("Category is required"), false);
  }

  const allowedTypes = ValidationService.getAllowedTypes(category);

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type ${file.mimetype} not allowed for ${category}`),
      false
    );
  }
};

// Single file upload
const singleUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (will be validated per category)
  },
}).single("file");

// Multiple files upload
const multipleUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max per file
    files: 10, // Max 10 files at once
  },
}).array("files", 10);

// Avatar upload (specific for user avatars)
const avatarUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for avatars"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for avatars
  },
}).single("avatar");

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Quá nhiều file",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Field name không đúng",
      });
    }
  }

  if (err.message) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

module.exports = {
  singleUpload,
  multipleUpload,
  avatarUpload,
  handleUploadError,
};
```

### 5. Routes cho File Management

#### 5.1 File Routes

**File mới**: `modules/filemanagement/routes/file.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const {
  authenticate,
  authorize,
} = require("../../../middlewares/authentication");
const {
  singleUpload,
  multipleUpload,
  avatarUpload,
  handleUploadError,
} = require("../middlewares/upload.middleware");

// Upload routes
router.post(
  "/upload",
  authenticate,
  singleUpload,
  handleUploadError,
  fileController.uploadFile
);

router.post(
  "/upload-multiple",
  authenticate,
  multipleUpload,
  handleUploadError,
  fileController.uploadMultipleFiles
);

router.post(
  "/upload-avatar",
  authenticate,
  avatarUpload,
  handleUploadError,
  fileController.uploadFile
);

// View/Download routes
router.get("/view/:fileName", fileController.viewFile);
router.get("/download/:fileName", fileController.downloadFile);
router.get("/thumbnail/:fileName/:size?", fileController.getThumbnail);

// File management routes
router.get("/:fileId", authenticate, fileController.getFileDetails);
router.delete("/:fileId", authenticate, fileController.deleteFile);

// Entity-related files
router.get(
  "/entity/:entityType/:entityId",
  authenticate,
  fileController.getFilesByEntity
);

// Statistics (admin only)
router.get("/stats/upload", authenticate, fileController.getUploadStats);

module.exports = router;
```

## Kết quả mong đợi Phase 9

Sau khi hoàn thành Phase 9:

1. ✅ Hệ thống quản lý file attachments hoàn chỉnh
2. ✅ Support multiple storage backends (Local, S3, Cloudinary)
3. ✅ File validation và virus scanning
4. ✅ Image thumbnail generation
5. ✅ File versioning và audit trail
6. ✅ Secure file access với permission checking
7. ✅ File upload/download logging
8. ✅ Storage statistics và monitoring
9. ✅ Integration với tất cả entities (Tasks, Tickets, KPI)

## Files cần tạo trong Phase 9

1. `modules/filemanagement/models/FileAttachment.js`
2. `modules/filemanagement/models/FileUploadLog.js`
3. `modules/filemanagement/services/storage.service.js`
4. `modules/filemanagement/services/validation.service.js`
5. `modules/filemanagement/controllers/file.controller.js`
6. `modules/filemanagement/middlewares/upload.middleware.js`
7. `modules/filemanagement/routes/file.routes.js`
8. `modules/filemanagement/tests/file.test.js`
9. Cập nhật các models hiện có để include file attachments
10. Cập nhật `routes/index.js`

## Lưu ý kỹ thuật Phase 9

- **Security**: Comprehensive file validation và virus scanning
- **Performance**: Efficient file storage và thumbnail generation
- **Scalability**: Support multiple storage backends
- **Monitoring**: File usage tracking và storage analytics
- **Cleanup**: Scheduled jobs để xóa file orphaned
- **Backup**: Implement file backup strategies
- **CDN**: Setup CDN cho file delivery optimization
