const crypto = require("crypto");
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
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    mustChangePassword: { type: Boolean, default: false },
    Email: { type: String, require: false, default: "" },
    PhanQuyen: {
      type: String,
      enum: ["admin", "manager", "nomal", "daotao", "noibo", "qlcl", "cntt"],
    },
    KhoaTaiChinh: { type: [String], require: false, default: [] },
    DashBoard: { type: [String], require: false, default: [] },
    KhoaLichTruc: { type: [String], require: false, default: [] },
  },
  { timestamps: true },
);

function createTokenJti() {
  return crypto.randomBytes(16).toString("hex");
}

userSchema.methods.toJSON = function () {
  const user = this._doc;
  delete user.PassWord; // sửa: xóa đúng trường schema
  delete user.isDeleted;
  delete user.failedLoginAttempts;
  delete user.lockUntil;
  return user;
};

userSchema.methods.generateToken = async function () {
  const accessToken = await jwt.sign(
    { _id: this._id, jti: createTokenJti() },
    JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    },
  );
  return accessToken;
};

const User = mongosee.model("User", userSchema);
module.exports = User;
