/**
 * Criteria Sync Helper Functions
 *
 * Purpose: Detect and resolve differences between current ChiTietDiem
 * and ChuKy.TieuChiCauHinh when criteria configuration changes.
 *
 * Use case: Admin updates cycle criteria after employees have started scoring.
 */

/**
 * Detect changes between current criteria and cycle criteria
 *
 * @param {Array} currentCriteria - Current ChiTietDiem from DanhGiaNhiemVuThuongQuy
 * @param {Array} cycleCriteria - TieuChiCauHinh from ChuKyDanhGia
 * @returns {Object} { hasChanges: boolean, changes: { added, removed, modified } }
 */
const detectCriteriaChanges = (currentCriteria = [], cycleCriteria = []) => {
  // Build name sets for quick lookup
  const currentNames = new Set(currentCriteria.map((tc) => tc.TenTieuChi));
  const cycleNames = new Set(cycleCriteria.map((tc) => tc.TenTieuChi));

  // 1. Find ADDED criteria (in cycle but not in current)
  const added = cycleCriteria.filter((tc) => !currentNames.has(tc.TenTieuChi));

  // 2. Find REMOVED criteria (in current but not in cycle)
  const removed = currentCriteria.filter(
    (tc) => !cycleNames.has(tc.TenTieuChi)
  );

  // 3. Find MODIFIED criteria (same name but different properties)
  const modified = cycleCriteria.filter((cycleTc) => {
    const current = currentCriteria.find(
      (cd) => cd.TenTieuChi === cycleTc.TenTieuChi
    );

    if (!current) return false; // Not modified, it's added

    // Check if any property changed
    return (
      current.GiaTriMin !== cycleTc.GiaTriMin ||
      current.GiaTriMax !== cycleTc.GiaTriMax ||
      current.LoaiTieuChi !== cycleTc.LoaiTieuChi ||
      current.DonVi !== cycleTc.DonVi
    );
  });

  const hasChanges =
    added.length > 0 || removed.length > 0 || modified.length > 0;

  return {
    hasChanges,
    changes: {
      // ✅ FIX: Return only TenTieuChi strings for frontend display
      added: added.map((tc) => tc.TenTieuChi),
      removed: removed.map((tc) => tc.TenTieuChi),
      modified: modified.map((tc) => tc.TenTieuChi),
    },
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      totalChanges: added.length + removed.length + modified.length,
    },
  };
};

/**
 * Merge criteria with soft reset (preserve old scores where possible)
 *
 * Strategy:
 * - Keep scores for criteria that still exist (match by TenTieuChi)
 * - Add new criteria with DiemDat = 0
 * - Remove criteria no longer in cycle
 * - Update properties for modified criteria (but keep DiemDat)
 *
 * @param {Array} currentCriteria - Current ChiTietDiem with scores
 * @param {Array} cycleCriteria - TieuChiCauHinh from cycle (source of truth)
 * @returns {Array} Merged ChiTietDiem array
 */
const mergeCriteriaWithScores = (currentCriteria = [], cycleCriteria = []) => {
  // Build map: TenTieuChi -> { DiemDat, GhiChu }
  const scoreMap = new Map(
    currentCriteria.map((tc) => [
      tc.TenTieuChi,
      {
        DiemDat: tc.DiemDat ?? 0,
        GhiChu: tc.GhiChu ?? "",
      },
    ])
  );

  // Build new ChiTietDiem from cycle criteria
  const merged = cycleCriteria.map((cycleTc, index) => {
    const oldScore = scoreMap.get(cycleTc.TenTieuChi);

    return {
      TenTieuChi: cycleTc.TenTieuChi,
      LoaiTieuChi: cycleTc.LoaiTieuChi,
      GiaTriMin: cycleTc.GiaTriMin,
      GiaTriMax: cycleTc.GiaTriMax,
      DonVi: cycleTc.DonVi,
      ThuTu: index,
      DiemDat: oldScore ? oldScore.DiemDat : 0, // Preserve old score if exists
      GhiChu: oldScore ? oldScore.GhiChu : "",
    };
  });

  return merged;
};

/**
 * Validate if a score is within criteria range
 *
 * @param {Number} diemDat - Score to validate
 * @param {Object} tieuChi - Criteria with GiaTriMin/Max
 * @returns {Object} { isValid: boolean, message: string }
 */
