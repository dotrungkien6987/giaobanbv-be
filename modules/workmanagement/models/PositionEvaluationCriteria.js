const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const positionEvaluationCriteriaSchema = Schema(
  {
    positionId: {
      type: Schema.ObjectId,
      required: true,
      ref: "JobPosition",
    },
    criteriaId: {
      type: Schema.ObjectId,
      required: true,
      ref: "EvaluationCriteria",
    },
    weight: {
      type: Number,
      min: 0,
      default: 1.0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "position_evaluation_criteria",
  }
);

// Indexes
positionEvaluationCriteriaSchema.index(
  { positionId: 1, criteriaId: 1 },
  { unique: true }
);
positionEvaluationCriteriaSchema.index({ positionId: 1 });
positionEvaluationCriteriaSchema.index({ criteriaId: 1 });
positionEvaluationCriteriaSchema.index({ isActive: 1 });

// Methods
positionEvaluationCriteriaSchema.methods.toJSON = function () {
  const criteria = this._doc;
  delete criteria.__v;
  return criteria;
};

// Static methods
positionEvaluationCriteriaSchema.statics.findByPosition = function (
  positionId
) {
  return this.find({ positionId, isActive: true })
    .populate("criteriaId")
    .sort({ "criteriaId.name": 1 });
};

positionEvaluationCriteriaSchema.statics.findByCriteria = function (
  criteriaId
) {
  return this.find({ criteriaId, isActive: true })
    .populate("positionId")
    .sort({ "positionId.name": 1 });
};

positionEvaluationCriteriaSchema.statics.getPositionCriteriaWeights = function (
  positionId
) {
  return this.find({ positionId, isActive: true })
    .populate("criteriaId", "name criteriaType minValue maxValue")
    .select("criteriaId weight")
    .sort({ weight: -1 });
};

const PositionEvaluationCriteria = mongoose.model(
  "PositionEvaluationCriteria",
  positionEvaluationCriteriaSchema
);
module.exports = PositionEvaluationCriteria;
