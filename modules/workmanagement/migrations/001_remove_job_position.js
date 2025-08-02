/**
 * Migration Script: Remove JobPosition and PositionRoutineDuty
 * Convert to direct Employee-RoutineDuty relationship với tên tiếng Việt
 *
 * This script will:
 * 1. Create NhanVienNhiemVu records from existing PositionRoutineDuty and Employee data
 * 2. Update Employee records to remove ViTriHienTaiID and add PhongBanID directly
 * 3. Add isDeleted field to all relevant models
 * 4. Backup old data before migration
 */

const mongoose = require("mongoose");

// Import old models (before migration) - Backward compatibility
const ViTriCongViec = require("../models/JobPosition");
const PositionRoutineDuty = require("../models/PositionRoutineDuty");
const Employee = require("../models/Employee");
const RoutineDuty = require("../models/RoutineDuty");

// Import new models (Vietnamese names)
const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
const LichSuGanNhiemVu = require("../models/LichSuGanNhiemVu");
const {
  QuanLyTrangThaiCongViec,
  TRANG_THAI_CONG_VIEC,
} = require("../models/QuanLyTrangThaiCongViec");

async function migrateJobPositionToEmployee() {
  try {
    console.log(
      "🚀 Starting migration: Remove JobPosition, direct Employee-RoutineDuty relationship với tên tiếng Việt"
    );

    // Step 1: Backup existing data
    console.log("Step 1: Creating backup collections...");

    const backupDate = new Date().toISOString().slice(0, 10);

    // Backup JobPosition
    const jobPositions = await ViTriCongViec.find({}).lean();
    if (jobPositions.length > 0) {
      await mongoose.connection
        .collection(`vitricongviec_backup_${backupDate}`)
        .insertMany(jobPositions);
      console.log(`Backed up ${jobPositions.length} job positions`);
    }

    // Backup PositionRoutineDuty
    const positionRoutineDuties = await PositionRoutineDuty.find({}).lean();
    if (positionRoutineDuties.length > 0) {
      await mongoose.connection
        .collection(`position_routine_duties_backup_${backupDate}`)
        .insertMany(positionRoutineDuties);
      console.log(
        `Backed up ${positionRoutineDuties.length} position routine duties`
      );
    }

    // Backup current Employee data
    const employees = await Employee.find({}).lean();
    if (employees.length > 0) {
      await mongoose.connection
        .collection(`nhanvienquanly_backup_${backupDate}`)
        .insertMany(employees);
      console.log(`Backed up ${employees.length} employees`);
    }

    // Step 2: Create EmployeeRoutineDuty records
    console.log("Step 2: Creating EmployeeRoutineDuty records...");

    let createdCount = 0;

    for (const employee of employees) {
      if (employee.ViTriHienTaiID) {
        // Find all routine duties for this position
        const routineDuties = await PositionRoutineDuty.find({
          positionId: employee.ViTriHienTaiID,
          isActive: true,
        }).populate("routineDutyId");

        for (const routineDuty of routineDuties) {
          if (routineDuty.routineDutyId) {
            // Create NhanVienNhiemVu record
            const nhanVienNhiemVu = new NhanVienNhiemVu({
              NhanVienID: employee._id,
              NhiemVuThuongQuyID: routineDuty.routineDutyId._id,
              TyTrongPhanTram: routineDuty.weightPercentage || 100,
              TrangThaiHoatDong: routineDuty.isActive,
              NgayGan: routineDuty.assignedDate || routineDuty.createdAt,
              NguoiGanID: null, // Will be set later if needed
            });

            await nhanVienNhiemVu.save();

            // Create history record
            await LichSuGanNhiemVu.taoGhiNhan({
              nhanVienId: employee._id,
              nhiemVuId: routineDuty.routineDutyId._id,
              tyTrong: routineDuty.weightPercentage || 100,
              ngayHieuLuc: routineDuty.assignedDate || routineDuty.createdAt,
              nguoiGanId: null,
              lyDo: "Migration từ hệ thống cũ",
              loaiThayDoi: "GAN_MOI",
              ghiChu: "Tự động tạo khi migration từ PositionRoutineDuty",
            });

            createdCount++;
          }
        }
      }
    }

    console.log(`Created ${createdCount} NhanVienNhiemVu records`);

    // Step 2.5: Initialize state management for existing tasks
    console.log("Step 2.5: Initializing task state management...");

    try {
      const AssignedTask = require("../models/AssignedTask");
      const tasks = await AssignedTask.find({}).lean();

      let stateRecordsCreated = 0;
      for (const task of tasks) {
        try {
          await QuanLyTrangThaiCongViec.taoBanGhi(
            task._id,
            task.NguoiGiaoViecID
          );
          stateRecordsCreated++;
        } catch (err) {
          // Skip if already exists
          console.log(`Task ${task._id} already has state management record`);
        }
      }
      console.log(
        `Created ${stateRecordsCreated} task state management records`
      );
    } catch (err) {
      console.log("Error initializing task state management:", err.message);
    }

    // Step 3: Update Employee records
    console.log("Step 3: Updating Employee records...");

    let updatedEmployees = 0;

    for (const employee of employees) {
      const updateData = {
        isDeleted: false, // Add isDeleted field
      };

      // Get department from position if exists
      if (employee.ViTriHienTaiID) {
        const jobPosition = await ViTriCongViec.findById(
          employee.ViTriHienTaiID
        );
        if (jobPosition && jobPosition.PhongBanID) {
          updateData.PhongBanID = jobPosition.PhongBanID;
          updateData.CapBac = jobPosition.CapBac || "NHANVIEN";
        }
      }

      // Remove ViTriHienTaiID field and update
      await Employee.updateOne(
        { _id: employee._id },
        {
          $set: updateData,
          $unset: { ViTriHienTaiID: 1 },
        }
      );

      updatedEmployees++;
    }

    console.log(`Updated ${updatedEmployees} employee records`);

    // Step 4: Add isDeleted to RoutineDuty records
    console.log("Step 4: Adding isDeleted field to RoutineDuty records...");

    const routineDutyUpdateResult = await RoutineDuty.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );

    console.log(
      `Updated ${routineDutyUpdateResult.modifiedCount} routine duty records`
    );

    // Step 5: Add isDeleted to other collections if they exist
    console.log("Step 5: Adding isDeleted to other collections...");

    // AssignedTask
    try {
      const AssignedTask = require("../models/AssignedTask");
      const taskUpdateResult = await AssignedTask.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false } }
      );
      console.log(
        `Updated ${taskUpdateResult.modifiedCount} assigned task records`
      );
    } catch (err) {
      console.log("AssignedTask collection not found or error:", err.message);
    }

    // Comment
    try {
      const Comment = require("../models/Comment");
      const commentUpdateResult = await Comment.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false } }
      );
      console.log(
        `Updated ${commentUpdateResult.modifiedCount} comment records`
      );
    } catch (err) {
      console.log("Comment collection not found or error:", err.message);
    }

    console.log("Migration completed successfully!");

    // Summary
    console.log("\n=== MIGRATION SUMMARY ===");
    console.log(`- Backed up ${jobPositions.length} job positions`);
    console.log(
      `- Backed up ${positionRoutineDuties.length} position routine duties`
    );
    console.log(`- Backed up ${employees.length} employees`);
    console.log(`- Created ${createdCount} employee routine duty records`);
    console.log(`- Updated ${updatedEmployees} employee records`);
    console.log(
      `- Updated ${routineDutyUpdateResult.modifiedCount} routine duty records`
    );
    console.log("\n=== NEXT STEPS ===");
    console.log("1. Verify the migration results");
    console.log("2. Update any controllers/routes that reference old models");
    console.log("3. Remove old model files after testing");
    console.log("4. Drop old collections after verification:");
    console.log("   - vitricongviec");
    console.log("   - position_routine_duties");
    console.log("   - lichsuvitrinhanvien");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Rollback function (in case migration needs to be reversed)
