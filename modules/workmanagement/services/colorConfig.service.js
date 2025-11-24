const WorkColorConfig = require("../models/WorkColorConfig");

async function getConfig() {
  let doc = await WorkColorConfig.findOne({ scope: "GLOBAL" })
    .populate("updatedBy", "HoTen MaNhanVien")
    .lean();
  if (!doc) {
    doc = await WorkColorConfig.create({ scope: "GLOBAL" });
    doc = await WorkColorConfig.findById(doc._id)
      .populate("updatedBy", "HoTen MaNhanVien")
      .lean();
  }
  return {
    statusColors: doc.statusColors || {},
    priorityColors: doc.priorityColors || {},
    dueStatusColors: doc.dueStatusColors || {},
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  };
}

async function updateConfig(
  { statusColors, priorityColors, dueStatusColors },
  userId
) {
  const update = {};
  if (statusColors) update.statusColors = statusColors;
  if (priorityColors) update.priorityColors = priorityColors;
  if (dueStatusColors) update.dueStatusColors = dueStatusColors;
  if (userId) update.updatedBy = userId;

  const doc = await WorkColorConfig.findOneAndUpdate(
    { scope: "GLOBAL" },
    { $set: update },
    { new: true, upsert: true }
  )
    .populate("updatedBy", "HoTen MaNhanVien")
    .lean();

  return {
    statusColors: doc.statusColors || {},
    priorityColors: doc.priorityColors || {},
    dueStatusColors: doc.dueStatusColors || {},
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  };
}

module.exports = { getConfig, updateConfig };
