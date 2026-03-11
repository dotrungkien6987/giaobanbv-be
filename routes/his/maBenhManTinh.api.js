const express = require("express");
const router = express.Router();
const maBenhManTinhController = require("../../controllers/his/maBenhManTinh.controller");
const authentication = require("../../middlewares/authentication");

router.get(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  maBenhManTinhController.getAll,
);

router.post(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  maBenhManTinhController.create,
);

router.post(
  "/batch",
  authentication.loginRequired,
  authentication.adminRequired,
  maBenhManTinhController.batchCreate,
);

router.put(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  maBenhManTinhController.update,
);

router.delete(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  maBenhManTinhController.delete,
);

module.exports = router;
