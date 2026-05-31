const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const nhiemvuThuongQuyController = require("../modules/workmanagement/controllers/nhiemvuThuongQuy.controller");

router.use(authentication.loginRequired);

router.get("/", nhiemvuThuongQuyController.getAll);
router.post("/", nhiemvuThuongQuyController.insertOne);
router.put("/", nhiemvuThuongQuyController.updateOne);
router.delete("/:id", nhiemvuThuongQuyController.deleteOne);

module.exports = router;
