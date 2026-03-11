const express = require("express");
const router = express.Router();
const congThucManTinhController = require("../../controllers/his/congThucManTinh.controller");
const authentication = require("../../middlewares/authentication");

router.get(
  "/",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  congThucManTinhController.getAll,
);

router.get(
  "/active",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  congThucManTinhController.getActive,
);

router.post(
  "/",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  congThucManTinhController.create,
);

router.put(
  "/:id",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  congThucManTinhController.update,
);

router.delete(
  "/:id",
  authentication.loginRequired,
  authentication.adminOrCnttRequired,
  congThucManTinhController.delete,
);

module.exports = router;
