const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");
const { use } = require("./auth.api");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /user  
 * @description  Insert a new account
 * @body {UserName,Email,PassWord,KhoaID,HoTen,PhanQuyen}
 * @access Admin require
 */
router.post(
  "/",
  authentication.loginRequired,authentication.adminRequired,
  validators.validate([
    body("UserName", "Invalid name").exists().notEmpty(),
    body("PassWord", "Invalid password").exists().notEmpty(),
    body("KhoaID", "không có khoaID").exists().notEmpty(),
    body("PhanQuyen", "Không có phân quyền").exists().notEmpty(),
 
  ]),
  userController.insertOne
);

//thieeu authentication.loginRequired
router.get("/",authentication.loginRequired,authentication.adminRequired, userController.getUsers);


/**
 *@route GET /users/me
 * @description  Get current user info
 * @params  userId
 * @access Login required
 */
 router.get("/me", authentication.loginRequired, userController.getCurrentUser);


 /**
 * @route PUT /user  
 * @description  Update a account
 * @body {userId,UserName,Email,PassWord,KhoaID,HoTen,PhanQuyen}
 * @access Admin require
 */
 router.put(
  "/:id",
  authentication.loginRequired,authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  userController.updateUser
);

/**
 * @route PUT /user/resetpass/:id  
 * @description  reset pass 
 * @body {PassWord}
 * @access Admin require
 */
 router.put(
  "/resetpass/:id",
  authentication.loginRequired,authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  userController.resetPass
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
  
  userController.resetPassMe
);


/**
 * @route DELETE /user/:id
 * @description  Delete a user
 * @access Admin required
 */

router.delete(
  "/:id",
  authentication.loginRequired,authentication.adminRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    
  ]),
  userController.deleteUser
);


module.exports = router;
