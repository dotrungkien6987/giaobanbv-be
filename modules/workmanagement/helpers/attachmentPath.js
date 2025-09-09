const path = require("path");

function safeName(name = "file") {
  return (
    String(name)
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "file"
  );
}

function buildRelKey({
  ownerType,
  ownerId,
  field = "default",
  originalName,
  date = new Date(),
}) {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1)
    .toString()
    .padStart(2, "0");
  return path.join(
    "attachments",
    String(ownerType || "unknown").toLowerCase(),
    String(ownerId || "unknown"),
    String(field || "default").toLowerCase(),
    y,
    m,
    safeName(originalName)
  );
}

module.exports = { buildRelKey, safeName };
