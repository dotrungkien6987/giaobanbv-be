const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const logger = require("morgan");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

// Import shared CORS config
const { whitelist, corsOptionsDelegate } = require("./config/corsConfig");

const { sendResponse } = require("./helpers/utils");
const {
  createCutoverGuard,
} = require("./modules/workmanagement/helpers/legacyCutover");

const indexRouter = require("./routes/index");

const app = express();
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: false,
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
  strictTransportSecurity: false,
  xFrameOptions: {
    action: "sameorigin",
  },
});

app.disable("x-powered-by");
app.use(securityHeaders);
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  next();
});

// Tăng giới hạn kích thước payload
app.use(bodyParser.json({ limit: "1mb" })); // 10mb là giới hạn mới, bạn có thể thay đổi theo nhu cầu của mình
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(mongoSanitize());
app.use(cookieParser());
//chỉnh CORS
app.use(cors(corsOptionsDelegate));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", indexRouter);

// User-facing Notification Routes (GET notifications, settings, mark as read)
const notificationUserRoutes = require("./modules/workmanagement/routes/notificationRoutes");
app.use(
  "/api/notifications",
  createCutoverGuard("notifications"),
  notificationUserRoutes,
);

// Admin Notification System Routes (Admin-Configurable v2: Types & Templates CRUD)
const notificationApi = require("./modules/workmanagement/routes/notification.api");
app.use(
  "/api/workmanagement/notifications",
  createCutoverGuard("notifications"),
  notificationApi,
);

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
  console.error("ERROR", {
    statusCode: err.statusCode ? err.statusCode : 500,
    errorType: err.isOperational ? err.errorType : "Internal Server Error",
    method: req.method,
    path: req.originalUrl,
  });
  return sendResponse(
    res,
    err.statusCode ? err.statusCode : 500,
    false,
    null,
    { message: err.message },
    err.isOperational ? err.errorType : "Internal Server Error",
  );
});
app.get("/images", function (request, response) {
  response.render("images");
});
module.exports = app;
