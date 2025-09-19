const mongoose = require("mongoose");
// Load .env variables if present
require("dotenv").config();
const DaTaFix = require("./models/DaTaFix");
const countries = require("./countries.cjs"); // Đã chuyển sang CommonJS ở bước dưới

// Chuyển đổi dữ liệu: loại bỏ dấu "+" ở phone và chỉ lấy các trường cần thiết
const quocGiaList = countries.map((item) => ({
  code: item.code,
  label: item.label,
  phone: item.phone ? item.phone.replace(/\+/g, "") : "",
}));

// MongoDB connection string: prefer MONGO_URI or MONGODB_URI from .env, fallback to localhost
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/giaoban_bvt";

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    const result = await DaTaFix.updateOne(
      {},
      { $set: { QuocGia: quocGiaList } },
      { upsert: true }
    );

    // In số lượng mục đã ghi (dựa trên danh sách nguồn)
    console.log(`Đã ghi ${quocGiaList.length} quốc gia vào trường QuocGia.`);

    // Đóng kết nối mongoose một cách gọn gàng
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Lỗi kết nối hoặc insert:", err);
    // Cố gắng ngắt kết nối nếu đã kết nối
    if (mongoose.connection && mongoose.connection.readyState) {
      try {
        mongoose.disconnect();
      } catch (e) {
        // ignore
      }
    }
    process.exit(1);
  });
