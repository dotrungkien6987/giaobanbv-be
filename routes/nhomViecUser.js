const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const nhomViecUserController = require("../modules/workmanagement/controllers/nhomViecUser.controller");

router.use(authentication.loginRequired);

router.get("/", nhomViecUserController.getAll);
router.post("/", nhomViecUserController.insertOne);
router.put("/", nhomViecUserController.updateOne);
router.delete("/:id", nhomViecUserController.deleteOne);

module.exports = router;
