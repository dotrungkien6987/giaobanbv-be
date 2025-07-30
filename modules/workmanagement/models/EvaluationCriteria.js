const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const evaluationCriteriaSchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    criteriaType: {
      type: String,
      enum: ["INCREASE", "DECREASE"],
      default: "INCREASE",
    },
    minValue: {
      type: Number,
      default: 0,
    },
    maxValue: {
      type: Number,
      default: 10,
    },
    defaultWeight: {
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
    collection: "evaluation_criteria",
  }
);

// Indexes
evaluationCriteriaSchema.index({ name: 1 });
evaluationCriteriaSchema.index({ criteriaType: 1 });
evaluationCriteriaSchema.index({ isActive: 1 });

// Virtual for positions using this criteria
evaluationCriteriaSchema.virtual("positionsUsing", {
  ref: "PositionEvaluationCriteria",
  localField: "_id",
  foreignField: "criteriaId",
});

// Methods
evaluationCriteriaSchema.methods.toJSON = function () {
  const criteria = this._doc;
  delete criteria.__v;
  return criteria;
};

evaluationCriteriaSchema.methods.validateScore = function (score) {
  return score >= this.minValue && score <= this.maxValue;
};

// Static methods
evaluationCriteriaSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

evaluationCriteriaSchema.statics.findByType = function (type) {
  return this.find({ criteriaType: type, isActive: true }).sort({ name: 1 });
};

evaluationCriteriaSchema.statics.getDefaultCriteria = function () {
  return this.find({ isActive: true }).select(
    "name defaultWeight criteriaType minValue maxValue"
  );
};

const EvaluationCriteria = mongoose.model(
  "EvaluationCriteria",
  evaluationCriteriaSchema
);
module.exports = EvaluationCriteria;
