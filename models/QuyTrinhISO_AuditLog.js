const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quyTrinhISO_AuditLogSchema = new Schema(
  {
    QuyTrinhISOID: {
      type: Schema.Types.ObjectId,
      ref: "QuyTrinhISO",
      required: true,
      index: true,
    },
    HanhDong: {
      type: String,
      enum: [
        "CREATED",
        "UPDATED",
        "ACTIVATED",
        "DEACTIVATED",
        "DELETED",
        "DISTRIBUTION_UPDATED",
        "FILES_COPIED",
      ],
      required: true,
    },
    NguoiThucHienID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ChiTiet: {
      type: Schema.Types.Mixed,
    },
    ThoiGian: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "quytrinhiso_auditlog",
  },
);

const QuyTrinhISO_AuditLog = mongoose.model(
  "QuyTrinhISO_AuditLog",
  quyTrinhISO_AuditLogSchema,
);

module.exports = QuyTrinhISO_AuditLog;