const validateScore = (diemDat, tieuChi) => {
  if (typeof diemDat !== "number") {
    return {
      isValid: false,
      message: `Điểm "${tieuChi.TenTieuChi}" phải là số`,
    };
  }

  if (diemDat < tieuChi.GiaTriMin || diemDat > tieuChi.GiaTriMax) {
    return {
      isValid: false,
      message: `Điểm "${tieuChi.TenTieuChi}" phải từ ${tieuChi.GiaTriMin} đến ${tieuChi.GiaTriMax} ${tieuChi.DonVi}`,
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Clamp score to criteria range
 *
 * @param {Number} diemDat - Original score
 * @param {Object} tieuChi - Criteria with GiaTriMin/Max
 * @returns {Number} Clamped score
 */
const clampScore = (diemDat, tieuChi) => {
  let score = parseFloat(diemDat) || 0;

  if (score < tieuChi.GiaTriMin) return tieuChi.GiaTriMin;
  if (score > tieuChi.GiaTriMax) return tieuChi.GiaTriMax;

  return score;
};

/**
 * Generate detailed sync report for logging
 *
 * @param {Object} changes - Changes from detectCriteriaChanges()
 * @param {String} employeeName - Employee name for context
 * @returns {String} Human-readable report
 */
const generateSyncReport = (changes, employeeName = "Unknown") => {
  const lines = [
    `=== CRITERIA SYNC REPORT ===`,
    `Employee: ${employeeName}`,
    `Timestamp: ${new Date().toISOString()}`,
    ``,
    `Summary:`,
    `  - Added: ${changes.summary.addedCount}`,
    `  - Removed: ${changes.summary.removedCount}`,
    `  - Modified: ${changes.summary.modifiedCount}`,
    `  - Total Changes: ${changes.summary.totalChanges}`,
    ``,
  ];

  if (changes.changes.added.length > 0) {
    lines.push(`Added Criteria:`);
    changes.changes.added.forEach((tc) => {
      lines.push(
        `  + ${tc.TenTieuChi} (${tc.LoaiTieuChi}, max: ${tc.GiaTriMax} ${tc.DonVi})`
      );
    });
    lines.push(``);
  }

  if (changes.changes.removed.length > 0) {
    lines.push(`Removed Criteria (scores will be lost):`);
    changes.changes.removed.forEach((tc) => {
      lines.push(`  - ${tc.TenTieuChi} (had score: ${tc.DiemDat})`);
    });
    lines.push(``);
  }

  if (changes.changes.modified.length > 0) {
    lines.push(`Modified Criteria (scores preserved):`);
    changes.changes.modified.forEach((tc) => {
      lines.push(`  ~ ${tc.TenTieuChi}`);
      lines.push(
        `    Old: ${tc.old.GiaTriMin}-${tc.old.GiaTriMax} ${tc.old.DonVi} (${tc.old.LoaiTieuChi})`
      );
      lines.push(
        `    New: ${tc.new.GiaTriMin}-${tc.new.GiaTriMax} ${tc.new.DonVi} (${tc.new.LoaiTieuChi})`
      );
    });
  }

  return lines.join("\n");
};

/**
 * Format simple warning message for frontend display
 *
 * @param {Object} changes - changes object from detectCriteriaChanges().changes
 * @returns {String} Short message for Alert component
 */
const formatSyncWarningMessage = (changes) => {
  const parts = [];

  // ✅ FIX: Now changes.added/removed/modified are already string arrays
  if (changes.added && changes.added.length > 0) {
    parts.push(
      `Phát hiện ${changes.added.length} tiêu chí mới: ${changes.added.join(
        ", "
      )}.`
    );
  }

  if (changes.removed && changes.removed.length > 0) {
    parts.push(
      `${changes.removed.length} tiêu chí bị xóa: ${changes.removed.join(
        ", "
      )}.`
    );
  }

  if (changes.modified && changes.modified.length > 0) {
    parts.push(
      `${changes.modified.length} tiêu chí thay đổi: ${changes.modified.join(
        ", "
      )}.`
    );
  }

  return parts.join(" ");
};
module.exports = {
  detectCriteriaChanges,
  mergeCriteriaWithPreservedScores: mergeCriteriaWithScores, // Alias for consistency
  mergeCriteriaWithScores,
  validateScore,
  clampScore,
  generateSyncReport,
  formatSyncWarningMessage, // NEW: Simple message for frontend
};
