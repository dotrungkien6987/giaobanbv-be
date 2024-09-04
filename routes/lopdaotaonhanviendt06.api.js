const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const lopdaotaonhanviendt06Controller = require("../controllers/lopdaotaonhanviendt06.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /lopdaotaonhanviendt06
 * @description Insert  new lopdaotaonhanviendt06
 * @body {lopdaotaonhanviendt06}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  lopdaotaonhanviendt06Controller.insertOne
);
/**
 * @route PUT /lopdaotaonhanviendt06
 * @description Insert  new lopdaotaonhanviendt06
 * @body {lopdaotaonhanviendt06}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,
  
  lopdaotaonhanviendt06Controller.updateOne
);

/**
 * @route GET /lopdaotaonhanviendt06
 * @description Get all lopdaotaonhanviendt06
 
 * @access  login require,
 */
// router.get(
//   "/",
//   authentication.loginRequired,
//   lopdaotaonhanviendt06Controller.getlopdaotaonhanviendt06sPhanTrang
// );

/**
 * @route GET /lopdaotaonhanviendt06/:sucoId
 * @description Get one lopdaotaonhanviendt06
 * @params {sucoId}
 * @access  login require,
 */


router.delete(
  "/:lopdaotaonhanviendt06ID",
  authentication.loginRequired,
  validators.validate([
    param("lopdaotaonhanviendt06ID").exists().isString().custom(validators.checkObjectId),
      ]),
      lopdaotaonhanviendt06Controller.deleteOneByID
);

router.get(
  "/:lopdaotaoID",
  authentication.loginRequired,
  validators.validate([
    param("lopdaotaoID").exists().isString().custom(validators.checkObjectId),
      ]),
  lopdaotaonhanviendt06Controller.getByLopDaoTaoID
);

module.exports = router;
// Path: controllers/lopdaotaonhanviendt06.controller.js