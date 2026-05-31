const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");
const authentication = require("../middlewares/authentication");
const { getPasswordPolicyError } = require("../helpers/passwordPolicy");

const allowedRoles = [
  "admin",
  "manager",
  "nomal",
  "daotao",
  "noibo",
  "qlcl",
  "cntt",
];

function validateStrongPassword(value) {
  const passwordError = getPasswordPolicyError(value);
  if (passwordError) {
    throw new Error(passwordError);
  }

  return true;
}

/**
 * @route POST /user
 * @description  Insert a new account
 * @body {UserName,Email,PassWord,KhoaID,HoTen,PhanQuyen}
 * @access Admin require
 */
router.post(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    body("UserName", "Invalid name").exists().notEmpty(),
    body("PassWord", "Mật khẩu phải có ít nhất 6 ký tự")
      .exists()
      .isString()
      .custom(validateStrongPassword),
    body("KhoaID", "Khoa không hợp lệ")
      .exists()
      .isString()
      .custom(validators.checkObjectId),
    body("NhanVienID", "Nhân viên không hợp lệ")
      .optional({ nullable: true })
      .custom((value) => value === null || validators.checkObjectId(value)),
    body("Email", "Email không hợp lệ")
      .optional({ checkFalsy: true })
      .isEmail(),
    body("PhanQuyen", "Không có phân quyền")
      .exists()
      .isString()
      .isIn(allowedRoles),
  ]),
  userController.insertOne,
);

//thieeu authentication.loginRequired
router.get(
  "/",
  authentication.loginRequired,
  authentication.adminRequired,
  userController.getUsers,
);

router.get(
  "/all",
  authentication.loginRequired,
  authentication.adminRequired,
  userController.getAllUsers,
);

/**
 *@route GET /users/me
 * @description  Get current user info
 * @params  userId
 * @access Login required
 */
router.get("/me", authentication.loginRequired, userController.getCurrentUser);

/**
 *@route GET /users/me/full
 * @description  Get current user with full NhanVien info (for Work Management module)
 * @access Login required
 */
router.get(
  "/me/full",
  authentication.loginRequired,
  userController.getCurrentUserFull,
);

/**
 * @route PUT /user
 * @description  Update a account
 * @body {userId,UserName,Email,PassWord,KhoaID,HoTen,PhanQuyen}
 * @access Admin require
 */
router.put(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    body("UserName", "UserName không hợp lệ")
      .optional()
      .isString()
      .trim()
      .notEmpty(),
    body("KhoaID", "Khoa không hợp lệ")
      .optional()
      .isString()
      .custom(validators.checkObjectId),
    body("NhanVienID", "Nhân viên không hợp lệ")
      .optional({ nullable: true })
      .custom((value) => value === null || validators.checkObjectId(value)),
    body("Email", "Email không hợp lệ")
      .optional({ checkFalsy: true })
      .isEmail(),
    body("PhanQuyen", "Phân quyền không hợp lệ")
      .optional()
      .isString()
      .isIn(allowedRoles),
  ]),
  userController.updateUser,
);

/**
 * @route PUT /user/resetpass/:id
 * @description  reset pass
 * @body {PassWord}
 * @access Admin require
 */
router.put(
  "/resetpass/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    body("PassWord", "Mật khẩu phải có ít nhất 6 ký tự")
      .exists()
      .isString()
      .custom(validateStrongPassword),
  ]),
  userController.resetPass,
);

/**
 * @route PUT /user/me/resetpass/
 * @description  reset pass curent user
 * @body {PassWord}
 * @access Admin require
 */
router.put(
  "/me/resetpass",
  authentication.loginRequired,
  validators.validate([
    body("PassWordOld", "Mật khẩu cũ không hợp lệ")
      .exists({ values: "falsy" })
      .isString(),
    body("PassWordNew")
      .exists({ values: "falsy" })
      .isString()
      .custom(validateStrongPassword),
  ]),
  userController.resetPassMe,
);

/**
 * @route DELETE /user/:id
 * @description  Delete a user
 * @access Admin required
 */

router.delete(
  "/:id",
  authentication.loginRequired,
  authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  userController.deleteUser,
);

module.exports = router;
