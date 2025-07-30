const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const evaluationCycleSchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    cycleType: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
      default: "MONTHLY",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "EVALUATION", "COMPLETED"],
      default: "PLANNING",
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    createdBy: {
      type: Schema.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    collection: "evaluation_cycles",
  }
);

// Indexes
evaluationCycleSchema.index({ startDate: 1, endDate: 1 });
evaluationCycleSchema.index({ status: 1 });
evaluationCycleSchema.index({ cycleType: 1 });
evaluationCycleSchema.index({ name: 1 });

// Virtual for evaluations in this cycle
evaluationCycleSchema.virtual("evaluations", {
  ref: "KpiEvaluation",
  localField: "_id",
  foreignField: "cycleId",
});

// Methods
evaluationCycleSchema.methods.toJSON = function () {
  const cycle = this._doc;
  delete cycle.__v;
  return cycle;
};

evaluationCycleSchema.methods.isActive = function () {
  const now = new Date();
  return (
    this.status === "ACTIVE" && this.startDate <= now && this.endDate >= now
  );
};

evaluationCycleSchema.methods.isCompleted = function () {
  return this.status === "COMPLETED";
};

evaluationCycleSchema.methods.canEdit = function () {
  return ["PLANNING", "ACTIVE"].includes(this.status);
};

// Static methods
evaluationCycleSchema.statics.findActive = function () {
  return this.findOne({
    status: "ACTIVE",
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });
};

evaluationCycleSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate("createdBy", "fullName employeeCode")
    .sort({ startDate: -1 });
};

evaluationCycleSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ],
  }).sort({ startDate: -1 });
};

evaluationCycleSchema.statics.getCurrentCycle = function () {
  const now = new Date();
  return this.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ startDate: -1 });
};

// Validation
evaluationCycleSchema.pre("save", function (next) {
  if (this.startDate >= this.endDate) {
    const error = new Error("Ngày kết thúc phải lớn hơn ngày bắt đầu");
    error.name = "ValidationError";
    return next(error);
  }
  next();
});

const EvaluationCycle = mongoose.model(
  "EvaluationCycle",
  evaluationCycleSchema
);
module.exports = EvaluationCycle;
