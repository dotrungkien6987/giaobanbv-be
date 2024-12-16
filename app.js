const express = require("express");
const bodyParser = require('body-parser');
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
var whitelist = [
  "http://192.168.5.136:3001",
  `https://bvdktphutho.net`,
  `http://bvdktphutho.net`,
  `http://192.168.5.136:3000`,
  `http://localhost:3000`,
  `http://localhost:3001`,
  `http://192.168.1.248:3000`,
  `http://27.72.116.110:777`,
  `http://bvdkphutho.io.vn:777`,
  `http://api.bvdkphutho.io.vn`,
];
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (whitelist.indexOf(req.header("Origin")) !== -1) {
    corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
};

const { sendResponse } = require("./helpers/utils");

const indexRouter = require("./routes/index");

const app = express();

// Tăng giới hạn kích thước payload
app.use(bodyParser.json({ limit: '1mb' })); // 10mb là giới hạn mới, bạn có thể thay đổi theo nhu cầu của mình
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//chỉnh CORS
app.use(cors(corsOptionsDelegate));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", indexRouter);

const mongoose = require("mongoose");
const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log(err));

//Error handlers
//catch 404
app.use((req, res, next) => {
  const err = new Error("Not found");
  err.statusCode = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log("ERROR", err);
  return sendResponse(
    res,
    err.statusCode ? err.statusCode : 500,
    false,
    null,
    { message: err.message },
    err.isOperational ? err.errorType : "Internal Server Error"
  );
});
app.get("/images", function (request, response) {
  response.render("images");
});
module.exports = app;
