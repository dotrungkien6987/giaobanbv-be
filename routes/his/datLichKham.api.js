const express = require("express");
const router = express.Router();
const datLichKhamController = require("../../controllers/his/datLichKham.controller");
const xacNhanManTinhController = require("../../controllers/his/xacNhanManTinh.controller");
const authentication = require("../../middlewares/authentication");

// ═══════════════════════════════════════════════
// Báo cáo đặt lịch khám (PostgreSQL — readonly)
// ═══════════════════════════════════════════════

router.post(
  "/tonghop",
  authentication.loginRequired,
  authentication.adminRequired,
  datLichKhamController.getBaoCaoTongHop,
);

router.post(
  "/chitiet",
  authentication.loginRequired,
  authentication.adminRequired,
  datLichKhamController.getChiTietDatLich,
);

router.post(
  "/chitiet-lichsu",
  authentication.loginRequired,
  authentication.adminRequired,
  datLichKhamController.getChiTietVoiLichSu,
);

router.post(
  "/export",
  authentication.loginRequired,
  authentication.adminRequired,
  datLichKhamController.exportChiTiet,
);

// ═══════════════════════════════════════════════
// Đánh dấu mãn tính (MongoDB — read/write)
// ═══════════════════════════════════════════════

router.post(
  "/mantinh",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.createManTinh,
);

router.post(
  "/mantinh/batch",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.batchCreateManTinh,
);

router.post(
  "/mantinh/list",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.getByDangKyKhamIds,
);

router.delete(
  "/mantinh/batch",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.batchDeleteManTinh,
);

router.delete(
  "/mantinh/:dangkykhamid",
  authentication.loginRequired,
  authentication.adminRequired,
  xacNhanManTinhController.deleteManTinh,
);

module.exports = router;
