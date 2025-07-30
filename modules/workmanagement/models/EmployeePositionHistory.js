const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const employeePositionHistorySchema = Schema(
  {
    employeeId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    positionId: {
      type: Schema.ObjectId,
      required: true,
      ref: "JobPosition",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    changeReason: {
      type: String,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    collection: "employee_position_history",
  }
);

// Indexes
employeePositionHistorySchema.index({ employeeId: 1, startDate: -1 });
employeePositionHistorySchema.index({ positionId: 1 });
employeePositionHistorySchema.index({ startDate: 1, endDate: 1 });

// Methods
employeePositionHistorySchema.methods.toJSON = function () {
  const history = this._doc;
  delete history.__v;
  return history;
};

// Static methods
employeePositionHistorySchema.statics.findByEmployee = function (employeeId) {
  return this.find({ employeeId })
    .populate("positionId")
    .populate("createdBy", "fullName employeeCode")
    .sort({ startDate: -1 });
};

employeePositionHistorySchema.statics.getCurrentPosition = function (
  employeeId
) {
  return this.findOne({
    employeeId,
    endDate: null,
  }).populate("positionId");
};

const EmployeePositionHistory = mongoose.model(
  "EmployeePositionHistory",
  employeePositionHistorySchema
);
module.exports = EmployeePositionHistory;
