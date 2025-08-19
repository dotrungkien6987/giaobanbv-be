const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'congviec'
    seq: { type: Number, default: 0 },
    description: { type: String },
  },
  {
    collection: "counters",
  }
);

module.exports = mongoose.model("Counter", counterSchema);
