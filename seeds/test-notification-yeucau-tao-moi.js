/**
 * Test Seed - YeuCau.TAO_MOI Notification Type & Template
 *
 * Purpose: Test NotificationService với 1 action đơn giản
 * Run: node seeds/test-notification-yeucau-tao-moi.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("../modules/workmanagement/models/NotificationType");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function seedTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Create NotificationType
    const typeData = {
      code: "yeucau-tao-moi",
      name: "Thông báo tạo yêu cầu mới",
      description: "Gửi khi có yêu cầu mới từ khoa khác",
      variables: [
        // Recipient Candidates
        {
          name: "NguoiYeuCauID",
          type: "ObjectId",
          ref: "NhanVien",
          isRecipientCandidate: true,
          description: "Người tạo yêu cầu",
        },
        {
          name: "arrNguoiDieuPhoiID",
          type: "Array",
          itemType: "ObjectId",
          ref: "NhanVien",
          isRecipientCandidate: true,
          description: "Điều phối viên khoa (từ CauHinhThongBaoKhoa)",
        },
        // Display Fields (flatten)
        {
          name: "_id",
          type: "ObjectId",
          description: "ID yêu cầu",
        },
        {
          name: "MaYeuCau",
          type: "String",
          description: "Mã yêu cầu",
        },
        {
          name: "TieuDe",
          type: "String",
          description: "Tiêu đề yêu cầu",
        },
        {
          name: "TenKhoaGui",
          type: "String",
          description: "Tên khoa gửi (flatten)",
        },
        {
          name: "TenKhoaNhan",
          type: "String",
          description: "Tên khoa nhận (flatten)",
        },
        {
          name: "TenNguoiYeuCau",
          type: "String",
          description: "Tên người yêu cầu (flatten)",
        },
      ],
      isActive: true,
    };

    const type = await NotificationType.findOneAndUpdate(
      { code: typeData.code },
      typeData,
      { upsert: true, new: true }
    );

    console.log(`✅ NotificationType created: ${type.code}`);

    // 2. Create NotificationTemplate
    const templateData = {
      name: "Thông báo cho điều phối viên",
      typeCode: "yeucau-tao-moi",
      recipientConfig: {
        variables: ["arrNguoiDieuPhoiID"], // Gửi cho điều phối viên
      },
      titleTemplate: "{{MaYeuCau}} - Yêu cầu từ {{TenKhoaGui}}",
      bodyTemplate: "Khoa {{TenKhoaGui}} gửi yêu cầu: {{TieuDe}}",
      actionUrl: "/yeucau/{{_id}}",
      icon: "assignment",
      priority: "normal",
      isEnabled: true,
    };

    const template = await NotificationTemplate.findOneAndUpdate(
      { typeCode: templateData.typeCode, name: templateData.name },
      templateData,
      { upsert: true, new: true }
    );

    console.log(`✅ NotificationTemplate created: ${template.name}`);

    // 3. Summary
    console.log("\n📊 Test Seed Complete:");
    console.log(`   Type: ${type.code}`);
    console.log(`   Variables: ${type.variables.length}`);
    console.log(
      `   Recipient Candidates: ${
        type.variables.filter((v) => v.isRecipientCandidate).length
      }`
    );
    console.log(`   Template: ${template.name}`);
    console.log(
      `   Recipients: ${template.recipientConfig.variables.join(", ")}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

seedTestData();
