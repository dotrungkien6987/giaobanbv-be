const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const nhanvienController = require("../controllers/nhanvien.controller");
const authentication = require("../middlewares/authentication");
const {
  uploadAvatar,
  verifyAvatarMagic,
} = require("../middlewares/avatarUpload");

/**
 * @route POST /nhanvien
 * @description Insert  new nhanvien
 * @body {nhanvien}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,

  nhanvienController.insertOne
);

// ===== Self-service profile for logged-in user (NhanVien linked by User.NhanVienID) =====
router.get("/me", authentication.loginRequired, nhanvienController.getMe);

router.patch("/me", authentication.loginRequired, nhanvienController.updateMe);

router.post(
  "/me/avatar",
  authentication.loginRequired,
  uploadAvatar.single("avatar"),
  verifyAvatarMagic,
  nhanvienController.uploadMyAvatar
);

// Serve avatar by NhanVienID (login required)
router.get(
  "/:nhanvienID/avatar",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.getAvatarByNhanVienID
);
/**
 * @route PUT /nhanvien
 * @description Insert  new nhanvien
 * @body {nhanvien}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,

  nhanvienController.updateOneNhanVien
);

/**
 * @route GET /nhanvien
 * @description Get all nhanvien
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  nhanvienController.getNhanviensPhanTrang
);

router.get(
  "/tichluytinchi",
  authentication.loginRequired,
  nhanvienController.getAllNhanVienWithTinChiTichLuy
);
router.get(
  "/tichluytinchitheokhoa/",
  authentication.loginRequired,

  nhanvienController.getAllNhanVienWithTinChiTichLuyByKhoa
);

router.get(
  "/soluongthuchien",
  authentication.loginRequired,
  nhanvienController.getTongHopSoLuongThucHien
);

router.get(
  "/soluongtheokhoa",
  authentication.loginRequired,
  nhanvienController.getTongHopSoLuongTheoKhoa
);

router.get(
  "/cocaunhanluc",
  authentication.loginRequired,
  nhanvienController.getCoCauNguonNhanLuc
);

router.get(
  "/cocaunhanluctheokhoa/:khoaID",
  authentication.loginRequired,
  validators.validate([
    param("khoaID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.getCoCauNguonNhanLucByKhoa
);

/**
 * @route GET /nhanvien/deleted
 * @description Get all deleted nhanvien (isDeleted = true)
 * @access  login require,
 */
router.get(
  "/deleted",
  authentication.loginRequired,
  nhanvienController.getNhanViensDeleted
);

/**
 * @route GET /nhanvien/simple/:nhanvienID
 * @description Get one nhanvien with basic info only (for QuanLyNhanVien)
 * @params {nhanvienID}
 * @access  login require,
 */
router.get(
  "/simple/:nhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.getOneByNhanVienID
);

router.get(
  "/:nhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.getById
);

/**
 * @route PATCH /nhanvien/:nhanvienID/restore
 * @description Restore a soft-deleted nhanvien (set isDeleted = false)
 * @params {nhanvienID}
 * @access  login require,
 */
router.patch(
  "/:nhanvienID/restore",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.restoreNhanVien
);

/**
 * @route GET /nhanvien/:sucoId
 * @description Get one nhanvien
 * @params {sucoId}
 * @access  login require,
 */

router.delete(
  "/:nhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
  ]),
  nhanvienController.deleteOneNhanVien
);

router.post(
  "/import",
  authentication.loginRequired,
  nhanvienController.importNhanVien
);

module.exports = router;
