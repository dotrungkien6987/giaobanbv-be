const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const positionRoutineDutySchema = Schema(
  {
    positionId: {
      type: Schema.ObjectId,
      required: true,
      ref: "JobPosition",
    },
    routineDutyId: {
      type: Schema.ObjectId,
      required: true,
      ref: "RoutineDuty",
    },
    weightPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "position_routine_duties",
  }
);

// Indexes
positionRoutineDutySchema.index(
  { positionId: 1, routineDutyId: 1 },
  { unique: true }
);
positionRoutineDutySchema.index({ positionId: 1 });
positionRoutineDutySchema.index({ routineDutyId: 1 });
positionRoutineDutySchema.index({ isActive: 1 });

// Methods
positionRoutineDutySchema.methods.toJSON = function () {
  const assignment = this._doc;
  delete assignment.__v;
  return assignment;
};

// Static methods
positionRoutineDutySchema.statics.findByPosition = function (positionId) {
  return this.find({ positionId, isActive: true })
    .populate("routineDutyId")
    .sort({ assignedDate: -1 });
};

positionRoutineDutySchema.statics.findByRoutineDuty = function (routineDutyId) {
  return this.find({ routineDutyId, isActive: true })
    .populate("positionId")
    .sort({ assignedDate: -1 });
};

positionRoutineDutySchema.statics.findActive = function () {
  return this.find({ isActive: true })
    .populate("positionId")
    .populate("routineDutyId")
    .sort({ assignedDate: -1 });
};

// Validation
positionRoutineDutySchema.pre("save", async function (next) {
  // Kiểm tra tổng weight của các routine duties cho 1 position không vượt quá 100%
  if (this.isNew || this.isModified("weightPercentage")) {
    const totalWeight = await this.constructor.aggregate([
      {
        $match: {
          positionId: this.positionId,
          isActive: true,
          _id: { $ne: this._id },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$weightPercentage" },
        },
      },
    ]);

    const currentTotal = totalWeight.length > 0 ? totalWeight[0].total : 0;
    if (currentTotal + this.weightPercentage > 100) {
      const error = new Error(
        `Tổng tỷ trọng không được vượt quá 100%. Hiện tại: ${currentTotal}%, đang thêm: ${this.weightPercentage}%`
      );
      error.name = "ValidationError";
      return next(error);
    }
  }
  next();
});

const PositionRoutineDuty = mongoose.model(
  "PositionRoutineDuty",
  positionRoutineDutySchema
);
module.exports = PositionRoutineDuty;
