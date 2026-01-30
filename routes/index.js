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

// //nhomkhoasothutuApi
const nhomKhoaSoThuTuApi = require("./nhomkhoasothutu.api");
router.use("/nhomkhoasothutu", nhomKhoaSoThuTuApi);

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

// Khuyến cáo khoa bình quân bệnh án
const khuyenCaoKhoaBQBAApi = require("./khuyencaokhoa.bqba.api");
router.use("/khuyen-cao-khoa-bqba", khuyenCaoKhoaBQBAApi);

const daotaoApi = require("./daotao.api");
router.use("/daotao", daotaoApi);

const nhanvienApi = require("./nhanvien.api");
router.use("/nhanvien", nhanvienApi);

const lopdaotaoApi = require("./lopdaotao.api");
router.use("/lopdaotao", lopdaotaoApi);

const hinhthuccapnhatApi = require("./hinhthuccapnhat.api");
router.use("/hinhthuccapnhat", hinhthuccapnhatApi);

const hoidongApi = require("./hoidong.api");
router.use("/hoidong", hoidongApi);

const datafixApi = require("./datafix.api");
router.use("/datafix", datafixApi);

const lopdaotaonhanvienApi = require("./lopdaotaonhanvien.api");
router.use("/lopdaotaonhanvien", lopdaotaonhanvienApi);

const lopdaotaonhanvientamApi = require("./lopdaotaonhanvientam.api");
router.use("/lopdaotaonhanvientam", lopdaotaonhanvientamApi);

const lopdaotaonhanviendt06Api = require("./lopdaotaonhanviendt06.api");
router.use("/lopdaotaonhanviendt06", lopdaotaonhanviendt06Api);

// Loai Chuyen Mon
const loaichuyenmonApi = require("./loaichuyenmon.api");
router.use("/loaichuyenmon", loaichuyenmonApi);

const logeventApi = require("./his/logevent.api");
router.use("/logevent", logeventApi);

const fileApi = require("./file.api");
router.use("/file", fileApi);

// API quản lý lịch trực
const lichTrucApi = require("./lichtruc.api");
router.use("/lichtruc", lichTrucApi);

// API quản lý số thứ tự
const soThuTuApi = require("./his/sothutu.api");
router.use("/his/sothutu", soThuTuApi);

// API quản lý dịch vụ trùng
const dichVuTrungApi = require("./his/dichvutrung.api");
router.use("/his/dichvutrung", dichVuTrungApi);

// API quản lý đoàn vào
const doanVaoApi = require("./doanvao.api");
router.use("/doanvao", doanVaoApi);

// API quản lý đoàn ra
const doanRaApi = require("./doanra.api");
router.use("/doanra", doanRaApi);

// API quản lý nhóm việc user
const nhomViecUserApi = require("./nhomViecUser");
router.use("/nhomviec-user", nhomViecUserApi);

// API quản lý nhiệm vụ thường quy
const nhiemvuThuongQuyApi = require("./nhiemvuThuongQuy");
router.use("/nhiemvu-thuongquy", nhiemvuThuongQuyApi);

// API workmanagement module
const workManagementApi = require("../modules/workmanagement/routes");
router.use("/workmanagement", workManagementApi);

// API backup & restore
const backupApi = require("./backup.api");
router.use("/backup", backupApi);

// Generic attachments API
const attachmentsApi = require("./attachments.api");
router.use("/attachments", attachmentsApi);

// TapSan CRUD API
const tapsanApi = require("./tapsan.api");
router.use("/tapsan", tapsanApi);

// TapSan BaiBao API
const tapsanBaiBaoApi = require("./tapsanbaibao");
router.use("/tapsan", tapsanBaiBaoApi);

// QuyTrinhISO API (ISO Document Management)
const quyTrinhISOApi = require("./quyTrinhISO.api");
router.use("/quytrinhiso", quyTrinhISOApi);

module.exports = router;
