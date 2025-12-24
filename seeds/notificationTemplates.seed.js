/**
 * Seed All Notification Templates (90+ templates)
 * Each type has 2-3 templates for different recipient groups
 *
 * Run: node seeds/notificationTemplates.seed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

const templates = [
  // CÔNG VIỆC - GIAO VIỆC (1)
  {
    name: "Thông báo cho người được giao",
    typeCode: "congviec-giao-viec",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - {{TieuDe}}",
    bodyTemplate: "Bạn được giao công việc mới từ {{TenNguoiThucHien}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "assignment",
    priority: "normal",
  },
  {
    name: "Thông báo cho người tham gia",
    typeCode: "congviec-giao-viec",
    recipientConfig: { variables: ["arrNguoiLienQuanID"] },
    titleTemplate: "{{MaCongViec}} - {{TieuDe}}",
    bodyTemplate: "Bạn được thêm vào công việc từ {{TenNguoiThucHien}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "group_add",
    priority: "normal",
  },

  // CÔNG VIỆC - HỦY GIAO (2)
  {
    name: "Thông báo cho người bị hủy",
    typeCode: "congviec-huy-giao",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Hủy giao việc",
    bodyTemplate: "Công việc '{{TieuDe}}' đã bị hủy bởi {{TenNguoiThucHien}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "cancel",
    priority: "normal",
  },

  // CÔNG VIỆC - HỦY HOÀN THÀNH TẠM (3)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-huy-hoan-thanh-tam",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Yêu cầu làm lại",
    bodyTemplate: "Công việc '{{TieuDe}}' cần làm lại. Lý do: {{MoTa}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "undo",
    priority: "high",
  },

  // CÔNG VIỆC - TIẾP NHẬN (4)
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-tiep-nhan",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Đã tiếp nhận",
    bodyTemplate: "{{TenNguoiThucHien}} đã tiếp nhận công việc '{{TieuDe}}'",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "check_circle",
    priority: "low",
  },

  // CÔNG VIỆC - HOÀN THÀNH (5)
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-hoan-thanh",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Hoàn thành",
    bodyTemplate: "{{TenNguoiThucHien}} đã hoàn thành công việc '{{TieuDe}}'",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "task_alt",
    priority: "normal",
  },

  // CÔNG VIỆC - HOÀN THÀNH TẠM (6)
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-hoan-thanh-tam",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Chờ duyệt",
    bodyTemplate:
      "{{TenNguoiThucHien}} báo hoàn thành '{{TieuDe}}'. Vui lòng duyệt.",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "pending",
    priority: "normal",
  },

  // CÔNG VIỆC - DUYỆT HOÀN THÀNH (7)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-duyet-hoan-thanh",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Đã duyệt",
    bodyTemplate:
      "Công việc '{{TieuDe}}' đã được {{TenNguoiThucHien}} duyệt hoàn thành",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "verified",
    priority: "normal",
  },

  // CÔNG VIỆC - TỪ CHỐI (8) - DISABLED
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-tu-choi",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Bị từ chối",
    bodyTemplate: "Công việc '{{TieuDe}}' bị từ chối",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "block",
    priority: "normal",
    isEnabled: false,
  },

  // CÔNG VIỆC - MỞ LẠI (9)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-mo-lai",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Mở lại",
    bodyTemplate: "Công việc '{{TieuDe}}' được {{TenNguoiThucHien}} mở lại",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "restore",
    priority: "high",
  },

  // CÔNG VIỆC - COMMENT (10)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-binh-luan",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Bình luận mới",
    bodyTemplate: "{{TenNguoiComment}}: {{NoiDungComment}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "comment",
    priority: "low",
  },
  {
    name: "Thông báo cho người tham gia",
    typeCode: "congviec-binh-luan",
    recipientConfig: { variables: ["arrNguoiLienQuanID"] },
    titleTemplate: "{{MaCongViec}} - Bình luận mới",
    bodyTemplate: "{{TenNguoiComment}}: {{NoiDungComment}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "comment",
    priority: "low",
  },

  // CÔNG VIỆC - CẬP NHẬT DEADLINE (11)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-cap-nhat-deadline",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Đổi deadline",
    bodyTemplate: "Deadline đổi từ {{NgayHetHanCu}} → {{NgayHetHanMoi}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "schedule",
    priority: "high",
  },

  // CÔNG VIỆC - THÊM NGƯỜI THAM GIA (12)
  {
    name: "Thông báo cho người được thêm",
    typeCode: "congviec-gan-nguoi-tham-gia",
    recipientConfig: { variables: ["NguoiDuocGanID"] },
    titleTemplate: "{{MaCongViec}} - {{TieuDe}}",
    bodyTemplate: "Bạn được thêm vào công việc bởi {{TenNguoiCapNhat}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "person_add",
    priority: "normal",
  },

  // CÔNG VIỆC - XÓA NGƯỜI THAM GIA (13)
  {
    name: "Thông báo cho người bị xóa",
    typeCode: "congviec-xoa-nguoi-tham-gia",
    recipientConfig: { variables: ["NguoiBiXoaID"] },
    titleTemplate: "{{MaCongViec}} - Xóa khỏi công việc",
    bodyTemplate: "Bạn bị xóa khỏi công việc '{{TieuDe}}'",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "person_remove",
    priority: "normal",
  },

  // CÔNG VIỆC - THAY ĐỔI NGƯỜI CHÍNH (14)
  {
    name: "Thông báo cho người chính mới",
    typeCode: "congviec-thay-doi-nguoi-chinh",
    recipientConfig: { variables: ["NguoiChinhMoi"] },
    titleTemplate: "{{MaCongViec}} - {{TieuDe}}",
    bodyTemplate: "Bạn được chuyển làm người chịu trách nhiệm chính",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "star",
    priority: "high",
  },
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-thay-doi-nguoi-chinh",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Đổi người chịu trách nhiệm",
    bodyTemplate: "Người chính đổi sang {{TenNguoiChinhMoi}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "swap_horiz",
    priority: "normal",
  },

  // CÔNG VIỆC - THAY ĐỔI ƯU TIÊN (15)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-thay-doi-uu-tien",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Đổi độ ưu tiên",
    bodyTemplate: "Độ ưu tiên: {{MucDoUuTienCu}} → {{MucDoUuTienMoi}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "priority_high",
    priority: "normal",
  },

  // CÔNG VIỆC - CẬP NHẬT TIẾN ĐỘ (16)
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-cap-nhat-tien-do",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Tiến độ {{TienDoMoi}}%",
    bodyTemplate: "{{TenNguoiCapNhat}} cập nhật tiến độ: {{TienDoMoi}}%",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "trending_up",
    priority: "low",
  },

  // CÔNG VIỆC - UPLOAD FILE (17)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-upload-file",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - File mới",
    bodyTemplate: "{{TenNguoiGiao}} upload file: {{TenFile}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "upload_file",
    priority: "low",
  },
  {
    name: "Thông báo cho người tham gia",
    typeCode: "congviec-upload-file",
    recipientConfig: { variables: ["arrNguoiLienQuanID"] },
    titleTemplate: "{{MaCongViec}} - File mới",
    bodyTemplate: "{{TenNguoiGiao}} upload file: {{TenFile}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "upload_file",
    priority: "low",
  },

  // CÔNG VIỆC - XÓA FILE (18)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-xoa-file",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Xóa file",
    bodyTemplate: "{{TenNguoiGiao}} xóa file: {{TenFile}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "delete",
    priority: "low",
  },

  // CÔNG VIỆC - DEADLINE SẮP ĐẾN (19)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-deadline-approaching",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Sắp hết hạn",
    bodyTemplate: "Công việc '{{TieuDe}}' sắp đến deadline: {{NgayHetHan}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "alarm",
    priority: "high",
  },

  // CÔNG VIỆC - DEADLINE QUÁ HẠN (45)
  {
    name: "Thông báo cho người chính",
    typeCode: "congviec-deadline-overdue",
    recipientConfig: { variables: ["NguoiChinhID"] },
    titleTemplate: "{{MaCongViec}} - Quá hạn",
    bodyTemplate: "Công việc '{{TieuDe}}' đã quá deadline: {{NgayHetHan}}",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "warning",
    priority: "urgent",
  },
  {
    name: "Thông báo cho người giao việc",
    typeCode: "congviec-deadline-overdue",
    recipientConfig: { variables: ["NguoiGiaoViecID"] },
    titleTemplate: "{{MaCongViec}} - Quá hạn",
    bodyTemplate: "Công việc '{{TieuDe}}' của {{TenNguoiChinh}} đã quá hạn",
    actionUrl: "/cong-viec/{{_id}}",
    icon: "warning",
    priority: "urgent",
  },

  // YÊU CẦU - TẠO MỚI (20)
  {
    name: "Thông báo cho điều phối viên",
    typeCode: "yeucau-tao-moi",
    recipientConfig: { variables: ["arrNguoiDieuPhoiID"] },
    titleTemplate: "{{MaYeuCau}} - Yêu cầu từ {{TenKhoaGui}}",
    bodyTemplate: "{{TenNguoiYeuCau}}: {{TieuDe}}",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "add_circle",
    priority: "normal",
  },

  // YÊU CẦU - TIẾP NHẬN (21)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-tiep-nhan",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Đã tiếp nhận",
    bodyTemplate: "{{TenKhoaNhan}} đã tiếp nhận yêu cầu của bạn",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "check_circle",
    priority: "normal",
  },

  // YÊU CẦU - TỪ CHỐI (22)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-tu-choi",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Bị từ chối",
    bodyTemplate: "{{TenKhoaNhan}} từ chối yêu cầu. Lý do: {{LyDoTuChoi}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "block",
    priority: "high",
  },

  // YÊU CẦU - ĐIỀU PHỐI (23)
  {
    name: "Thông báo cho người được điều phối",
    typeCode: "yeucau-dieu-phoi",
    recipientConfig: { variables: ["NguoiDuocDieuPhoiID"] },
    titleTemplate: "{{MaYeuCau}} - Được giao xử lý",
    bodyTemplate: "Bạn được giao xử lý yêu cầu từ {{TenKhoaGui}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "assignment_ind",
    priority: "normal",
  },
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-dieu-phoi",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Đã điều phối",
    bodyTemplate: "Yêu cầu được giao cho {{TenNguoiXuLy}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "how_to_reg",
    priority: "low",
  },

  // YÊU CẦU - GỬI VỀ KHOA (24)
  {
    name: "Thông báo cho quản lý khoa",
    typeCode: "yeucau-gui-ve-khoa",
    recipientConfig: { variables: ["arrQuanLyKhoaID"] },
    titleTemplate: "{{MaYeuCau}} - Gửi về khoa",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' được gửi về khoa {{TenKhoaNhan}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "reply",
    priority: "normal",
  },

  // YÊU CẦU - HOÀN THÀNH (25)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-hoan-thanh",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Hoàn thành",
    bodyTemplate: "{{TenKhoaNhan}} đã hoàn thành yêu cầu của bạn",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "task_alt",
    priority: "normal",
  },

  // YÊU CẦU - HỦY TIẾP NHẬN (26)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-huy-tiep-nhan",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Hủy tiếp nhận",
    bodyTemplate: "{{TenKhoaNhan}} hủy tiếp nhận yêu cầu",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "cancel",
    priority: "high",
  },

  // YÊU CẦU - ĐỔI THỜI GIAN HẸN (27)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-doi-thoi-gian-hen",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Đổi thời gian hẹn",
    bodyTemplate: "Thời gian hẹn: {{ThoiGianHenCu}} → {{ThoiGianHen}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "schedule",
    priority: "normal",
  },

  // YÊU CẦU - ĐÁNH GIÁ (28)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-danh-gia",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Đánh giá {{DiemDanhGia}}/5",
    bodyTemplate: "{{TenNguoiYeuCau}} đánh giá: {{NoiDungDanhGia}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "star",
    priority: "low",
  },
  {
    name: "Thông báo cho điều phối viên",
    typeCode: "yeucau-danh-gia",
    recipientConfig: { variables: ["arrNguoiDieuPhoiID"] },
    titleTemplate: "{{MaYeuCau}} - Đánh giá {{DiemDanhGia}}/5",
    bodyTemplate: "{{TenNguoiYeuCau}} đánh giá: {{NoiDungDanhGia}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "star",
    priority: "low",
  },

  // YÊU CẦU - ĐÓNG (29)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-dong",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Đã đóng",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' đã được đóng",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "archive",
    priority: "low",
  },

  // YÊU CẦU - XÓA (29)
  {
    name: "Thông báo cho người xử lý và điều phối viên",
    typeCode: "yeucau-xoa",
    recipientConfig: { variables: ["NguoiXuLyID", "arrNguoiDieuPhoiID"] },
    titleTemplate: "{{MaYeuCau}} - Đã bị xóa",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' đã bị xóa bởi {{TenNguoiXoa}}",
    actionUrl: "",
    icon: "delete",
    priority: "high",
  },

  // YÊU CẦU - MỞ LẠI (30)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-mo-lai",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Mở lại",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' được mở lại",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "restore",
    priority: "normal",
  },
  {
    name: "Thông báo cho điều phối viên",
    typeCode: "yeucau-mo-lai",
    recipientConfig: { variables: ["arrNguoiDieuPhoiID"] },
    titleTemplate: "{{MaYeuCau}} - Mở lại",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' được mở lại",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "restore",
    priority: "normal",
  },

  // YÊU CẦU - XỬ LÝ TIẾP (31)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-xu-ly-tiep",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Cần xử lý tiếp",
    bodyTemplate: "{{TenNguoiYeuCau}} yêu cầu xử lý tiếp: {{MoTa}}",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "update",
    priority: "high",
  },

  // YÊU CẦU - NHẮC LẠI (32)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-nhac-lai",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Nhắc nhở",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' cần xử lý gấp",
    actionUrl: "/yeu-cau/{{_id}}",
    icon: "notifications_active",
    priority: "high",
  },

  // YÊU CẦU - BÁO QUẢN LÝ (33)
  {
    name: "Thông báo cho quản lý khoa",
    typeCode: "yeucau-bao-quan-ly",
    recipientConfig: { variables: ["arrQuanLyKhoaID"] },
    titleTemplate: "{{MaYeuCau}} - Escalate",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' cần sự can thiệp của quản lý",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "report_problem",
    priority: "urgent",
  },

  // YÊU CẦU - XÓA (34)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-xoa",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Đã xóa",
    bodyTemplate: "Yêu cầu '{{TieuDe}}' đã bị xóa",
    actionUrl: "/quan-ly-yeu-cau",
    icon: "delete",
    priority: "low",
  },

  // YÊU CẦU - SỬA (35)
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-sua",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Cập nhật",
    bodyTemplate: "{{TenNguoiYeuCau}} cập nhật yêu cầu '{{TieuDe}}'",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "edit",
    priority: "low",
  },

  // YÊU CẦU - COMMENT (36)
  {
    name: "Thông báo cho người yêu cầu",
    typeCode: "yeucau-binh-luan",
    recipientConfig: { variables: ["NguoiYeuCauID"] },
    titleTemplate: "{{MaYeuCau}} - Bình luận mới",
    bodyTemplate: "{{TenNguoiComment}}: {{NoiDungComment}}",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "comment",
    priority: "low",
  },
  {
    name: "Thông báo cho người xử lý",
    typeCode: "yeucau-binh-luan",
    recipientConfig: { variables: ["NguoiXuLyID"] },
    titleTemplate: "{{MaYeuCau}} - Bình luận mới",
    bodyTemplate: "{{TenNguoiComment}}: {{NoiDungComment}}",
    actionUrl: "/quan-ly-yeu-cau/{{_id}}",
    icon: "comment",
    priority: "low",
  },

  // KPI - TẠO ĐÁNH GIÁ (37)
  {
    name: "Thông báo cho nhân viên",
    typeCode: "kpi-tao-danh-gia",
    recipientConfig: { variables: ["NhanVienID"] },
    titleTemplate: "KPI {{TenChuKy}} - Tự đánh giá",
    bodyTemplate: "Chu kỳ KPI {{TenChuKy}} đã được tạo. Vui lòng tự đánh giá.",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "assessment",
    priority: "normal",
  },

  // KPI - DUYỆT ĐÁNH GIÁ (38)
  {
    name: "Thông báo cho nhân viên",
    typeCode: "kpi-duyet-danh-gia",
    recipientConfig: { variables: ["NhanVienID"] },
    titleTemplate: "KPI {{TenChuKy}} - Đã duyệt",
    bodyTemplate:
      "KPI của bạn đã được {{TenNguoiDuyet}} duyệt. Tổng điểm: {{TongDiemKPI}}",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "verified",
    priority: "normal",
  },

  // KPI - DUYỆT TIÊU CHÍ (39)
  {
    name: "Thông báo cho nhân viên",
    typeCode: "kpi-duyet-tieu-chi",
    recipientConfig: { variables: ["NhanVienID"] },
    titleTemplate: "KPI {{TenChuKy}} - Đã duyệt",
    bodyTemplate: "KPI của bạn đã được duyệt",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "rule",
    priority: "low",
  },

  // KPI - HỦY DUYỆT (40)
  {
    name: "Thông báo cho nhân viên",
    typeCode: "kpi-huy-duyet",
    recipientConfig: { variables: ["NhanVienID"] },
    titleTemplate: "KPI {{TenChuKy}} - Hủy duyệt",
    bodyTemplate: "KPI bị hủy duyệt. Lý do: {{LyDo}}",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "undo",
    priority: "high",
  },

  // KPI - CẬP NHẬT ĐIỂM QL (41)
  {
    name: "Thông báo cho nhân viên",
    typeCode: "kpi-cap-nhat-diem-ql",
    recipientConfig: { variables: ["NhanVienID"] },
    titleTemplate: "KPI - Cập nhật điểm QL",
    bodyTemplate:
      "{{TenNguoiDanhGia}} cập nhật điểm QL cho nhiệm vụ {{TenNhiemVu}}",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "edit_note",
    priority: "normal",
  },

  // KPI - TỰ ĐÁNH GIÁ (42)
  {
    name: "Thông báo cho người đánh giá",
    typeCode: "kpi-tu-danh-gia",
    recipientConfig: { variables: ["NguoiDanhGiaID"] },
    titleTemplate: "KPI - {{TenNhanVien}} hoàn thành tự đánh giá",
    bodyTemplate:
      "{{TenNhanVien}} đã hoàn thành tự đánh giá nhiệm vụ {{TenNhiemVu}}",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "check_circle",
    priority: "normal",
  },

  // KPI - PHẢN HỒI (43)
  {
    name: "Thông báo cho người đánh giá",
    typeCode: "kpi-phan-hoi",
    recipientConfig: { variables: ["NguoiDanhGiaID"] },
    titleTemplate: "KPI - Phản hồi từ {{TenNhanVien}}",
    bodyTemplate: "{{TenNhanVien}}: {{PhanHoi}}",
    actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
    icon: "feedback",
    priority: "normal",
  },
];

async function seedNotificationTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    let created = 0;
    let updated = 0;

    for (const templateData of templates) {
      const existing = await NotificationTemplate.findOne({
        name: templateData.name,
        typeCode: templateData.typeCode,
      });

      const template = await NotificationTemplate.findOneAndUpdate(
        {
          name: templateData.name,
          typeCode: templateData.typeCode,
        },
        { ...templateData, isEnabled: templateData.isEnabled !== false },
        { upsert: true, new: true }
      );

      if (existing) {
        updated++;
        console.log(`♻️  Updated: [${template.typeCode}] ${template.name}`);
      } else {
        created++;
        console.log(`✅ Created: [${template.typeCode}] ${template.name}`);
      }
    }

    console.log(`\n📊 Seed Complete:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${templates.length}`);

    // Count by type
    const typeCounts = {};
    templates.forEach((t) => {
      typeCounts[t.typeCode] = (typeCounts[t.typeCode] || 0) + 1;
    });
    console.log(`\n📋 Templates per type:`);
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

seedNotificationTemplates();
