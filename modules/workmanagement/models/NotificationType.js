const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * NotificationType - Định nghĩa loại thông báo và các biến có sẵn
 * Admin config trong database, không hardcode trong code
 */
const notificationTypeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    }, // 'yeucau-tao-moi', 'congviec-giao-viec'

    name: {
      type: String,
      required: true,
    }, // 'Thông báo tạo yêu cầu mới'

    description: {
      type: String,
    }, // Mô tả chi tiết cho admin

    Nhom: {
      type: String,
      enum: ["Công việc", "Yêu cầu", "KPI", "Hệ thống"],
      required: true,
      index: true,
    }, // Nhóm phân loại: Công việc, Yêu cầu, KPI, Hệ thống

    // Định nghĩa các biến có sẵn cho type này
    variables: [
      {
        name: {
          type: String,
          required: true,
        }, // 'NguoiYeuCauID', 'arrNguoiDieuPhoiID', 'MaYeuCau'

        type: {
          type: String,
          enum: [
            "String",
            "Number",
            "Boolean",
            "Date",
            "ObjectId",
            "Array",
            "Object",
          ],
          required: true,
        },

        itemType: {
          type: String,
        }, // For Array type: 'ObjectId', 'String'

        ref: {
          type: String,
        }, // Model reference: 'NhanVien', 'Khoa'

        description: {
          type: String,
        },

        // Đánh dấu biến này có thể được chọn làm người nhận
        isRecipientCandidate: {
          type: Boolean,
          default: false,
        },

        _id: false,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "notificationtypes",
  }
);

// Indexes
notificationTypeSchema.index({ code: 1 });
notificationTypeSchema.index({ isActive: 1 });
notificationTypeSchema.index({ Nhom: 1 });

// Methods

/**
 * Lấy danh sách biến có thể làm recipient
 */
notificationTypeSchema.methods.getRecipientCandidates = function () {
  return this.variables.filter((v) => v.isRecipientCandidate);
};

/**
 * Validate data có chứa đủ các biến cần thiết không
 */
notificationTypeSchema.methods.validateData = function (data) {
  const missingVars = [];
  const requiredVars = this.variables.filter((v) => v.isRecipientCandidate);

  for (const variable of requiredVars) {
    if (!(variable.name in data)) {
      missingVars.push(variable.name);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Statics

/**
 * Lấy type theo code (với cache logic sẽ ở service layer)
 */
notificationTypeSchema.statics.findByCode = async function (code) {
  return this.findOne({ code: code.toLowerCase(), isActive: true }).lean();
};

/**
 * Lấy tất cả types active
 */
notificationTypeSchema.statics.getAllActive = async function () {
  return this.find({ isActive: true }).sort({ name: 1 }).lean();
};

const NotificationType = mongoose.model(
  "NotificationType",
  notificationTypeSchema
);

module.exports = NotificationType;
