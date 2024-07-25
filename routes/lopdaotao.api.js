const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
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
router.get(
  "/:lopdaotaoID",
  authentication.loginRequired, validators.validate([param("lopdaotaoID").exists().isString().custom(validators.checkObjectId)]),
  lopdaotaoController.getById
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
