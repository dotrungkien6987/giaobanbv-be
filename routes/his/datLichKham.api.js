const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const datLichKhamController = require("../../controllers/his/datLichKham.controller");
const xacNhanManTinhController = require("../../controllers/his/xacNhanManTinh.controller");
const authentication = require("../../middlewares/authentication");

// Middleware body-parser riêng cho batch — chỉ áp dụng 2 endpoint dưới đây
// Giới hạn 10mb đủ cho ~3000 bản ghi với snapshot JSON
const batchBodyParser = bodyParser.json({ limit: "10mb" });

// ═══════════════════════════════════════════════
// Báo cáo đặt lịch khám (PostgreSQL — readonly)
// ═══════════════════════════════════════════════

router.post(
  "/tonghop",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  datLichKhamController.getBaoCaoTongHop,
);

router.post(
  "/chitiet",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  datLichKhamController.getChiTietDatLich,
);

router.post(
  "/chitiet-lichsu",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  datLichKhamController.getChiTietVoiLichSu,
);

router.post(
  "/export",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  datLichKhamController.exportChiTiet,
);

// ═══════════════════════════════════════════════
// Đánh dấu mãn tính (MongoDB — read/write)
// ═══════════════════════════════════════════════

router.post(
  "/mantinh",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  xacNhanManTinhController.createManTinh,
);

router.post(
  "/mantinh/batch",
  batchBodyParser,
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  xacNhanManTinhController.batchCreateManTinh,
);

router.post(
  "/mantinh/list",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  xacNhanManTinhController.getByDangKyKhamIds,
);

router.delete(
  "/mantinh/batch",
  batchBodyParser,
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  xacNhanManTinhController.batchDeleteManTinh,
);

router.delete(
  "/mantinh/:dangkykhamid",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.deleteManTinh,
);

module.exports = router;
