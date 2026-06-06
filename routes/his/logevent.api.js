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
  authentication.adminRequired,
  logeventController.insert,
);

/**
 * @route GET /baocaosuco
 * @description Get all baocaosuco
 
 * @access  login require,


 */
router.get(
  "/",
  authentication.loginRequired,
  authentication.dashboardTabRequired("BNNT"),
  logeventController.getLogEvents,
);

router.put(
  "/:logeventid",
  authentication.loginRequired,
  authentication.adminRequired,
  logeventController.updateLogEvent,
);

router.patch(
  "/:logeventid",
  authentication.loginRequired,
  authentication.adminRequired,
  logeventController.partialUpdateLogEvent,
);

module.exports = router;
