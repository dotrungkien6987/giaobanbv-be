const { catchAsync,sendResponse } = require("../../helpers/utils");
const logEventModel  = require("../../models/his/logEventModel");
const bnNgoaiTinhModel = require("../../models/his/bnNgoaiTinh");
const { query } = require("express-validator");
const logevent = {};

// logevent.getLogEvents  = catchAsync(async (req, res, next) => {
//   const logEvents = await logEventModel.getAllLogEvents();
 
//   //Response
//   sendResponse(res, 200, true,{logEvents}, null, "Get Log Events success");
// });

logevent.getLogEvents = catchAsync(async (req, res, next) => {
  // Lấy tham số từ query parameters
  const { fromdate, todate } = req.query;
  console.log('query',req.query);
  console.log('getlogs',fromdate, todate);
  // Gọi hàm với tham số từ query
  const logEvents = await bnNgoaiTinhModel.getNgoaiTinhNgoaiTru(fromdate, todate);
 
  // Response
  sendResponse(res, 200, true,  logEvents, null, "Get Log Events success");
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


logevent.updateLogEvent = catchAsync(async (req, res, next) => {
  //get data from request
  const logEventData = req.body;
  const logeventid = req.params.logeventid;
 const newLogEvent = await logEventModel.updateLogEvent(logeventid,logEventData);
    res.status(201).json(newLogEvent);
  //Business Logic Validation
 
  //Response
  sendResponse(res, 200, true,{newLogEvent}, null, "Created logEvent success");
});

logevent.partialUpdateLogEvent = catchAsync(async (req, res, next) => {
  const logeventid = req.params.logeventid;
  const logEventData = req.body;

  const updatedLogEvent = await logEventModel.partialUpdateLogEvent(logeventid, logEventData);
  sendResponse(res, 200, true, { updatedLogEvent }, null, "Updated logEvent success");
});

module.exports = logevent;
