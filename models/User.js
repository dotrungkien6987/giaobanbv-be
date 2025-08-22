const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const userSchema = Schema(
  {
    UserName: { type: String, require: true, unique: true },
    PassWord: { type: String, require: true, select: false },

    KhoaID: { type: Schema.ObjectId, required: true, ref: "Khoa" },
    NhanVienID: { type: Schema.ObjectId, required: false, ref: "NhanVien" },
    HoTen: { type: String, require: false, default: "" },
    UserHis: { type: String, require: false, default: "" },

    isDeleted: { type: Boolean, default: false, select: false },
    Email: { type: String, require: false, default: "" },
    PhanQuyen: {
      type: String,
      enum: ["admin", "manager", "nomal", "daotao", "noibo"],
    },
    KhoaTaiChinh: { type: [String], require: false, default: [] },
    DashBoard: { type: [String], require: false, default: [] },
    KhoaLichTruc: { type: [String], require: false, default: [] },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this._doc;
  delete user.PassWord; // sửa: xóa đúng trường schema
  delete user.isDeleted;
  return user;
};

userSchema.methods.generateToken = async function () {
  const accessToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
  return accessToken;
};

const User = mongosee.model("User", userSchema);
module.exports = User;
