/**
 * Seed All Notification Types (45 types)
 * Migrated from old triggerService config
 *
 * Run: node seeds/notificationTypes.seed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("../modules/workmanagement/models/NotificationType");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

// Common variables for CongViec (1-19, 44-45)
// Total: 29 fields (6 recipient + 23 display) - matches buildCongViecNotificationData()
const congViecVariables = [
  // ============================================
  // RECIPIENT CANDIDATES (6 fields)
  // ============================================
  {
    name: "NguoiChinhID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người được giao việc chính",
  },
  {
    name: "NguoiGiaoViecID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người giao việc",
  },
  {
    name: "NguoiThamGia",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Danh sách người tham gia",
  },
  {
    name: "NguoiThamGiaMoi",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người tham gia mới được thêm",
  },
  {
    name: "NguoiThamGiaBiXoa",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người tham gia bị xóa",
  },
  {
    name: "NguoiChinhMoi",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người chính mới (khi thay đổi người chính)",
  },
  // ============================================
  // DISPLAY FIELDS (23 fields)
  // ============================================
  { name: "_id", type: "ObjectId", description: "ID công việc" },
  { name: "MaCongViec", type: "String", description: "Mã công việc" },
  { name: "TieuDe", type: "String", description: "Tiêu đề công việc" },
  { name: "MoTa", type: "String", description: "Mô tả công việc" },
  {
    name: "TenNguoiChinh",
    type: "String",
    description: "Tên người được giao chính",
  },
  { name: "TenNguoiGiao", type: "String", description: "Tên người giao việc" },
  {
    name: "TenNguoiCapNhat",
    type: "String",
    description: "Tên người cập nhật",
  },
  {
    name: "TenNguoiChinhMoi",
    type: "String",
    description: "Tên người chính mới",
  },
  {
    name: "TenNguoiThucHien",
    type: "String",
    description: "Tên người thực hiện hành động",
  },
  {
    name: "MucDoUuTienMoi",
    type: "String",
    description: "Độ ưu tiên mới: THAP/BINH_THUONG/CAO/KHAN_CAP",
  },
  { name: "MucDoUuTienCu", type: "String", description: "Độ ưu tiên cũ" },
  { name: "TrangThai", type: "String", description: "Trạng thái hiện tại" },
  { name: "TienDoMoi", type: "Number", description: "Tiến độ % mới" },
  {
    name: "NgayHetHan",
    type: "String",
    description: "Ngày hết hạn (DD/MM/YYYY)",
  },
  { name: "NgayHetHanCu", type: "String", description: "Ngày hết hạn cũ" },
  { name: "NgayHetHanMoi", type: "String", description: "Ngày hết hạn mới" },
  { name: "TenFile", type: "String", description: "Tên file đính kèm" },
  { name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
  {
    name: "TenNguoiComment",
    type: "String",
    description: "Tên người bình luận",
  },
];

// Common variables for YeuCau (20-36)
// Total: 30 fields (10 recipient + 20 display) - matches buildYeuCauNotificationData()
const yeuCauVariables = [
  // ============================================
  // RECIPIENT CANDIDATES (10 fields)
  // ============================================
  {
    name: "NguoiYeuCauID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người tạo yêu cầu",
  },
  {
    name: "NguoiXuLyID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người xử lý yêu cầu",
  },
  {
    name: "NguoiDuocDieuPhoiID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người được điều phối xử lý",
  },
  {
    name: "arrNguoiDieuPhoiID",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Danh sách điều phối viên khoa",
  },
  {
    name: "arrQuanLyKhoaID",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Danh sách quản lý/trưởng khoa",
  },
  {
    name: "arrNguoiLienQuanID",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description:
      "Danh sách tất cả người liên quan (auto-computed từ getRelatedNhanVien)",
  },
  {
    name: "NguoiSuaID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người chỉnh sửa yêu cầu",
  },
  {
    name: "NguoiBinhLuanID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người bình luận",
  },
  {
    name: "NguoiXoaID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người xóa yêu cầu",
  },
  {
    name: "NguoiNhanID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người nhận (dùng cho các action đặc biệt)",
  },
  // ============================================
  // DISPLAY FIELDS (20 fields)
  // ============================================
  { name: "_id", type: "ObjectId", description: "ID yêu cầu" },
  { name: "MaYeuCau", type: "String", description: "Mã yêu cầu" },
  { name: "TieuDe", type: "String", description: "Tiêu đề yêu cầu" },
  { name: "MoTa", type: "String", description: "Mô tả chi tiết" },
  { name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },
  { name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" },
  { name: "TenLoaiYeuCau", type: "String", description: "Loại yêu cầu" },
  { name: "TenNguoiYeuCau", type: "String", description: "Tên người yêu cầu" },
  { name: "TenNguoiXuLy", type: "String", description: "Tên người xử lý" },
  {
    name: "TenNguoiDuocDieuPhoi",
    type: "String",
    description: "Tên người được điều phối",
  },
  { name: "TenNguoiSua", type: "String", description: "Tên người chỉnh sửa" },
  {
    name: "TenNguoiThucHien",
    type: "String",
    description: "Tên người thực hiện hành động",
  },
  { name: "TenNguoiXoa", type: "String", description: "Tên người xóa" },
  {
    name: "TenNguoiComment",
    type: "String",
    description: "Tên người bình luận",
  },
  {
    name: "ThoiGianHen",
    type: "String",
    description: "Thời gian hẹn (DD/MM/YYYY HH:mm)",
  },
  { name: "ThoiGianHenCu", type: "String", description: "Thời gian hẹn cũ" },
  { name: "TrangThai", type: "String", description: "Trạng thái yêu cầu" },
  { name: "LyDoTuChoi", type: "String", description: "Lý do từ chối" },
  { name: "DiemDanhGia", type: "Number", description: "Điểm đánh giá (1-5)" },
  { name: "NoiDungDanhGia", type: "String", description: "Nội dung đánh giá" },
  { name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
  {
    name: "NoiDungThayDoi",
    type: "String",
    description: "Mô tả nội dung thay đổi",
  },
];

// Common variables for KPI (37-43)
// Total: 16 fields (2 recipient + 14 display) - matches buildKPINotificationData()
const kpiVariables = [
  // ============================================
  // RECIPIENT CANDIDATES (2 fields)
  // ============================================
  {
    name: "NhanVienID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Nhân viên được đánh giá KPI",
  },
  {
    name: "NguoiDanhGiaID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người đánh giá (quản lý trực tiếp)",
  },
  // ============================================
  // DISPLAY FIELDS (14 fields)
  // ============================================
  { name: "_id", type: "ObjectId", description: "ID đánh giá KPI" },
  {
    name: "TenNhanVien",
    type: "String",
    description: "Tên nhân viên được đánh giá",
  },
  {
    name: "TenNguoiDanhGia",
    type: "String",
    description: "Tên người đánh giá",
  },
  { name: "TenChuKy", type: "String", description: "Tên chu kỳ đánh giá" },
  { name: "TenTieuChi", type: "String", description: "Tên tiêu chí đánh giá" },
  {
    name: "TenNhiemVu",
    type: "String",
    description: "Tên nhiệm vụ thường quy",
  },
  { name: "TenNguoiDuyet", type: "String", description: "Tên người duyệt KPI" },
  { name: "TongDiemKPI", type: "Number", description: "Tổng điểm KPI" },
  { name: "DiemTuDanhGia", type: "Number", description: "Điểm tự đánh giá" },
  { name: "DiemQL", type: "Number", description: "Điểm quản lý đánh giá" },
  {
    name: "DiemNhiemVu",
    type: "Number",
    description: "Điểm nhiệm vụ (computed)",
  },
  { name: "PhanHoi", type: "String", description: "Phản hồi của nhân viên" },
  {
    name: "LyDo",
    type: "String",
    description: "Lý do (hủy duyệt, từ chối, etc.)",
  },
];

const notificationTypes = [
  // CÔNG VIỆC (1-19)
  {
    code: "congviec-giao-viec",
    name: "Thông báo giao việc mới",
    description: "Được giao công việc mới",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-huy-giao",
    name: "Thông báo hủy giao việc",
    description: "Công việc bị hủy giao",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-huy-hoan-thanh-tam",
    name: "Thông báo yêu cầu làm lại",
    description: "Hủy hoàn thành tạm, cần làm lại",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-tiep-nhan",
    name: "Thông báo tiếp nhận công việc",
    description: "Nhân viên đã tiếp nhận",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-hoan-thanh",
    name: "Thông báo hoàn thành công việc",
    description: "Nhân viên báo hoàn thành",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-hoan-thanh-tam",
    name: "Thông báo chờ duyệt hoàn thành",
    description: "Chờ duyệt hoàn thành",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-duyet-hoan-thanh",
    name: "Thông báo được duyệt hoàn thành",
    description: "Công việc được duyệt",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-tu-choi",
    name: "Thông báo bị từ chối",
    description: "Công việc bị từ chối",
    Nhom: "Công việc",
    variables: congViecVariables,
    isActive: false,
  },
  {
    code: "congviec-mo-lai",
    name: "Thông báo mở lại công việc",
    description: "Công việc được mở lại",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-binh-luan",
    name: "Thông báo bình luận mới",
    description: "Có bình luận mới",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-cap-nhat-deadline",
    name: "Thông báo thay đổi deadline",
    description: "Deadline thay đổi",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-gan-nguoi-tham-gia",
    name: "Thông báo thêm người tham gia",
    description: "Được thêm vào công việc",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-xoa-nguoi-tham-gia",
    name: "Thông báo xóa người tham gia",
    description: "Bị xóa khỏi công việc",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-thay-doi-nguoi-chinh",
    name: "Thông báo thay đổi người chính",
    description: "Người chịu trách nhiệm thay đổi",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-thay-doi-uu-tien",
    name: "Thông báo thay đổi độ ưu tiên",
    description: "Độ ưu tiên thay đổi",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-cap-nhat-tien-do",
    name: "Thông báo cập nhật tiến độ",
    description: "Tiến độ được cập nhật",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-upload-file",
    name: "Thông báo upload tài liệu",
    description: "Có tài liệu mới",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-xoa-file",
    name: "Thông báo xóa tài liệu",
    description: "Tài liệu bị xóa",
    Nhom: "Công việc",
    variables: congViecVariables,
  },
  {
    code: "congviec-deadline-approaching",
    name: "Thông báo deadline sắp đến",
    description: "Công việc sắp hết hạn",
    Nhom: "Hệ thống",
    variables: congViecVariables,
  },

  // YÊU CẦU (20-36)
  {
    code: "yeucau-tao-moi",
    name: "Thông báo tạo yêu cầu mới",
    description: "Có yêu cầu mới từ khoa",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-tiep-nhan",
    name: "Thông báo tiếp nhận yêu cầu",
    description: "Yêu cầu được tiếp nhận",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-tu-choi",
    name: "Thông báo từ chối yêu cầu",
    description: "Yêu cầu bị từ chối",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-dieu-phoi",
    name: "Thông báo điều phối yêu cầu",
    description: "Yêu cầu được điều phối",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-gui-ve-khoa",
    name: "Thông báo gửi về khoa",
    description: "Yêu cầu được gửi về",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-hoan-thanh",
    name: "Thông báo hoàn thành yêu cầu",
    description: "Yêu cầu hoàn thành",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-huy-tiep-nhan",
    name: "Thông báo hủy tiếp nhận",
    description: "Hủy tiếp nhận yêu cầu",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-doi-thoi-gian-hen",
    name: "Thông báo đổi thời gian hẹn",
    description: "Thời gian hẹn thay đổi",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-danh-gia",
    name: "Thông báo đánh giá yêu cầu",
    description: "Có đánh giá chất lượng",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-dong",
    name: "Thông báo đóng yêu cầu",
    description: "Yêu cầu được đóng",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-mo-lai",
    name: "Thông báo mở lại yêu cầu",
    description: "Yêu cầu được mở lại",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-xu-ly-tiep",
    name: "Thông báo yêu cầu xử lý tiếp",
    description: "Cần xử lý tiếp",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-nhac-lai",
    name: "Thông báo nhắc lại yêu cầu",
    description: "Nhắc nhở xử lý yêu cầu",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-bao-quan-ly",
    name: "Thông báo báo quản lý",
    description: "Escalate lên quản lý",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-xoa",
    name: "Thông báo xóa yêu cầu",
    description: "Yêu cầu bị xóa",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-sua",
    name: "Thông báo sửa yêu cầu",
    description: "Thông tin yêu cầu thay đổi",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },
  {
    code: "yeucau-binh-luan",
    name: "Thông báo bình luận yêu cầu",
    description: "Có bình luận mới",
    Nhom: "Yêu cầu",
    variables: yeuCauVariables,
  },

  // KPI (37-43)
  {
    code: "kpi-tao-danh-gia",
    name: "Thông báo tạo đánh giá KPI",
    description: "Chu kỳ KPI mới",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-duyet-danh-gia",
    name: "Thông báo duyệt KPI",
    description: "KPI được duyệt",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-duyet-tieu-chi",
    name: "Thông báo duyệt tiêu chí",
    description: "Tiêu chí được duyệt",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-huy-duyet",
    name: "Thông báo hủy duyệt KPI",
    description: "KPI bị hủy duyệt",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-cap-nhat-diem-ql",
    name: "Thông báo cập nhật điểm QL",
    description: "Điểm QL thay đổi",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-tu-danh-gia",
    name: "Thông báo tự đánh giá",
    description: "Nhân viên hoàn thành tự đánh giá",
    Nhom: "KPI",
    variables: kpiVariables,
  },
  {
    code: "kpi-phan-hoi",
    name: "Thông báo phản hồi KPI",
    description: "Có phản hồi về đánh giá",
    Nhom: "KPI",
    variables: kpiVariables,
  },

  // DEADLINE (44-45)
  {
    code: "congviec-deadline-overdue",
    name: "Thông báo deadline quá hạn",
    description: "Công việc quá hạn",
    Nhom: "Hệ thống",
    variables: congViecVariables,
  },
];

async function seedNotificationTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    let created = 0;
    let updated = 0;

    for (const typeData of notificationTypes) {
      const existing = await NotificationType.findOne({ code: typeData.code });

      const type = await NotificationType.findOneAndUpdate(
        { code: typeData.code },
        { ...typeData, isActive: typeData.isActive !== false }, // Default true if not specified
        { upsert: true, new: true }
      );

      if (existing) {
        updated++;
        console.log(`♻️  Updated: ${type.code}`);
      } else {
        created++;
        console.log(`✅ Created: ${type.code}`);
      }
    }

    console.log(`\n📊 Seed Complete:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${notificationTypes.length}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

seedNotificationTypes();
