const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const criteriaScoreSchema = Schema(
  {
    routineDutyEvaluationId: {
      type: Schema.ObjectId,
      required: true,
      ref: "RoutineDutyEvaluation",
    },
    criteriaId: {
      type: Schema.ObjectId,
      required: true,
      ref: "EvaluationCriteria",
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    weightedScore: {
      type: Number,
      default: function () {
        return this.score * this.weight;
      },
    },
    note: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "criteria_scores",
  }
);

// Indexes
criteriaScoreSchema.index(
  { routineDutyEvaluationId: 1, criteriaId: 1 },
  { unique: true }
);
criteriaScoreSchema.index({ routineDutyEvaluationId: 1 });
criteriaScoreSchema.index({ criteriaId: 1 });

// Methods
criteriaScoreSchema.methods.toJSON = function () {
  const score = this._doc;
  delete score.__v;
  return score;
};

// Pre-save middleware to calculate weighted score
criteriaScoreSchema.pre("save", function (next) {
  this.weightedScore = this.score * this.weight;
  next();
});

// Validation
criteriaScoreSchema.pre("save", async function (next) {
  // Validate score against criteria min/max values
  if (this.isNew || this.isModified("score") || this.isModified("criteriaId")) {
    const EvaluationCriteria = mongoose.model("EvaluationCriteria");
    const criteria = await EvaluationCriteria.findById(this.criteriaId);

    if (criteria) {
      if (this.score < criteria.minValue || this.score > criteria.maxValue) {
        const error = new Error(
          `Điểm ${this.score} không hợp lệ cho tiêu chí "${criteria.name}". ` +
            `Phạm vi cho phép: ${criteria.minValue} - ${criteria.maxValue}`
        );
        error.name = "ValidationError";
        return next(error);
      }
    }
  }
  next();
});

// Static methods
criteriaScoreSchema.statics.findByRoutineDutyEvaluation = function (
  routineDutyEvaluationId
) {
  return this.find({ routineDutyEvaluationId })
    .populate("criteriaId", "name criteriaType minValue maxValue")
    .sort({ "criteriaId.name": 1 });
};

criteriaScoreSchema.statics.findByCriteria = function (criteriaId) {
  return this.find({ criteriaId })
    .populate({
      path: "routineDutyEvaluationId",
      populate: {
        path: "kpiEvaluationId",
        populate: {
          path: "employeeId cycleId",
          select: "fullName employeeCode name startDate endDate",
        },
      },
    })
    .sort({ score: -1 });
};

criteriaScoreSchema.statics.getAverageScoreByCriteria = function (criteriaId) {
  return this.aggregate([
    { $match: { criteriaId: new mongoose.Types.ObjectId(criteriaId) } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$score" },
        avgWeightedScore: { $avg: "$weightedScore" },
        count: { $sum: 1 },
      },
    },
  ]);
};

criteriaScoreSchema.statics.getScoreDistribution = function (criteriaId) {
  return this.aggregate([
    { $match: { criteriaId: new mongoose.Types.ObjectId(criteriaId) } },
    {
      $group: {
        _id: "$score",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const CriteriaScore = mongoose.model("CriteriaScore", criteriaScoreSchema);
module.exports = CriteriaScore;
