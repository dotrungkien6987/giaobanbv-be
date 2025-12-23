const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

// Import shared CORS config
const { whitelist, corsOptionsDelegate } = require("./config/corsConfig");

const { sendResponse } = require("./helpers/utils");

const indexRouter = require("./routes/index");

const app = express();

// Tăng giới hạn kích thước payload
app.use(bodyParser.json({ limit: "1mb" })); // 10mb là giới hạn mới, bạn có thể thay đổi theo nhu cầu của mình
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//chỉnh CORS
app.use(cors(corsOptionsDelegate));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", indexRouter);

// User-facing Notification Routes (GET notifications, settings, mark as read)
const notificationUserRoutes = require("./modules/workmanagement/routes/notificationRoutes");
app.use("/api/notifications", notificationUserRoutes);

// Admin Notification System Routes (Admin-Configurable v2: Types & Templates CRUD)
const notificationApi = require("./modules/workmanagement/routes/notification.api");
app.use("/api/workmanagement/notifications", notificationApi);

const mongoose = require("mongoose");
const mongoURI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaobanbv";
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
