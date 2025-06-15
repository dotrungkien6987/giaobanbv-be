const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const baocaongayController = require("../controllers/baocaongay.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /baocaongay
 * @description Insert or Update a new baocaongay
 * @body { Ngay,KhoaID,BaoCaoNgay}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  validators.validate([
    body("Ngay", "Invalid Ngay").exists().notEmpty(),
    body("KhoaID", "Invalid KhoaID").exists().notEmpty(),
    
       ]),
  baocaongayController.insertOrUpdateOne
);

/**
 * @route POST /baocaongay
 * @description Insert or Update a new baocaongay
 * @body { Ngay,KhoaID,BaoCaoNgay}
 * @access  login require,
 */
router.post(
  "/rieng",
  authentication.loginRequired,
  validators.validate([
    body("Ngay", "Invalid Ngay").exists().notEmpty(),
    body("KhoaID", "Invalid KhoaID").exists().notEmpty(),
    
       ]),
  baocaongayController.insertOrUpdateOne_Rieng
);

router.get(
  "/",
  authentication.loginRequired,
  baocaongayController.getOneByNgayKhoaID
);

router.get(
  "/rieng",
  authentication.loginRequired,
  baocaongayController.getOneByNgayKhoaID_Rieng
);

router.get(
  "/all",
  authentication.loginRequired,
  baocaongayController.getAllByNgay
);

module.exports = router;
