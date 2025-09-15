const express = require("express");
const router = express.Router();
const tapsanBaiBaoController = require("../controllers/tapsanbaibao.controller");
const authentication = require("../middlewares/authentication");

// Middleware xác thực cho tất cả routes
router.use(authentication.loginRequired);

// Routes cho bài báo theo TapSan
// GET /api/tapsan/:tapSanId/baibao - Lấy danh sách bài báo của tập san
router.get("/:tapSanId/baibao", tapsanBaiBaoController.getByTapSan);

// POST /api/tapsan/:tapSanId/baibao - Tạo bài báo mới cho tập san
router.post("/:tapSanId/baibao", tapsanBaiBaoController.create);

// GET /api/tapsan/:tapSanId/baibao/stats - Thống kê bài báo theo trạng thái
router.get("/:tapSanId/baibao/stats", tapsanBaiBaoController.getStatsByTapSan);

// Routes cho bài báo cụ thể
// GET /api/baibao/:id - Lấy chi tiết bài báo
router.get("/baibao/:id", tapsanBaiBaoController.getById);

// PUT /api/baibao/:id - Cập nhật bài báo
router.put("/baibao/:id", tapsanBaiBaoController.update);

// DELETE /api/baibao/:id - Xóa bài báo
router.delete("/baibao/:id", tapsanBaiBaoController.delete);

module.exports = router;
