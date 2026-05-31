const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const hoidongController = require("../controllers/hoidong.controller");
const authentication = require("../middlewares/authentication");

router.use(authentication.loginRequired);

/**
 * @route POST /hoidong
 * @description Insert  new hoidong
 * @body {hoidong}
 * @access  Admin/DaoTao require,
 */
router.post(
  "/",
  authentication.adminDaotaoRequired,
  hoidongController.insertOne,
);
/**
 * @route PUT /hoidong
 * @description Insert  new hoidong
 * @body {hoidong}
 * @access  Admin/DaoTao require,
 */
router.put(
  "/",
  authentication.adminDaotaoRequired,
  hoidongController.updateOneHoiDong,
);

/**
 * @route GET /hoidong
 * @description Get all hoidong
 
 * @access  Admin/DaoTao require,
 */
router.get(
  "/",
  authentication.adminDaotaoRequired,
  hoidongController.gethoidongsPhanTrang,
);

/**
 * @route GET /hoidong/:sucoId
 * @description Get one hoidong
 * @params {sucoId}
 * @access  login require,
 */

router.delete(
  "/:hoidongID",
  authentication.adminDaotaoRequired,
  validators.validate([
    param("hoidongID").exists().isString().custom(validators.checkObjectId),
  ]),
  hoidongController.deleteOneHoiDong,
);

module.exports = router;
// Path: controllers/hoidong.controller.js
