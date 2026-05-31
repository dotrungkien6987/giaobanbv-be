const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const baocaosucoController = require("../controllers/baocaosuco.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /baocaosuco
 * @description Insert  new baocaosuco
 * @body {baocaosuco}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.insertOne,
);

/**
 * @route GET /baocaosuco
 * @description Get all baocaosuco
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.getBaocaosucos,
);

router.get(
  "/danhsach",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.getBaocaosucosForDataGrid,
);

router.get(
  "/tonghop",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.tongHopSuCoYKhoa,
);
router.get(
  "/tonghoptheokhoa",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.tongHopSuCoTheoKhoa,
);

/**
 * @route GET /baocaosuco/:sucoId
 * @description Get one baocaosuco
 * @params {sucoId}
 * @access  login require,
 */
router.get(
  "/:sucoId",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    param("sucoId").exists().isString().custom(validators.checkObjectId),
  ]),
  baocaosucoController.getById,
);

router.delete(
  "/:sucoId",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    param("sucoId").exists().isString().custom(validators.checkObjectId),
  ]),
  baocaosucoController.deleteOneSuco,
);
router.put(
  "/update",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.updateOneSuco,
);
router.put(
  "/updatetrangthai",
  authentication.loginRequired,
  authentication.adminRequired,
  baocaosucoController.updateTrangThaiSuco,
);

module.exports = router;
