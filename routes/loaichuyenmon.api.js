const express = require("express");
const router = express.Router();
const controller = require("../controllers/loaichuyenmon.controller");

router.route("/").get(controller.getAll).post(controller.insertOne);

router
  .route("/:id")
  .get(controller.getById)
  .put(controller.updateOne)
  .delete(controller.deleteOne);

module.exports = router;
