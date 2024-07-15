const { body } = require("express-validator");
const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const DaTaFix = require("../models/DaTaFix");

const datafixController = {};

datafixController.getDataFix = catchAsync(async (req, res, next) => {
  let datafix = await DaTaFix.find();
  if (!datafix)
    throw new AppError(400, "Không có DataFix", "Get DataFix Error");
  console.log("datafix", datafix);
  return sendResponse(res, 200, true, { datafix }, null, "Get DataFix Success");
});

datafixController.insertOrUpdateDataFix = catchAsync(async (req, res, next) => {
  let { datafix } = req.body;
  console.log("body", datafix);
  let datafixUpdate = await DaTaFix.findById(datafix._id);
  if (datafixUpdate) {
    const id = datafixUpdate._id;
    datafixUpdate = await DaTaFix.findByIdAndUpdate(id, datafix, { new: true });
  } else {
    datafixUpdate = await DaTaFix.create(datafix);
  }

  //response
  sendResponse(
    res,
    200,
    true,
    { datafixUpdate },
    null,
    "Cập nhật datafix thành công"
  );
});
module.exports = datafixController;
