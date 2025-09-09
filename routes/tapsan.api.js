const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const ctrl = require("../controllers/tapsan.controller");

router.use(authentication.loginRequired);

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.patch("/:id/restore", ctrl.restore);

module.exports = router;
