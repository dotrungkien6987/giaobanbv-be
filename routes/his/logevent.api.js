const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../../middlewares/validators");

const logeventController = require("../../controllers/his/logevent.controller");
const authentication = require("../../middlewares/authentication");

/**
 * @route POST /baocaosuco
 * @description Insert  new baocaosuco
 * @body {baocaosuco}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  logeventController.insert
);

/**
 * @route GET /baocaosuco
 * @description Get all baocaosuco
 
 * @access  login require,


 */
router.get(
  "/",
  authentication.loginRequired,
  logeventController.getLogEvents
);

router.put(
  "/:logeventid",
  authentication.loginRequired,
  logeventController.updateLogEvent
);

router.patch(
  "/:logeventid",
  authentication.loginRequired,
   logeventController.partialUpdateLogEvent
);

module.exports = router;
