const express = require("express");
const router = express.Router();
const congThucManTinhController = require("../../controllers/his/congThucManTinh.controller");
const authentication = require("../../middlewares/authentication");

router.get(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  congThucManTinhController.getAll,
);

router.get(
  "/active",
  authentication.loginRequired,
  authentication.adminRequired,
  congThucManTinhController.getActive,
);

router.post(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  congThucManTinhController.create,
);

router.put(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  congThucManTinhController.update,
);

router.delete(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  congThucManTinhController.delete,
);

module.exports = router;
