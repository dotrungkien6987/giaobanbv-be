/**
 * Script to rename MucDoKho -> MucDoKhoDefault in NhiemVuThuongQuy references
 * Run: node scripts/rename-mucdokho-to-default.js
 */

const fs = require("fs");
const path = require("path");

const files = [
  "modules/workmanagement/controllers/kpi.controller.js",
  "modules/workmanagement/models/DanhGiaNhiemVuThuongQuy.js",
];

const replacements = [
  // Pattern 1: .MucDoKho trong context NhiemVuThuongQuyID
  {
    pattern: /NhiemVuThuongQuyID\.MucDoKho/g,
    replacement: "NhiemVuThuongQuyID.MucDoKhoDefault",
  },
  // Pattern 2: Populate select string
  {
    pattern: /"TenNhiemVu MoTa MucDoKho"/g,
    replacement: '"TenNhiemVu MoTa MucDoKhoDefault"',
  },
  // Pattern 3: Select string without quotes
  {
    pattern: /select: "TenNhiemVu MoTa MucDoKho"/g,
    replacement: 'select: "TenNhiemVu MoTa MucDoKhoDefault"',
  },
];

files.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  replacements.forEach((rep) => {
    if (rep.pattern.test(content)) {
      content = content.replace(rep.pattern, rep.replacement);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`ℹ️  No changes: ${file}`);
  }
});

console.log("\n✅ Rename script completed!");
console.log(
  '⚠️  NOTE: You still need to manually drop old index "MucDoKho_1" in MongoDB'
);
console.log('   Run in mongosh: db.nhiemvuthuongquy.dropIndex("MucDoKho_1")');
