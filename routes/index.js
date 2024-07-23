var express = require("express");
var router = express.Router();

//authApi
const authApi = require("./auth.api");
router.use("/auth", authApi);

// //userApi
const userApi = require("./user.api");
router.use("/user", userApi);

// //khoaApi
const khoaApi = require("./khoa.api");
router.use("/khoa", khoaApi);

//bcgiaobanApi
const bcgiaobanApi = require("./bcgiaoban.api");
router.use("/bcgiaoban", bcgiaobanApi);

//baocaongayApi
const baocaongayApi = require("./baocaongay.api");
router.use("/baocaongay", baocaongayApi);

//baocaongayApi
const baocaosucoApi = require("./baocaosuco.api");
router.use("/baocaosuco", baocaosucoApi);

//baocaongayApi
const dashboardApi = require("./dashboard.api");
router.use("/dashboard", dashboardApi);

//baocaongayApi
const khuyencaokhoaApi = require("./khuyencaokhoa.api");
router.use("/khuyencaokhoa", khuyencaokhoaApi);

const daotaoApi = require("./daotao.api");
router.use("/daotao", daotaoApi);

const nhanvienApi = require("./nhanvien.api");
router.use("/nhanvien", nhanvienApi);

const lopdaotaoApi = require("./lopdaotao.api");
router.use("/lopdaotao", lopdaotaoApi);

const hinhthuccapnhatApi = require("./hinhthuccapnhat.api");
router.use("/hinhthuccapnhat", hinhthuccapnhatApi);

const datafixApi = require("./datafix.api");
router.use("/datafix", datafixApi);

module.exports = router;
