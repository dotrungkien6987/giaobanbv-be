const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const controller = require("../controllers/loaichuyenmon.controller");

router.use(authentication.loginRequired);

router
  .route("/")
  .get(controller.getAll)
  .post(authentication.adminDaotaoRequired, controller.insertOne);

router
  .route("/:id")
  .get(controller.getById)
  .put(authentication.adminDaotaoRequired, controller.updateOne)
  .delete(authentication.adminDaotaoRequired, controller.deleteOne);

module.exports = router;
