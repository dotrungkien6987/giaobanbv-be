const express = require("express");
const router = express.Router();
const nhomViecUserController = require("../modules/workmanagement/controllers/nhomViecUser.controller");

router.get("/", nhomViecUserController.getAll);
router.post("/", nhomViecUserController.insertOne);
router.put("/", nhomViecUserController.updateOne);
router.delete("/:id", nhomViecUserController.deleteOne);

module.exports = router;
