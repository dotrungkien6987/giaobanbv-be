const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const taskAssigneeSchema = Schema(
  {
    taskId: {
      type: Schema.ObjectId,
      required: true,
      ref: "AssignedTask",
    },
    employeeId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    role: {
      type: String,
      enum: ["ASSIGNEE", "COLLABORATOR"],
      default: "ASSIGNEE",
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
    rejectReason: {
      type: String,
      maxlength: 1000,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "task_assignees",
  }
);

// Indexes
taskAssigneeSchema.index({ taskId: 1, employeeId: 1 }, { unique: true });
taskAssigneeSchema.index({ taskId: 1 });
taskAssigneeSchema.index({ employeeId: 1 });
taskAssigneeSchema.index({ status: 1 });
taskAssigneeSchema.index({ employeeId: 1, status: 1 });

// Methods
taskAssigneeSchema.methods.toJSON = function () {
  const assignee = this._doc;
  delete assignee.__v;
  return assignee;
};

taskAssigneeSchema.methods.accept = function () {
  this.status = "ACCEPTED";
  this.respondedAt = new Date();
  this.rejectReason = undefined;
  return this.save();
};

taskAssigneeSchema.methods.reject = function (reason) {
  this.status = "REJECTED";
  this.respondedAt = new Date();
  this.rejectReason = reason;
  return this.save();
};

// Static methods
taskAssigneeSchema.statics.findByTask = function (taskId) {
  return this.find({ taskId })
    .populate("employeeId", "fullName employeeCode email")
    .sort({ assignedAt: 1 });
};

taskAssigneeSchema.statics.findByEmployee = function (employeeId) {
  return this.find({ employeeId }).populate("taskId").sort({ assignedAt: -1 });
};

taskAssigneeSchema.statics.findPendingByEmployee = function (employeeId) {
  return this.find({ employeeId, status: "PENDING" })
    .populate("taskId")
    .sort({ assignedAt: -1 });
};

taskAssigneeSchema.statics.findAcceptedByEmployee = function (employeeId) {
  return this.find({ employeeId, status: "ACCEPTED" })
    .populate("taskId")
    .sort({ assignedAt: -1 });
};

taskAssigneeSchema.statics.getEmployeeTaskStats = function (
  employeeId,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        assignedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

const TaskAssignee = mongoose.model("TaskAssignee", taskAssigneeSchema);
module.exports = TaskAssignee;
