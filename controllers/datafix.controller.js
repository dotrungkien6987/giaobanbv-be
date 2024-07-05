const { body } = require("express-validator");
const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const DaTaFix = require("../models/DaTaFix");

const datafixController = {};

datafixController.getDataFix = catchAsync(async (req, res, next) => {
  
  let datafix = await DaTaFix.find();
  if (!datafix)
    throw new AppError(400, "Không có DataFix", "Get DataFix Error");
  console.log("datafix",datafix);
  return sendResponse(res, 200, true, { datafix }, null, "Get DataFix Success");
});

module.exports = datafixController;
