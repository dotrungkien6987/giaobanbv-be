const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketSchema = Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      maxlength: 5000,
    },
    categoryId: {
      type: Schema.ObjectId,
      required: true,
      ref: "TicketCategory",
    },
    routineDutyId: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy", // refactor: dùng model hiện có
    },
    requesterId: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien", // refactor: dùng model hiện có
    },
    handlerId: {
      type: Schema.ObjectId,
      ref: "NhanVien", // refactor: dùng model hiện có
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: [
        "NEW",
        "ASSIGNED",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "WAITING_FEEDBACK",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
      ],
      default: "NEW",
    },
    location: {
      type: String,
      maxlength: 255,
    },
    expectedResolveTime: {
      type: Date,
    },
    actualResolveTime: {
      type: Date,
    },
    slaHours: {
      type: Number,
      min: 1,
    },
    isOverdue: {
      type: Boolean,
      default: false,
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    satisfactionComment: {
      type: String,
      maxlength: 1000,
    },
    resolutionNote: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "tickets",
  }
);

// Indexes
ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ title: 1 });
ticketSchema.index({ categoryId: 1 });
ticketSchema.index({ routineDutyId: 1 });
ticketSchema.index({ requesterId: 1 });
ticketSchema.index({ handlerId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ isOverdue: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ handlerId: 1, status: 1 });

// Legacy virtuals (comments/files) đã được gỡ bỏ để tránh phụ thuộc model cũ (Comment/FileAttachment)

// Methods
ticketSchema.methods.toJSON = function () {
  const ticket = this._doc;
  delete ticket.__v;
  return ticket;
};

ticketSchema.methods.generateTicketNumber = function () {
  const year = new Date().getFullYear();
  const prefix = `TK${year}`;
  return this.constructor
    .countDocuments({
      ticketNumber: { $regex: `^${prefix}` },
    })
    .then((count) => {
      this.ticketNumber = `${prefix}${String(count + 1).padStart(6, "0")}`;
      return this;
    });
};

ticketSchema.methods.calculateSLA = function () {
  if (this.categoryId && this.categoryId.defaultSlaHours) {
    this.slaHours = this.categoryId.defaultSlaHours;
    this.expectedResolveTime = new Date(
      this.createdAt.getTime() + this.slaHours * 60 * 60 * 1000
    );
  }
};

ticketSchema.methods.checkOverdue = function () {
  if (
    this.expectedResolveTime &&
    new Date() > this.expectedResolveTime &&
    !["RESOLVED", "CLOSED"].includes(this.status)
  ) {
    this.isOverdue = true;
  }
  return this.isOverdue;
};

ticketSchema.methods.canEdit = function () {
  return !["RESOLVED", "CLOSED"].includes(this.status);
};

ticketSchema.methods.canReopen = function () {
  return ["RESOLVED", "CLOSED"].includes(this.status);
};

// Static methods
ticketSchema.statics.findByCategory = function (categoryId) {
  return this.find({ categoryId })
    .populate("requesterId", "fullName employeeCode")
    .populate("handlerId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
};

ticketSchema.statics.findByRequester = function (requesterId) {
  return this.find({ requesterId })
    .populate("handlerId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
};

ticketSchema.statics.findByHandler = function (handlerId) {
  return this.find({ handlerId })
    .populate("requesterId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
};

ticketSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate("requesterId", "fullName employeeCode")
    .populate("handlerId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
};

ticketSchema.statics.findOverdue = function () {
  return this.find({ isOverdue: true })
    .populate("requesterId", "fullName employeeCode")
    .populate("handlerId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ expectedResolveTime: 1 });
};

ticketSchema.statics.findByRoutineDuty = function (routineDutyId) {
  return this.find({ routineDutyId })
    .populate("requesterId", "fullName employeeCode")
    .populate("handlerId", "fullName employeeCode")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 });
};

ticketSchema.statics.getStatsByHandler = function (
  handlerId,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        handlerId: new mongoose.Types.ObjectId(handlerId),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $and: ["$actualResolveTime", "$createdAt"] },
              { $subtract: ["$actualResolveTime", "$createdAt"] },
              null,
            ],
          },
        },
      },
    },
  ]);
};

// Pre-save middleware
ticketSchema.pre("save", async function (next) {
  // Generate ticket number if new
  if (this.isNew && !this.ticketNumber) {
    await this.generateTicketNumber();
  }

  // Calculate SLA if not set
  if (this.isNew && !this.slaHours) {
    await this.populate("categoryId");
    this.calculateSLA();
  }

  // Check overdue status
  this.checkOverdue();

  // Set actual resolve time when status changes to RESOLVED
  if (
    this.isModified("status") &&
    this.status === "RESOLVED" &&
    !this.actualResolveTime
  ) {
    this.actualResolveTime = new Date();
  }

  next();
});

const Ticket = mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;
