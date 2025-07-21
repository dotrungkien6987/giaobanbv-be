const mongoose = require("mongoose");
const DaTaFix = require("./models/DaTaFix");
const countries = require("./countries.cjs"); // Đã chuyển sang CommonJS ở bước dưới

// Chuyển đổi dữ liệu: loại bỏ dấu "+" ở phone và chỉ lấy các trường cần thiết
const quocGiaList = countries.map((item) => ({
  code: item.code,
  label: item.label,
  phone: item.phone ? item.phone.replace(/\+/g, "") : "",
}));

mongoose
  .connect("mongodb://127.0.0.1:27017/giaoban_bvt", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    await DaTaFix.updateOne(
      {},
      { $set: { QuocGia: quocGiaList } },
      { upsert: true }
    );
    console.log("Đã thêm đầy đủ quốc gia vào trường QuocGia!");
    process.exit();
  })
  .catch((err) => {
    console.error("Lỗi kết nối hoặc insert:", err);
    process.exit(1);
  });
