const { catchAsync,sendResponse } = require("../../helpers/utils");
const logEventModel  = require("../../models/his/logEventModel");
const logevent = {};

logevent.getLogEvents  = catchAsync(async (req, res, next) => {
  const logEvents = await logEventModel.getAllLogEvents();
 
  //Response
  sendResponse(res, 200, true,{logEvents}, null, "Get Log Events success");
});


logevent.insert = catchAsync(async (req, res, next) => {
  //get data from request
  const logEvent = req.body;
 const newLogEvent = await logEventModel.createLogEvent(logEvent);
    res.status(201).json(newLogEvent);
  //Business Logic Validation
 
  //Response
  sendResponse(res, 200, true,{newLogEvent}, null, "Created logEvent success");
});
module.exports = logevent;
