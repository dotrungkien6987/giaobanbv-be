const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileSchema = Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    storedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    filePath: {
      type: String,
      required: true,
      maxlength: 500,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      maxlength: 100,
    },
    fileExtension: {
      type: String,
      maxlength: 10,
    },
    uploadedBy: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    collection: "files",
  }
);

// Indexes
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ originalName: 1 });
fileSchema.index({ fileExtension: 1 });
fileSchema.index({ createdAt: -1 });

// Methods
fileSchema.methods.toJSON = function () {
  const file = this._doc;
  delete file.__v;
  return file;
};

fileSchema.methods.getFileUrl = function () {
  return `/uploads/${this.storedName}`;
};

fileSchema.methods.isImage = function () {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  return imageExts.includes(this.fileExtension.toLowerCase());
};

fileSchema.methods.isDocument = function () {
  const docExts = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
  return docExts.includes(this.fileExtension.toLowerCase());
};

// Static methods
fileSchema.statics.findByUploader = function (uploadedBy) {
  return this.find({ uploadedBy })
    .populate("uploadedBy", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

fileSchema.statics.findByType = function (fileExtensions) {
  return this.find({
    fileExtension: { $in: fileExtensions.map((ext) => ext.toLowerCase()) },
  })
    .populate("uploadedBy", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

const File = mongoose.model("File", fileSchema);

// FileAttachment Schema
const fileAttachmentSchema = Schema(
  {
    fileId: {
      type: Schema.ObjectId,
      required: true,
      ref: "File",
    },
    attachableType: {
      type: String,
      enum: ["TASK", "TICKET", "COMMENT", "EVALUATION"],
      required: true,
    },
    attachableId: {
      type: Schema.ObjectId,
      required: true,
    },
    attachedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "file_attachments",
  }
);

// Indexes
fileAttachmentSchema.index({ fileId: 1 });
fileAttachmentSchema.index({ attachableType: 1, attachableId: 1 });
fileAttachmentSchema.index({ attachedAt: -1 });

// Methods
fileAttachmentSchema.methods.toJSON = function () {
  const attachment = this._doc;
  delete attachment.__v;
  return attachment;
};

// Static methods
fileAttachmentSchema.statics.findByAttachable = function (
  attachableType,
  attachableId
) {
  return this.find({ attachableType, attachableId })
    .populate("fileId")
    .sort({ attachedAt: -1 });
};

fileAttachmentSchema.statics.findByFile = function (fileId) {
  return this.find({ fileId }).sort({ attachedAt: -1 });
};

const FileAttachment = mongoose.model("FileAttachment", fileAttachmentSchema);

module.exports = { File, FileAttachment };
