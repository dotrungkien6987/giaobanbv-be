/**
 * Manual Test Script for Criteria Sync Helpers
 *
 * Run: node test-criteriaSync.js
 */

const {
  detectCriteriaChanges,
  mergeCriteriaWithPreservedScores,
  formatSyncWarningMessage,
} = require("./modules/workmanagement/helpers/criteriaSync.helper");

console.log("========================================");
console.log("🧪 Testing Criteria Sync Helper Functions");
console.log("========================================\n");

// Test Data
const currentCriteria = [
  {
    TenTieuChi: "Chất lượng",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    DiemDat: 85,
    GhiChu: "Tốt",
  },
  {
    TenTieuChi: "Tiến độ",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    DiemDat: 90,
    GhiChu: "Hoàn thành đúng hạn",
  },
  {
    TenTieuChi: "Vi phạm cũ",
    LoaiTieuChi: "GIAM_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 50,
    DonVi: "lần",
    DiemDat: 5,
    GhiChu: "2 lần trễ họp",
  },
];

const chuKyCriteria = [
  {
    TenTieuChi: "Chất lượng",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 50, // ← CHANGED: was 100
    DonVi: "%",
    ThuTu: 0,
  },
  {
    TenTieuChi: "Tiến độ",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    ThuTu: 1,
  },
  {
    TenTieuChi: "Sáng tạo", // ← NEW
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    ThuTu: 2,
  },
  {
    TenTieuChi: "Đổi mới", // ← NEW
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    ThuTu: 3,
  },
  // NOTE: "Vi phạm cũ" removed
];

// ==================== TEST 1: Detection ====================
console.log("📋 TEST 1: detectCriteriaChanges()");
console.log("-------------------------------------------");

const detection = detectCriteriaChanges(currentCriteria, chuKyCriteria);

console.log("hasChanges:", detection.hasChanges);
console.log("Added:", detection.changes.added);
console.log("Removed:", detection.changes.removed);
console.log("Modified:", detection.changes.modified);

console.log("\n✅ Expected:");
console.log("  - hasChanges: true");
console.log("  - Added: ['Sáng tạo', 'Đổi mới']");
console.log("  - Removed: ['Vi phạm cũ']");
console.log("  - Modified: ['Chất lượng'] (GiaTriMax changed)");

console.log("\n");

// ==================== TEST 2: Merge ====================
console.log("📋 TEST 2: mergeCriteriaWithPreservedScores()");
console.log("-------------------------------------------");

const merged = mergeCriteriaWithPreservedScores(currentCriteria, chuKyCriteria);

console.log("Merged result:");
merged.forEach((tc, idx) => {
  console.log(
    `  ${idx + 1}. ${tc.TenTieuChi}: DiemDat=${tc.DiemDat}, GhiChu="${
      tc.GhiChu
    }", GiaTriMax=${tc.GiaTriMax}`
  );
});

console.log("\n✅ Expected:");
console.log("  1. Chất lượng: DiemDat=85 (preserved), GiaTriMax=50 (updated)");
console.log("  2. Tiến độ: DiemDat=90 (preserved), GiaTriMax=100");
console.log("  3. Sáng tạo: DiemDat=0 (new), GiaTriMax=100");
console.log("  4. Đổi mới: DiemDat=0 (new), GiaTriMax=100");

console.log("\n");

// ==================== TEST 3: Message Formatting ====================
console.log("📋 TEST 3: formatSyncWarningMessage()");
console.log("-------------------------------------------");

const message = formatSyncWarningMessage(detection.changes);

console.log("Formatted message:");
console.log(`"${message}"`);

console.log("\n✅ Expected:");
console.log(
  '  "Phát hiện 2 tiêu chí mới: Sáng tạo, Đổi mới. 1 tiêu chí bị xóa: Vi phạm cũ. 1 tiêu chí thay đổi: Chất lượng."'
);

console.log("\n");

// ==================== TEST 4: Edge Cases ====================
console.log("📋 TEST 4: Edge Cases");
console.log("-------------------------------------------");

// 4a. No changes
const noChangeDetection = detectCriteriaChanges(
  currentCriteria,
  currentCriteria
);
console.log(
  "4a. No changes:",
  !noChangeDetection.hasChanges ? "✅ PASS" : "❌ FAIL"
);

// 4b. Empty current (all new)
const allNewDetection = detectCriteriaChanges([], chuKyCriteria);
console.log(
  "4b. All new:",
  allNewDetection.changes.added.length === 4 ? "✅ PASS" : "❌ FAIL"
);

// 4c. Empty chuKy (all removed)
const allRemovedDetection = detectCriteriaChanges(currentCriteria, []);
console.log(
  "4c. All removed:",
  allRemovedDetection.changes.removed.length === 3 ? "✅ PASS" : "❌ FAIL"
);

// 4d. Merge with empty current
const mergedFromEmpty = mergeCriteriaWithPreservedScores([], chuKyCriteria);
console.log(
  "4d. Merge from empty:",
  mergedFromEmpty.length === 4 && mergedFromEmpty[0].DiemDat === 0
    ? "✅ PASS"
    : "❌ FAIL"
);

console.log("\n========================================");
console.log("🎉 All tests completed!");
console.log("========================================");
