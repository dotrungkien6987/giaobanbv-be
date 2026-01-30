const { validationResult } = require("express-validator");
const { sendResponse } = require("../helpers/utils");
const mongoose = require("mongoose");
const validators = {};

validators.validate = (validationArray) => async (req, res, next) => {
  console.log(
    "🔍 Validator middleware - req.body:",
    JSON.stringify(req.body, null, 2),
  );
  console.log("🔍 Validator middleware - req.url:", req.url);

  await Promise.all(validationArray.map((validation) => validation.run(req)));
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    console.log("✅ Validation passed!");
    return next();
  }

  console.error("❌ Validation errors:", errors.array());

  const message = errors
    .array()
    .map((error) => error.msg)
    .join("&");
  return sendResponse(res, 422, false, null, { message }, "Validation error");
};

validators.checkObjectId = (paramId) => {
  if (!mongoose.Types.ObjectId.isValid(paramId)) {
    throw new Error("Invalid ObjectId");
  }
  return true;
};
module.exports = validators;