async function rollbackMigration() {
  try {
    console.log("Starting rollback...");

    const backupDate = new Date().toISOString().slice(0, 10);

    // Restore from backup collections
    const backupEmployees = await mongoose.connection
      .collection(`nhanvienquanly_backup_${backupDate}`)
      .find({})
      .toArray();

    if (backupEmployees.length > 0) {
      // Remove current employee records
      await Employee.deleteMany({});

      // Restore from backup
      await Employee.insertMany(backupEmployees);
      console.log(`Restored ${backupEmployees.length} employee records`);
    }

    // Remove EmployeeRoutineDuty records
    const deletedCount = await NhanVienNhiemVu.deleteMany({});
    console.log(
      `Removed ${deletedCount.deletedCount} nhan vien nhiem vu records`
    );

    // Remove history records
    const deletedHistoryCount = await LichSuGanNhiemVu.deleteMany({});
    console.log(
      `Removed ${deletedHistoryCount.deletedCount} assignment history records`
    );

    // Remove state management records
    const deletedStateCount = await QuanLyTrangThaiCongViec.deleteMany({});
    console.log(
      `Removed ${deletedStateCount.deletedCount} task state management records`
    );

    console.log("Rollback completed");
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}

module.exports = {
  migrateJobPositionToEmployee,
  rollbackMigration,
};

// If running directly
if (require.main === module) {
  const mongoose = require("mongoose");

  // Connect to database
  mongoose
    .connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/your-database",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    )
    .then(() => {
      console.log("Connected to database");
      return migrateJobPositionToEmployee();
    })
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration error:", error);
      process.exit(1);
    });
}
