const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const kpiEvaluationSchema = Schema(
  {
    cycleId: {
      type: Schema.ObjectId,
      required: true,
      ref: "EvaluationCycle",
    },
    employeeId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    evaluatorId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    totalScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    normalizedScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },
    evaluatorComment: {
      type: String,
      maxlength: 2000,
    },
    employeeFeedback: {
      type: String,
      maxlength: 2000,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "kpi_evaluations",
  }
);

// Indexes
kpiEvaluationSchema.index({ cycleId: 1, employeeId: 1 }, { unique: true });
kpiEvaluationSchema.index({ cycleId: 1 });
kpiEvaluationSchema.index({ employeeId: 1 });
kpiEvaluationSchema.index({ evaluatorId: 1 });
kpiEvaluationSchema.index({ status: 1 });
kpiEvaluationSchema.index({ normalizedScore: -1 });

// Virtual for routine duty evaluations
kpiEvaluationSchema.virtual("routineDutyEvaluations", {
  ref: "RoutineDutyEvaluation",
  localField: "_id",
  foreignField: "kpiEvaluationId",
});

// Methods
kpiEvaluationSchema.methods.toJSON = function () {
  const evaluation = this._doc;
  delete evaluation.__v;
  return evaluation;
};

kpiEvaluationSchema.methods.calculateTotalScore = async function () {
  const RoutineDutyEvaluation = mongoose.model("RoutineDutyEvaluation");
  const dutyEvaluations = await RoutineDutyEvaluation.find({
    kpiEvaluationId: this._id,
  });

  this.totalScore = dutyEvaluations.reduce(
    (sum, duty) => sum + (duty.finalScore || 0),
    0
  );
  this.normalizedScore = Math.min(this.totalScore / 10, 10); // Chuẩn hóa về thang điểm 10

  return this.save();
};

kpiEvaluationSchema.methods.submit = function () {
  this.status = "SUBMITTED";
  return this.save();
};

kpiEvaluationSchema.methods.approve = function () {
  this.status = "APPROVED";
  this.approvedAt = new Date();
  return this.save();
};

kpiEvaluationSchema.methods.reject = function () {
  this.status = "REJECTED";
  this.approvedAt = null;
  return this.save();
};

kpiEvaluationSchema.methods.canEdit = function () {
  return ["DRAFT", "REJECTED"].includes(this.status);
};

// Static methods
kpiEvaluationSchema.statics.findByCycle = function (cycleId) {
  return this.find({ cycleId })
    .populate("employeeId", "fullName employeeCode")
    .populate("evaluatorId", "fullName employeeCode")
    .sort({ normalizedScore: -1 });
};

kpiEvaluationSchema.statics.findByEmployee = function (employeeId) {
  return this.find({ employeeId })
    .populate("cycleId", "name startDate endDate")
    .populate("evaluatorId", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

kpiEvaluationSchema.statics.findByEvaluator = function (evaluatorId) {
  return this.find({ evaluatorId })
    .populate("employeeId", "fullName employeeCode")
    .populate("cycleId", "name startDate endDate")
    .sort({ createdAt: -1 });
};

kpiEvaluationSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate("employeeId", "fullName employeeCode")
    .populate("evaluatorId", "fullName employeeCode")
    .populate("cycleId", "name startDate endDate")
    .sort({ createdAt: -1 });
};

kpiEvaluationSchema.statics.getTopPerformers = function (cycleId, limit = 10) {
  return this.find({
    cycleId,
    status: "APPROVED",
  })
    .populate("employeeId", "fullName employeeCode")
    .sort({ normalizedScore: -1 })
    .limit(limit);
};

kpiEvaluationSchema.statics.getAverageScore = function (cycleId) {
  return this.aggregate([
    {
      $match: {
        cycleId: new mongoose.Types.ObjectId(cycleId),
        status: "APPROVED",
      },
    },
    { $group: { _id: null, avgScore: { $avg: "$normalizedScore" } } },
  ]);
};

kpiEvaluationSchema.statics.getScoreDistribution = function (cycleId) {
  return this.aggregate([
    {
      $match: {
        cycleId: new mongoose.Types.ObjectId(cycleId),
        status: "APPROVED",
      },
    },
    {
      $bucket: {
        groupBy: "$normalizedScore",
        boundaries: [0, 2, 4, 6, 8, 10],
        default: "Other",
        output: {
          count: { $sum: 1 },
          employees: { $push: "$employeeId" },
        },
      },
    },
  ]);
};

const KpiEvaluation = mongoose.model("KpiEvaluation", kpiEvaluationSchema);
module.exports = KpiEvaluation;
