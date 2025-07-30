const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const routineDutyEvaluationSchema = Schema(
  {
    kpiEvaluationId: {
      type: Schema.ObjectId,
      required: true,
      ref: "KpiEvaluation",
    },
    routineDutyId: {
      type: Schema.ObjectId,
      required: true,
      ref: "RoutineDuty",
    },
    difficultyScore: {
      type: Number,
      min: 1,
      max: 10,
    },
    finalScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    evaluatorNote: {
      type: String,
      maxlength: 2000,
    },
    tasksCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    ticketsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "routine_duty_evaluations",
  }
);

// Indexes
routineDutyEvaluationSchema.index(
  { kpiEvaluationId: 1, routineDutyId: 1 },
  { unique: true }
);
routineDutyEvaluationSchema.index({ kpiEvaluationId: 1 });
routineDutyEvaluationSchema.index({ routineDutyId: 1 });

// Virtual for criteria scores
routineDutyEvaluationSchema.virtual("criteriaScores", {
  ref: "CriteriaScore",
  localField: "_id",
  foreignField: "routineDutyEvaluationId",
});

// Methods
routineDutyEvaluationSchema.methods.toJSON = function () {
  const evaluation = this._doc;
  delete evaluation.__v;
  return evaluation;
};

routineDutyEvaluationSchema.methods.calculateFinalScore = async function () {
  const CriteriaScore = mongoose.model("CriteriaScore");
  const criteriaScores = await CriteriaScore.find({
    routineDutyEvaluationId: this._id,
  }).populate("criteriaId");

  let totalCriteriaScore = 0;
  let totalWeight = 0;

  for (const criteria of criteriaScores) {
    const weightedScore = criteria.score * criteria.weight;
    if (criteria.criteriaId.criteriaType === "INCREASE") {
      totalCriteriaScore += weightedScore;
    } else {
      totalCriteriaScore -= weightedScore;
    }
    totalWeight += criteria.weight;
  }

  // Tính điểm trung bình theo trọng số
  const avgCriteriaScore =
    totalWeight > 0 ? totalCriteriaScore / totalWeight : 0;

  // Điểm cuối = độ khó × điểm trung bình tiêu chí
  this.finalScore = (this.difficultyScore || 5) * Math.max(0, avgCriteriaScore);

  return this.save();
};

routineDutyEvaluationSchema.methods.updateActivityCounts = async function () {
  const AssignedTask = mongoose.model("AssignedTask");
  const Ticket = mongoose.model("Ticket");
  const KpiEvaluation = mongoose.model("KpiEvaluation");

  // Lấy thông tin chu kỳ đánh giá
  const kpiEval = await KpiEvaluation.findById(this.kpiEvaluationId).populate(
    "cycleId"
  );

  if (kpiEval && kpiEval.cycleId) {
    const { startDate, endDate } = kpiEval.cycleId;

    // Đếm số task và ticket trong chu kỳ
    this.tasksCount = await AssignedTask.countDocuments({
      routineDutyId: this.routineDutyId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    this.ticketsCount = await Ticket.countDocuments({
      routineDutyId: this.routineDutyId,
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }

  return this.save();
};

// Static methods
routineDutyEvaluationSchema.statics.findByKpiEvaluation = function (
  kpiEvaluationId
) {
  return this.find({ kpiEvaluationId })
    .populate("routineDutyId", "name difficultyLevel")
    .sort({ finalScore: -1 });
};

routineDutyEvaluationSchema.statics.findByRoutineDuty = function (
  routineDutyId
) {
  return this.find({ routineDutyId })
    .populate({
      path: "kpiEvaluationId",
      populate: {
        path: "employeeId cycleId",
        select: "fullName employeeCode name startDate endDate",
      },
    })
    .sort({ createdAt: -1 });
};

routineDutyEvaluationSchema.statics.getAverageScoreByDuty = function (
  routineDutyId
) {
  return this.aggregate([
    { $match: { routineDutyId: new mongoose.Types.ObjectId(routineDutyId) } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$finalScore" },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save middleware
routineDutyEvaluationSchema.pre("save", async function (next) {
  // Lấy difficulty score từ routine duty nếu chưa có
  if (!this.difficultyScore && this.routineDutyId) {
    const RoutineDuty = mongoose.model("RoutineDuty");
    const duty = await RoutineDuty.findById(this.routineDutyId);
    if (duty) {
      this.difficultyScore = duty.difficultyLevel;
    }
  }

  next();
});

const RoutineDutyEvaluation = mongoose.model(
  "RoutineDutyEvaluation",
  routineDutyEvaluationSchema
);
module.exports = RoutineDutyEvaluation;
