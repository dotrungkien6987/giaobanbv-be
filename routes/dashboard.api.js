const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const dashboardController = require("../controllers/dashboard.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /dashboard
 * @description Insert or Update a new dashboard
 * @body { Ngay,KhoaID,dashboard}
 * @access  login require,
 */

router.get(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getOneNewestByNgay,
);
router.get(
  "/khoa",
  authentication.loginRequired,
  dashboardController.getOneNewestByNgayKhoa,
);

router.get(
  "/all",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getAllByNgay,
);

// GET /api/dashboard/lopdaotao-by-year
router.get(
  "/lopdaotao-by-year",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getLopDaoTaoCountByYear,
);

// New dashboard aggregates
router.get(
  "/doanra-by-year",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getDoanRaByYear,
);
router.get(
  "/doanvao-by-year",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getDoanVaoByYear,
);
router.get(
  "/tapsan-by-year",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getTapSanByYear,
);
router.get(
  "/tapsan-baibao-by-year",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.getTapSanBaiBaoByYear,
);

router.delete(
  "/delbyngay",
  authentication.loginRequired,
  authentication.adminRequired,
  dashboardController.deleteByNgay,
);

module.exports = router;
