// Test Script - Verify ChiTietDiem Structure Fix
// Run: node test-chitietdiem-structure.js

const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const TOKEN = "YOUR_AUTH_TOKEN"; // Replace with real token

// Test configuration
const testData = {
  chuKyId: "REPLACE_WITH_REAL_CHUKUID",
  nhanVienId: "REPLACE_WITH_REAL_NHANVIENID",
};

async function testGetChamDiemDetail() {
  console.log("\n=== Test 1: API Response Structure ===");

  try {
    const response = await axios.get(
      `${BASE_URL}/workmanagement/kpi/cham-diem-detail`,
      {
        params: {
          chuKyId: testData.chuKyId,
          nhanVienId: testData.nhanVienId,
        },
        headers: { Authorization: `Bearer ${TOKEN}` },
      }
    );

    const { nhiemVuList } = response.data.data;

    console.log(`✅ API call successful`);
    console.log(`✅ nhiemVuList length: ${nhiemVuList.length}`);

    if (nhiemVuList.length > 0) {
      const firstNhiemVu = nhiemVuList[0];
      const chiTietDiem = firstNhiemVu.ChiTietDiem;

      console.log(`✅ ChiTietDiem length: ${chiTietDiem.length}`);

      if (chiTietDiem.length > 0) {
        const firstTC = chiTietDiem[0];

        console.log("\n--- First TieuChi Structure ---");
        console.log(JSON.stringify(firstTC, null, 2));

        // Verify required fields
        const requiredFields = [
          "TieuChiID",
          "TenTieuChi",
          "LoaiTieuChi",
          "DiemDat",
          "GiaTriMin",
          "GiaTriMax",
          "DonVi",
        ];

        console.log("\n--- Field Validation ---");
        let allFieldsPresent = true;

        requiredFields.forEach((field) => {
          const exists = field in firstTC;
          const value = firstTC[field];
          const status = exists ? "✅" : "❌";
          console.log(`${status} ${field}: ${value}`);

          if (!exists) allFieldsPresent = false;
        });

        // Check forbidden fields
        if ("TrongSo" in firstTC) {
          console.log("❌ ERROR: TrongSo field still exists!");
          allFieldsPresent = false;
        } else {
          console.log("✅ TrongSo field removed");
        }

        // Validation summary
        if (allFieldsPresent) {
          console.log("\n✅✅✅ ALL TESTS PASSED ✅✅✅");
        } else {
          console.log("\n❌❌❌ SOME TESTS FAILED ❌❌❌");
        }
      }
    }
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
  }
}

async function testCalculation() {
  console.log("\n=== Test 2: Calculation Formula ===");

  // Mock data
  const mockChiTietDiem = [
    { LoaiTieuChi: "TANG_DIEM", DiemDat: 80, GiaTriMax: 100 },
    { LoaiTieuChi: "TANG_DIEM", DiemDat: 90, GiaTriMax: 100 },
    { LoaiTieuChi: "GIAM_DIEM", DiemDat: 5, GiaTriMax: 10 },
  ];

  const mucDoKho = 7.5;

  // Calculate TongDiemTieuChi
  const diemTang = mockChiTietDiem
    .filter((tc) => tc.LoaiTieuChi === "TANG_DIEM")
    .reduce((sum, tc) => sum + (tc.DiemDat || 0) / 100, 0);

  const diemGiam = mockChiTietDiem
    .filter((tc) => tc.LoaiTieuChi === "GIAM_DIEM")
    .reduce((sum, tc) => sum + (tc.DiemDat || 0) / 100, 0);

  const tongDiemTieuChi = diemTang - diemGiam;
  const diemNhiemVu = mucDoKho * tongDiemTieuChi;

  console.log("Input:");
  console.log("  - TANG_DIEM: 80%, 90%");
  console.log("  - GIAM_DIEM: 5%");
  console.log("  - MucDoKho: 7.5");

  console.log("\nCalculation:");
  console.log(`  - diemTang: ${diemTang.toFixed(2)}`);
  console.log(`  - diemGiam: ${diemGiam.toFixed(2)}`);
  console.log(`  - TongDiemTieuChi: ${tongDiemTieuChi.toFixed(2)}`);
  console.log(`  - DiemNhiemVu: ${diemNhiemVu.toFixed(2)}`);

  // Expected: (0.8 + 0.9 - 0.05) = 1.65, DiemNhiemVu = 7.5 * 1.65 = 12.375
  const expected = 12.375;
  const isCorrect = Math.abs(diemNhiemVu - expected) < 0.01;

  if (isCorrect) {
    console.log(`\n✅ Calculation CORRECT (expected: ${expected})`);
  } else {
    console.log(`\n❌ Calculation WRONG (expected: ${expected})`);
  }
}

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  ChiTietDiem Structure Fix - Test Suite  ║");
  console.log("╚═══════════════════════════════════════════╝");

  // Check configuration
  if (testData.chuKyId.includes("REPLACE")) {
    console.log("\n⚠️  WARNING: Please update testData with real IDs");
    console.log("   - chuKyId: Get from /chu-ky-danh-gia API");
    console.log("   - nhanVienId: Get from /nhan-vien API");
    console.log("   - TOKEN: Get from login response\n");
  }

  await testCalculation(); // Can run without API
  await testGetChamDiemDetail(); // Requires API + real data

  console.log("\n=== Test Suite Complete ===\n");
}

// Run tests
runAllTests().catch(console.error);
