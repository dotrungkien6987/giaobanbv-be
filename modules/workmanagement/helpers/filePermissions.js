const mongoose = require("mongoose");
const CongViec = require("../models/CongViec");

async function canAccessCongViec(congViecId, nhanVienId, isAdmin = false) {
  if (!mongoose.Types.ObjectId.isValid(congViecId)) return false;
  if (isAdmin) return true;
  const cv = await CongViec.findById(congViecId).lean();
  if (!cv || cv.isDeleted) return false;
  const nvId = String(nhanVienId || "");
  if (!nvId) return false;
  if (String(cv.NguoiGiaoViecID) === nvId) return true;
  if (String(cv.NguoiChinhID) === nvId) return true;
  const thamGia = (cv.NguoiThamGia || []).some(
    (x) => String(x.NhanVienID) === nvId
  );
  return thamGia;
}

function canDeleteFile(fileDoc, nhanVienId, isAdmin = false) {
  if (isAdmin) return true;
  return String(fileDoc.NguoiTaiLenID) === String(nhanVienId || "");
}

module.exports = { canAccessCongViec, canDeleteFile };
