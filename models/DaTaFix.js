const mongoose = require("mongoose");
const NhomHinhThucCapNhat = require("./NhomHinhThucCapNhat");
const Schema = mongoose.Schema;
const datafixSchema = Schema({
  NhomHinhThucCapNhat: [
    {
      Ten: { type: String, required: true },
      Loai: { type: String, required: false, default: "" },
      Ma: { type: String, required: true, default: "" },

      _id: false,
    },
  ],
  VaiTro: [{ VaiTro: { type: String, required: true }, _id: false }],
  DonVi: [{ DonVi: { type: String, required: true }, _id: false }],
  ChucDanh: [{ ChucDanh: { type: String, required: true }, _id: false }],
  ChucVu: [{ ChucVu: { type: String, required: true }, _id: false }],
  LoaiHinhYHTH: [
    { LoaiHinhYHTH: { type: String, required: true }, _id: false },
  ],
  ChuyenDeTTT: [{ ChuyenDeTTT: { type: String, required: true }, _id: false }],
  MucDichXuatCanh: [
    { MucDichXuatCanh: { type: String, required: true }, _id: false },
  ],
  DonViGioiThieu: [
    { DonViGioiThieu: { type: String, required: true }, _id: false },
  ],
  TrinhDoChuyenMon: [
    {
      TrinhDoChuyenMon: { type: String, required: true },
      QuyDoi1: { type: String, required: false, default: "" },
      QuyDoi2: { type: String, required: false, default: "" },
      _id: false,
    },
  ],
  NguonKinhPhi: [
    { NguonKinhPhi: { type: String, required: true }, _id: false },
  ],
  NoiDaoTao: [{ NoiDaoTao: { type: String, required: true }, _id: false }],
  HinhThucDaoTao: [
    { HinhThucDaoTao: { type: String, required: true }, _id: false },
  ],
  DanToc: [{ DanToc: { type: String, required: true }, _id: false }],
  PhamViHanhNghe: [
    { PhamViHanhNghe: { type: String, required: true }, _id: false },
  ],
  Tinh: [
    {
      TenTinh: { type: String, required: true },
      MaTinh: { type: String, required: true },
      DienTich: { type: Number, required: false },
      DanSo: { type: Number, required: false },
      KhoangCach: { type: Number, required: false },
      _id: false,
    },
  ],
  Huyen: [
    {
      TenHuyen: { type: String, required: true },
      MaHuyen: { type: String, required: true },
      MaTinh: { type: String, required: true },
      DienTich: { type: Number, required: false },
      DanSo: { type: Number, required: false },
      KhoangCach: { type: Number, required: false },
      _id: false,
    },
  ],
  Xa: [
    {
      TenXa: { type: String, required: true },
      MaXa: { type: String, required: true },
      MaHuyen: { type: String, required: true },
      MaTinh: { type: String, required: true },
      DienTich: { type: Number, required: false },
      DanSo: { type: Number, required: false },
      KhoangCach: { type: Number, required: false },
      _id: false,
    },
  ],
  QuocGia: [
    {
      code: { type: String, required: true },
      label: { type: String, required: true },
      phone: { type: String, required: false, default: "" },

      _id: false,
    },
  ],
  KhoaBinhQuanBenhAn: [
    {
      TenKhoa: { type: String, required: true },
      
      KhoaID: { type: Number, required: true },
      LoaiKhoa: { type: String, required: false, default: "" },

      _id: false,
    },
  ],
});
const DaTaFix = mongoose.model("DaTaFix", datafixSchema);
module.exports = DaTaFix;
