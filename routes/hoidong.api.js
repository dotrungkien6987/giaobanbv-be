const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const hoidongController = require("../controllers/hoidong.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /hoidong
 * @description Insert  new hoidong
 * @body {hoidong}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  hoidongController.insertOne
);
/**
 * @route PUT /hoidong
 * @description Insert  new hoidong
 * @body {hoidong}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,
  
  hoidongController.updateOneHoiDong
);

/**
 * @route GET /hoidong
 * @description Get all hoidong
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  hoidongController.gethoidongsPhanTrang
);

/**
 * @route GET /hoidong/:sucoId
 * @description Get one hoidong
 * @params {sucoId}
 * @access  login require,
 */


router.delete(
  "/:hoidongID",
  authentication.loginRequired,
  validators.validate([
    param("hoidongID").exists().isString().custom(validators.checkObjectId),
      ]),
      hoidongController.deleteOneHoiDong
);

module.exports = router;
// Path: controllers/hoidong.controller.js