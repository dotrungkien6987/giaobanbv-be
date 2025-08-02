const express = require("express");
const router = express.Router();
const nhiemvuThuongQuyController = require("../modules/workmanagement/controllers/nhiemvuThuongQuy.controller");

router.get("/", nhiemvuThuongQuyController.getAll);
router.post("/", nhiemvuThuongQuyController.insertOne);
router.put("/", nhiemvuThuongQuyController.updateOne);
router.delete("/:id", nhiemvuThuongQuyController.deleteOne);

module.exports = router;
