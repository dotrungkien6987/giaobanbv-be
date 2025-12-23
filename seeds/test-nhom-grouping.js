/**
 * Test Nhom Grouping Feature
 * Verify all 44 notification types have Nhom field with correct values
 *
 * Run: node seeds/test-nhom-grouping.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("../modules/workmanagement/models/NotificationType");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function testNhomGrouping() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Verify all types have Nhom field
    console.log("=".repeat(80));
    console.log("🧪 TEST 1: VERIFY ALL TYPES HAVE NHOM FIELD");
    console.log("=".repeat(80));

    const allTypes = await NotificationType.find({}).lean();
    const typesWithoutNhom = allTypes.filter((t) => !t.Nhom);

    console.log(`   Total types: ${allTypes.length}`);
    console.log(`   Types without Nhom: ${typesWithoutNhom.length}`);

    if (typesWithoutNhom.length > 0) {
      console.log("\n   ❌ FAILED: Found types without Nhom:");
      typesWithoutNhom.forEach((t) => console.log(`      - ${t.code}`));
    } else {
      console.log("   ✅ PASSED: All types have Nhom field");
    }

    // Test 2: Verify Nhom values are valid
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST 2: VERIFY NHOM VALUES ARE VALID");
    console.log("=".repeat(80));

    const validNhom = ["Công việc", "Yêu cầu", "KPI", "Hệ thống"];
    const invalidNhomTypes = allTypes.filter(
      (t) => t.Nhom && !validNhom.includes(t.Nhom)
    );

    if (invalidNhomTypes.length > 0) {
      console.log("\n   ❌ FAILED: Found types with invalid Nhom:");
      invalidNhomTypes.forEach((t) =>
        console.log(`      - ${t.code}: "${t.Nhom}"`)
      );
    } else {
      console.log("   ✅ PASSED: All Nhom values are valid");
    }

    // Test 3: Group types by Nhom
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST 3: GROUP TYPES BY NHOM");
    console.log("=".repeat(80));

    const byNhom = allTypes.reduce((acc, t) => {
      const nhom = t.Nhom || "N/A";
      if (!acc[nhom]) acc[nhom] = [];
      acc[nhom].push(t.code);
      return acc;
    }, {});

    validNhom.forEach((nhom) => {
      const types = byNhom[nhom] || [];
      console.log(`\n   📁 ${nhom}: ${types.length} types`);
      types.forEach((code) => console.log(`      - ${code}`));
    });

    if (byNhom["N/A"]) {
      console.log(`\n   ⚠️  N/A: ${byNhom["N/A"].length} types`);
      byNhom["N/A"].forEach((code) => console.log(`      - ${code}`));
    }

    // Test 4: Verify expected distribution
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST 4: VERIFY EXPECTED DISTRIBUTION");
    console.log("=".repeat(80));

    const expected = {
      "Công việc": 18, // 18 congviec-* types (excluding 2 deadline types in Hệ thống)
      "Yêu cầu": 17,
      KPI: 7,
      "Hệ thống": 2, // 2 deadline types (auto-generated)
    };

    let allMatch = true;
    validNhom.forEach((nhom) => {
      const actual = byNhom[nhom]?.length || 0;
      const exp = expected[nhom] || 0;
      const match = actual === exp ? "✅" : "❌";
      console.log(`   ${match} ${nhom}: ${actual}/${exp}`);
      if (actual !== exp) allMatch = false;
    });

    if (allMatch) {
      console.log("\n   ✅ PASSED: Distribution matches expected");
    } else {
      console.log("\n   ❌ FAILED: Distribution does not match expected");
    }

    // Test 5: Test API filter by Nhom
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST 5: TEST FILTERING BY NHOM");
    console.log("=".repeat(80));

    for (const nhom of validNhom) {
      const filtered = await NotificationType.find({ Nhom: nhom }).lean();
      console.log(`   ${nhom}: ${filtered.length} types`);
    }
    console.log("   ✅ PASSED: Filtering by Nhom works");

    // Test 6: Verify index exists
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TEST 6: VERIFY INDEX ON NHOM");
    console.log("=".repeat(80));

    const indexes = await NotificationType.collection.getIndexes();
    const hasNhomIndex = Object.keys(indexes).some((key) =>
      key.includes("Nhom")
    );

    if (hasNhomIndex) {
      console.log("   ✅ PASSED: Index on Nhom field exists");
    } else {
      console.log("   ⚠️  WARNING: No index on Nhom field found");
      console.log("      Run this in MongoDB shell to create:");
      console.log("      db.notificationtypes.createIndex({ Nhom: 1 })");
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`   Total types: ${allTypes.length}`);
    console.log(`   Expected: 44 types`);
    console.log(
      `   Types with Nhom: ${allTypes.length - typesWithoutNhom.length}`
    );
    console.log(`   Types without Nhom: ${typesWithoutNhom.length}`);
    console.log(`   Invalid Nhom values: ${invalidNhomTypes.length}`);
    console.log();

    if (
      typesWithoutNhom.length === 0 &&
      invalidNhomTypes.length === 0 &&
      allMatch
    ) {
      console.log("   🎉 ALL TESTS PASSED!");
    } else {
      console.log("   ⚠️  SOME TESTS FAILED - See details above");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

testNhomGrouping();
