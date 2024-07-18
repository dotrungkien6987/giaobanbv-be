const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const hinhthuccapnhatController = require("../controllers/hinhthuccapnhat.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /hinhthuccapnhat
 * @description Insert  new hinhthuccapnhat
 * @body {hinhthuccapnhat}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  hinhthuccapnhatController.insertOne
);
/**
 * @route PUT /hinhthuccapnhat
 * @description Insert  new hinhthuccapnhat
 * @body {hinhthuccapnhat}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,
  
  hinhthuccapnhatController.updateOneHinhThucCapNhat
);

/**
 * @route GET /hinhthuccapnhat
 * @description Get all hinhthuccapnhat
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  hinhthuccapnhatController.getHinhThucCapNhatsPhanTrang
);

/**
 * @route GET /hinhthuccapnhat/:sucoId
 * @description Get one hinhthuccapnhat
 * @params {sucoId}
 * @access  login require,
 */


router.delete(
  "/:hinhthuccapnhatID",
  authentication.loginRequired,
  validators.validate([
    param("hinhthuccapnhatID").exists().isString().custom(validators.checkObjectId),
      ]),
      hinhthuccapnhatController.deleteOneHinhThucCapNhat
);

module.exports = router;
// Path: controllers/hinhthuccapnhat.controller.js