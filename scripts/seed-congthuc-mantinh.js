/**
 * Seed script: Insert công thức pipeline phát hiện bệnh nhân mãn tính
 *
 * Pipeline gồm 3 bước:
 *   Bước 1 (Lọc): Tần suất tối thiểu — soLanKham >= 2
 *   Bước 2 (Lọc): Dấu hiệu mãn tính — OR 6 nhánh (match bất kỳ)
 *   Bước 3 (Loại trừ): Loại trừ tín hiệu yếu — mã mới + lịch sử mãn tính ≤ 1
 *
 * Chạy: node scripts/seed-congthuc-mantinh.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

const CongThucManTinh = require(
  path.join(__dirname, "..", "models", "CongThucManTinh"),
);
const User = require(path.join(__dirname, "..", "models", "User"));

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

// ─── Helper: tạo node điều kiện lá ──────────────────────────
function dk(bienSo, toanTu, giaTri) {
  return { loai: "dieu_kien", bienSo, toanTu, giaTri };
}

// ─── Helper: tạo group AND/OR ───────────────────────────────
function group(loai, children) {
  return { loai, children };
}

// ─── Pipeline 3 bước ────────────────────────────────────────

const pipeline = [
  // ═══ Bước 1: Tần suất tối thiểu ═══
  // BN phải khám ≥ 2 lần trong năm → loại BN đến 1 lần duy nhất
  {
    thuTu: 1,
    loaiStep: "loc",
    tenStep: "Tần suất tối thiểu",
    dieuKien: group("AND", [dk("soLanKham", ">=", 2)]),
  },

  // ═══ Bước 2: Dấu hiệu mãn tính (OR 6 nhánh) ═══
  // BN match BẤT KỲ 1 trong 6 tiêu chí → có dấu hiệu mãn tính
  {
    thuTu: 2,
    loaiStep: "loc",
    tenStep: "Dấu hiệu mãn tính",
    dieuKien: group("OR", [
      // Nhánh 1: Lần khám hiện tại là bệnh mãn tính + lịch sử CĐ chính mãn tính
      group("AND", [
        dk("maBenhChinhHienTai_TrongDSManTinh", "==", true),
        dk("soLanMaBenhManTinh", ">=", 1),
      ]),

      // Nhánh 2: Lần khám hiện tại mãn tính + lịch sử CĐ kèm theo mãn tính
      group("AND", [
        dk("maBenhChinhHienTai_TrongDSManTinh", "==", true),
        dk("coMaBenhManTinh_KemTheo", "==", true),
      ]),

      // Nhánh 3: 3+ lần khám có mã mãn tính (bất kỳ CĐ chính/kèm theo)
      dk("soLanMaBenhManTinh_BatKy", ">=", 3),

      // Nhánh 4: 2+ lần liên tiếp gần nhất CĐ chính mãn tính
      dk("soLanLienTucMaBenhManTinh", ">=", 2),

      // Nhánh 5: >50% lần khám có CĐ chính mãn tính
      dk("tiLeMaBenhManTinh", ">=", 50),

      // Nhánh 6: 2+ mã ICD mãn tính khác nhau (đa bệnh mãn tính / comorbidity)
      dk("soMaBenhManTinhKhacNhau", ">=", 2),
    ]),
  },

  // ═══ Bước 3: Loại trừ tín hiệu yếu ═══
  // BN có mã bệnh chính hoàn toàn MỚI + lịch sử mãn tính ≤ 1 → false positive
  {
    thuTu: 3,
    loaiStep: "loaiTru",
    tenStep: "Loại trừ tín hiệu yếu",
    dieuKien: group("AND", [
      dk("maBenhChinhMoi", "==", true),
      dk("soLanMaBenhManTinh_BatKy", "<=", 1),
    ]),
  },
];

async function main() {
  try {
    console.log("Connecting to", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Tìm user đầu tiên làm nguoiTao
    const user = await User.findOne().sort({ createdAt: 1 }).lean();
    if (!user) {
      throw new Error(
        "Không tìm thấy User trong DB. Hãy tạo user trước khi chạy script.",
      );
    }
    console.log(`Sử dụng nguoiTao: ${user.UserName || user._id}`);

    // Kiểm tra công thức cùng tên đã tồn tại chưa
    const tenCongThuc = "Phát hiện BN mãn tính — Chuẩn";
    const existing = await CongThucManTinh.findOne({ tenCongThuc });
    if (existing) {
      console.log(
        `⚠️  Công thức "${tenCongThuc}" đã tồn tại (ID: ${existing._id}). Bỏ qua insert.`,
      );
      return;
    }

    const doc = await CongThucManTinh.create({
      tenCongThuc,
      moTa:
        "Pipeline 3 bước: Tần suất tối thiểu → Dấu hiệu mãn tính (6 tiêu chí OR) → Loại trừ tín hiệu yếu. " +
        "Ngưỡng mặc định phù hợp thực tế lâm sàng, có thể tinh chỉnh qua UI.",
      isActive: true,
      pipeline,
      nguoiTao: user._id,
    });

    console.log("✅ Đã tạo công thức thành công:");
    console.log(`   ID: ${doc._id}`);
    console.log(`   Tên: ${doc.tenCongThuc}`);
    console.log(`   Pipeline: ${doc.pipeline.length} bước`);
    doc.pipeline.forEach((step, i) => {
      const label = step.loaiStep === "loc" ? "Lọc" : "Loại trừ";
      const children = step.dieuKien.children?.length || 0;
      console.log(
        `     Bước ${i + 1} [${label}]: ${step.tenStep} — ${children} điều kiện`,
      );
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

main();
