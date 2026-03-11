const express = require("express");
const router = express.Router();
const maBenhManTinhController = require("../../controllers/his/maBenhManTinh.controller");
const authentication = require("../../middlewares/authentication");

router.get(
  "/",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  maBenhManTinhController.getAll,
);

router.post(
  "/",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  maBenhManTinhController.create,
);

router.post(
  "/batch",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  maBenhManTinhController.batchCreate,
);

router.put(
  "/:id",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  maBenhManTinhController.update,
);

router.delete(
  "/:id",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  maBenhManTinhController.delete,
);

module.exports = router;
