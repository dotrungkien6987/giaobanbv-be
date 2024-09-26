const express = require("express");
const router = express.Router();
const { body, param,query } = require("express-validator");
const validators = require("../middlewares/validators");

const lopdaotaoController = require("../controllers/lopdaotao.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /lopdaotao
 * @description Insert  new lopdaotao
 * @body {lopdaotao}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,

  lopdaotaoController.insertOne
);
/**
 * @route PUT /lopdaotao
 * @description Insert  new lopdaotao
 * @body {lopdaotao}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,

  lopdaotaoController.updateOneLopDaoTao
);

router.put(
  "/trangthai",
  authentication.loginRequired,

  lopdaotaoController.updateTrangThaiLopDaoTao
);

router.put(
  "/updatehoidong",
  authentication.loginRequired,

  lopdaotaoController.updateHoiDongIDForLopDaoTao
);

/**
 * @route GET /lopdaotao
 * @description Get all lopdaotao
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  lopdaotaoController.getlopdaotaosPhanTrang
);

/**
 * @route GET /lopdaotao/:sucoId
 * @description Get one lopdaotao
 * @params {sucoId}
 * @access  login require,
 */
// router.get(
//   "/:lopdaotaoID",
//   authentication.loginRequired, validators.validate([param("lopdaotaoID").exists().isString().custom(validators.checkObjectId)]),
//   lopdaotaoController.getById
// );
router.get(
  "/getextra/",
  authentication.loginRequired,
  validators.validate([
    query("lopdaotaoID").exists().isString().custom(validators.checkObjectId),
    query("tam").optional().isBoolean(), // Kiểm tra giá trị `tam` nếu có
  ]),
  lopdaotaoController.getById
);

//
router.get(
  "/dongbothanhvientam/:lopdaotaoID",
  authentication.loginRequired,
  validators.validate([
    param("lopdaotaoID").exists().isString().custom(validators.checkObjectId),
    
  ]),
  lopdaotaoController.getUniqueNhanVienByLopDaoTaoID
);

router.delete(
  "/:lopdaotaoID",
  authentication.loginRequired,
  validators.validate([
    param("lopdaotaoID").exists().isString().custom(validators.checkObjectId),
  ]),
  lopdaotaoController.deleteOneLopDaoTao
);

module.exports = router;
