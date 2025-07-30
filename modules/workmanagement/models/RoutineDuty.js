const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const routineDutySchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    departmentId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Department",
    },
    difficultyLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    collection: "routine_duties",
  }
);

// Indexes
routineDutySchema.index({ name: 1 });
routineDutySchema.index({ departmentId: 1 });
routineDutySchema.index({ isActive: 1 });
routineDutySchema.index({ departmentId: 1, isActive: 1 });
routineDutySchema.index({ difficultyLevel: 1 });

// Virtual for positions assigned to this duty
routineDutySchema.virtual("assignedPositions", {
  ref: "PositionRoutineDuty",
  localField: "_id",
  foreignField: "routineDutyId",
});

// Virtual for tasks related to this duty
routineDutySchema.virtual("relatedTasks", {
  ref: "AssignedTask",
  localField: "_id",
  foreignField: "routineDutyId",
});

// Virtual for tickets related to this duty
routineDutySchema.virtual("relatedTickets", {
  ref: "Ticket",
  localField: "_id",
  foreignField: "routineDutyId",
});

// Methods
routineDutySchema.methods.toJSON = function () {
  const duty = this._doc;
  delete duty.__v;
  return duty;
};

// Static methods
routineDutySchema.statics.findByDepartment = function (departmentId) {
  return this.find({ departmentId, isActive: true })
    .populate("departmentId", "name code")
    .sort({ name: 1 });
};

routineDutySchema.statics.findActive = function () {
  return this.find({ isActive: true })
    .populate("departmentId", "name code")
    .populate("createdBy", "fullName employeeCode")
    .sort({ departmentId: 1, name: 1 });
};

routineDutySchema.statics.findByDifficulty = function (minLevel, maxLevel) {
  return this.find({
    isActive: true,
    difficultyLevel: { $gte: minLevel, $lte: maxLevel },
  }).sort({ difficultyLevel: 1, name: 1 });
};

const RoutineDuty = mongoose.model("RoutineDuty", routineDutySchema);
module.exports = RoutineDuty;
