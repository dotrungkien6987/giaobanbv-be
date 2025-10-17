/**
 * Migration Script: Fix GiaTriMax in DanhGiaNhiemVuThuongQuy.ChiTietDiem
 *
 * Problem: Existing records have ChiTietDiem with GiaTriMax = 10 (from old create)
 * Solution: Re-sync ChiTietDiem.GiaTriMax from TieuChiDanhGia collection
 *
 * Run: node scripts/fix-chitietdiem-giatrimax.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const DanhGiaNhiemVuThuongQuy = require("../modules/workmanagement/models/DanhGiaNhiemVuThuongQuy");
const TieuChiDanhGia = require("../modules/workmanagement/models/TieuChiDanhGia");

async function fixChiTietDiemGiaTriMax() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all TieuChiDanhGia with correct values
    const tieuChiMap = {};
    const allTieuChi = await TieuChiDanhGia.find({ isDeleted: false });

    allTieuChi.forEach((tc) => {
      tieuChiMap[tc._id.toString()] = {
        GiaTriMin: tc.GiaTriMin,
        GiaTriMax: tc.GiaTriMax,
        DonVi: tc.DonVi,
      };
    });

    console.log(`\n📊 Loaded ${allTieuChi.length} TieuChiDanhGia records`);

    // Find all DanhGiaNhiemVuThuongQuy records
    const allNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
      isDeleted: false,
    });

    console.log(
      `\n📊 Found ${allNhiemVu.length} DanhGiaNhiemVuThuongQuy records`
    );

    let updatedCount = 0;
    let errorCount = 0;

    // Update each record
    for (const nhiemVu of allNhiemVu) {
      let needsUpdate = false;

      nhiemVu.ChiTietDiem.forEach((chiTiet) => {
        const tieuChiId = chiTiet.TieuChiID?.toString();
        const correctValues = tieuChiMap[tieuChiId];

        if (correctValues) {
          // Check if needs update
          if (
            chiTiet.GiaTriMax !== correctValues.GiaTriMax ||
            chiTiet.GiaTriMin !== correctValues.GiaTriMin ||
            chiTiet.DonVi !== correctValues.DonVi
          ) {
            console.log(
              `  ⚠️  ${chiTiet.TenTieuChi}: ${chiTiet.GiaTriMin}-${chiTiet.GiaTriMax}${chiTiet.DonVi} → ${correctValues.GiaTriMin}-${correctValues.GiaTriMax}${correctValues.DonVi}`
            );

            chiTiet.GiaTriMin = correctValues.GiaTriMin;
            chiTiet.GiaTriMax = correctValues.GiaTriMax;
            chiTiet.DonVi = correctValues.DonVi;
            needsUpdate = true;
          }
        } else {
          console.log(`  ❌ TieuChiID not found: ${tieuChiId}`);
          errorCount++;
        }
      });

      if (needsUpdate) {
        await nhiemVu.save();
        updatedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} DanhGiaNhiemVuThuongQuy records`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} ChiTietDiem with missing TieuChiID`);
    }
    console.log("✅ Migration complete!");

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixChiTietDiemGiaTriMax();
