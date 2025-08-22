const mongoose = require("mongoose");
const { Schema } = mongoose;

const WorkColorConfigSchema = new Schema(
  {
    scope: { type: String, default: "GLOBAL", index: true, unique: true },
    statusColors: { type: Schema.Types.Mixed, default: {} },
    priorityColors: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "work_color_configs" }
);

module.exports = mongoose.model("WorkColorConfig", WorkColorConfigSchema);
