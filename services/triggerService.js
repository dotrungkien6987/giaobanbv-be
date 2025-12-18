/**
 * TriggerService - Core service để fire notification triggers
 *
 * Usage:
 *   const triggerService = require("../services/triggerService");
 *   await triggerService.fire("CongViec.giaoViec", { congViec, performerId });
 */

console.log("🔥🔥🔥 triggerService.js LOADED AT:", new Date().toISOString());

const triggers = require("../config/notificationTriggers");
const notificationHelper = require("../helpers/notificationHelper");
const notificationService = require("../modules/workmanagement/services/notificationService");
const CauHinhThongBaoKhoa = require("../modules/workmanagement/models/CauHinhThongBaoKhoa");

class TriggerService {
  constructor() {
    this.triggers = triggers;
    this._logSummary();
  }

  /**
   * Log summary khi service khởi tạo
   */
  _logSummary() {
    const total = Object.keys(this.triggers).length;
    const enabled = Object.values(this.triggers).filter(
      (t) => t.enabled
    ).length;
    const disabled = total - enabled;

    console.log(
      `[TriggerService] ✅ Loaded ${total} triggers (${enabled} enabled, ${disabled} disabled)`
    );

    if (disabled > 0) {
      const disabledKeys = Object.entries(this.triggers)
        .filter(([_, config]) => !config.enabled)
        .map(([key]) => key);
      console.log(`[TriggerService] ⚠️  Disabled: ${disabledKeys.join(", ")}`);
    }
  }

  /**
   * Fire a trigger
   * @param {string} triggerKey - Key của trigger (e.g., "CongViec.giaoViec")
   * @param {Object} context - Context data
   * @param {Object} context.congViec - CongViec document (for CongViec triggers)
   * @param {Object} context.danhGiaKPI - DanhGiaKPI document (for KPI triggers)
   * @param {Object} context.comment - BinhLuan document (for comment trigger)
   * @param {string} context.performerId - NhanVienID của người thực hiện
   * @param {string} context.ghiChu - Ghi chú/lý do (optional)
   * @param {string} context.lyDo - Lý do (for reject/revoke)
   */
  async fire(triggerKey, context) {
    console.log(`[TriggerService] 📥 fire() called: ${triggerKey}`);
    try {
      const config = this.triggers[triggerKey];

      // Step 1: Check if trigger exists and is enabled
      if (!config) {
        console.warn(`[TriggerService] ⚠️ Unknown trigger: ${triggerKey}`);
        return;
      }

      if (!config.enabled) {
        console.log(`[TriggerService] ⏭️ Skipped (disabled): ${triggerKey}`);
        return;
      }

      // Step 2: Get handler and process
      const handlerResult = await this._processHandler(
        config.handler,
        context,
        config
      );

      if (!handlerResult) {
        console.warn(
          `[TriggerService] ⚠️ Handler returned null for: ${triggerKey}`
        );
        return;
      }

      const { recipientNhanVienIds, data } = handlerResult;
      console.log(
        `[TriggerService] 📋 recipientNhanVienIds:`,
        recipientNhanVienIds
      );

      // Step 3: Convert NhanVienIDs → UserIds
      let userIds = await notificationHelper.resolveNhanVienListToUserIds(
        recipientNhanVienIds
      );
      console.log(`[TriggerService] 👥 Converted to userIds:`, userIds);

      if (userIds.length === 0) {
        console.log(
          `[TriggerService] ⚠️ No valid recipients for: ${triggerKey}`
        );
        return;
      }

      // Step 4: Exclude performer if configured
      if (config.excludePerformer && context.performerId) {
        console.log(
          `[TriggerService] 🔍 Resolving performer NhanVienID to UserID:`,
          context.performerId
        );
        const performerUserId =
          await notificationHelper.resolveNhanVienToUserId(context.performerId);
        console.log(`[TriggerService] 👤 Performer UserID:`, performerUserId);
        if (performerUserId) {
          const originalCount = userIds.length;
          userIds = userIds.filter(
            (id) => String(id) !== String(performerUserId)
          );
          console.log(
            `[TriggerService] 🎯 Recipients after exclude: ${
              userIds.length
            }/${originalCount} (removed performer: ${
              originalCount - userIds.length
            })`
          );
        }
      }

      if (userIds.length === 0) {
        console.log(
          `[TriggerService] ⚠️ No recipients after exclusion for: ${triggerKey}`
        );
        return;
      }

      // Step 5: Send notifications
      console.log(
        `[TriggerService] 🔔 Firing ${triggerKey} → ${userIds.length} recipients`
      );

      await notificationService.sendToMany({
        type: config.template,
        recipientIds: userIds,
        data: data,
      });

      console.log(`[TriggerService] ✅ ${triggerKey} sent successfully`);
    } catch (error) {
      // Log error but don't throw - notification failure shouldn't break business logic
      console.error(
        `[TriggerService] ❌ Error firing ${triggerKey}:`,
        error.message
      );
    }
  }

  /**
   * Process handler based on type
   * @private
   */
  async _processHandler(handlerType, context, config) {
    switch (handlerType) {
      case "congViec":
        return this._handleCongViec(context, config);
      case "congViecUpdate":
        return this._handleCongViecUpdate(context, config);
      case "kpi":
        return this._handleKPI(context, config);
      case "kpiUpdate":
        return this._handleKPIUpdate(context, config);
      case "comment":
        return this._handleComment(context, config);
      case "yeuCauComment":
        return this._handleYeuCauComment(context, config);
      case "yeuCauStateMachine":
        return this._handleYeuCauStateMachine(context, config);
      case "deadline":
        return this._handleDeadline(context, config);
      default:
        console.warn(`[TriggerService] Unknown handler type: ${handlerType}`);
        return null;
    }
  }

  /**
   * Handler for CongViec triggers
   * @private
   */
  async _handleCongViec(context, config) {
    const { congViec, ghiChu, lyDo, performerId } = context;
    if (!congViec) return null;

    // Determine recipients based on config
    let recipientNhanVienIds = [];

    switch (config.recipients) {
      case "assignee":
        if (congViec.NguoiChinhID) {
          recipientNhanVienIds.push(congViec.NguoiChinhID);
        }
        break;

      case "assigner":
        if (congViec.NguoiGiaoViecID) {
          recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
        }
        break;

      case "participants":
        if (Array.isArray(congViec.NguoiThamGia)) {
          congViec.NguoiThamGia.forEach((p) => {
            if (p.NhanVienID) recipientNhanVienIds.push(p.NhanVienID);
          });
        }
        break;

      case "all":
        if (congViec.NguoiChinhID)
          recipientNhanVienIds.push(congViec.NguoiChinhID);
        if (congViec.NguoiGiaoViecID)
          recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
        if (Array.isArray(congViec.NguoiThamGia)) {
          congViec.NguoiThamGia.forEach((p) => {
            if (p.NhanVienID) recipientNhanVienIds.push(p.NhanVienID);
          });
        }
        break;
    }

    // Build template data
    const assignerName = await notificationHelper.getDisplayName(
      congViec.NguoiGiaoViecID
    );
    const assigneeName = await notificationHelper.getDisplayName(
      congViec.NguoiChinhID
    );
    // Lấy tên người thực hiện hành động (performer)
    const performerName = performerId
      ? await notificationHelper.getDisplayName(performerId)
      : assignerName; // Fallback to assigner if no performerId

    const data = {
      taskId: String(congViec._id),
      taskCode: congViec.MaCongViec || "",
      taskName: congViec.TieuDe || "Công việc",
      taskTitle: congViec.TieuDe || "Công việc",
      assignerName: assignerName,
      assigneeName: assigneeName,
      performerName: performerName,
      newStatus: this._mapStatus(congViec.TrangThai),
      reason: lyDo || ghiChu || "",
      deadline: congViec.NgayHetHan
        ? require("dayjs")(congViec.NgayHetHan).format("DD/MM/YYYY HH:mm")
        : null,
      priority: congViec.MucDoUuTien || "Bình thường",
      progress: congViec.TienDo || 0,
      // For approved/rejected templates
      approverName: assignerName,
      rejecterName: assignerName,
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for KPI triggers
   * @private
   */
  async _handleKPI(context, config) {
    const { danhGiaKPI, chuKy, lyDo } = context;
    if (!danhGiaKPI) return null;

    // Recipients: employee being evaluated
    let recipientNhanVienIds = [];

    switch (config.recipients) {
      case "employee":
        const employeeId = danhGiaKPI.NhanVienID?._id || danhGiaKPI.NhanVienID;
        if (employeeId) recipientNhanVienIds.push(employeeId);
        break;

      case "manager":
        const managerId =
          danhGiaKPI.NguoiDanhGiaID?._id || danhGiaKPI.NguoiDanhGiaID;
        if (managerId) recipientNhanVienIds.push(managerId);
        break;
    }

    // Build template data
    const managerName = await notificationHelper.getDisplayName(
      danhGiaKPI.NguoiDanhGiaID?._id || danhGiaKPI.NguoiDanhGiaID
    );

    const cycleName =
      chuKy?.TenChuKy ||
      danhGiaKPI.ChuKyDanhGiaID?.TenChuKy ||
      "Chu kỳ đánh giá";

    const data = {
      evaluationId: String(danhGiaKPI._id),
      cycleName: cycleName,
      managerName: managerName,
      rating: this._getRating(danhGiaKPI.TongDiemKPI),
      reason: lyDo || "",
      deadline: chuKy?.NgayKetThuc
        ? new Date(chuKy.NgayKetThuc).toLocaleDateString("vi-VN")
        : "",
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for Comment trigger
   * @private
   */
  async _handleComment(context, config) {
    const { congViec, comment } = context;
    console.log(`[TriggerService] 💬 _handleComment called`);
    console.log(
      `[TriggerService] 💬 congViec:`,
      congViec
        ? {
            _id: congViec._id,
            NguoiChinhID: congViec.NguoiChinhID,
            NguoiGiaoViecID: congViec.NguoiGiaoViecID,
          }
        : null
    );
    console.log(
      `[TriggerService] 💬 comment:`,
      comment
        ? { _id: comment._id, NguoiBinhLuanID: comment.NguoiBinhLuanID }
        : null
    );

    if (!congViec || !comment) {
      console.log(
        `[TriggerService] ⚠️ _handleComment: missing congViec or comment`
      );
      return null;
    }

    // Recipients: all people related to the task
    let recipientNhanVienIds = [];

    if (congViec.NguoiChinhID) recipientNhanVienIds.push(congViec.NguoiChinhID);
    if (congViec.NguoiGiaoViecID)
      recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
    if (Array.isArray(congViec.NguoiThamGia)) {
      congViec.NguoiThamGia.forEach((p) => {
        if (p.NhanVienID) recipientNhanVienIds.push(p.NhanVienID);
      });
    }

    console.log(
      `[TriggerService] 💬 recipientNhanVienIds (before dedup):`,
      recipientNhanVienIds
    );

    // Build template data
    const commenterName = await notificationHelper.getDisplayName(
      comment.NguoiBinhLuanID
    );

    const data = {
      taskId: String(congViec._id),
      taskCode: congViec.MaCongViec || "",
      taskName: congViec.TieuDe || "Công việc",
      commenterName: commenterName,
      commentPreview: comment.NoiDung?.substring(0, 100) || "",
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for YeuCau Comment trigger
   * @private
   */
  async _handleYeuCauComment(context, config) {
    const { yeuCau, comment } = context;
    console.log(`[TriggerService] 💬 _handleYeuCauComment called`);

    if (!yeuCau || !comment) {
      console.log(
        `[TriggerService] ⚠️ _handleYeuCauComment: missing yeuCau or comment`
      );
      return null;
    }

    // Recipients: người tạo + người xử lý + điều phối
    let recipientNhanVienIds = [];

    if (yeuCau.NguoiYeuCauID) recipientNhanVienIds.push(yeuCau.NguoiYeuCauID);
    if (yeuCau.NguoiXuLyID) recipientNhanVienIds.push(yeuCau.NguoiXuLyID);
    if (yeuCau.NguoiDieuPhoiID)
      recipientNhanVienIds.push(yeuCau.NguoiDieuPhoiID);
    if (yeuCau.NguoiDuocDieuPhoiID)
      recipientNhanVienIds.push(yeuCau.NguoiDuocDieuPhoiID);

    console.log(
      `[TriggerService] 💬 YeuCau recipientNhanVienIds (before dedup):`,
      recipientNhanVienIds
    );

    // Build template data
    const commenterName = await notificationHelper.getDisplayName(
      comment.NguoiBinhLuanID
    );

    const data = {
      yeuCauId: String(yeuCau._id),
      yeuCauCode: yeuCau.MaYeuCau || "",
      yeuCauTitle: yeuCau.TieuDe || "Yêu cầu",
      commenterName: commenterName,
      commentPreview: comment.NoiDung?.substring(0, 100) || "",
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for Deadline triggers (DEADLINE_APPROACHING, DEADLINE_OVERDUE)
   * @private
   */
  async _handleDeadline(context, config) {
    const { congViec, daysLeft, daysOverdue } = context;
    console.log(`[TriggerService] ⏰ _handleDeadline called`);

    if (!congViec) {
      console.log(`[TriggerService] ⚠️ _handleDeadline: missing congViec`);
      return null;
    }

    // Recipients: all people related to the task
    let recipientNhanVienIds = [];

    if (congViec.NguoiChinhID) recipientNhanVienIds.push(congViec.NguoiChinhID);
    if (congViec.NguoiGiaoViecID)
      recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
    if (Array.isArray(congViec.NguoiThamGia)) {
      congViec.NguoiThamGia.forEach((p) => {
        if (p.NhanVienID) recipientNhanVienIds.push(p.NhanVienID);
      });
    }

    console.log(
      `[TriggerService] ⏰ recipientNhanVienIds (before dedup):`,
      recipientNhanVienIds
    );

    // Build template data
    const assigneeName = await notificationHelper.getDisplayName(
      congViec.NguoiChinhID
    );

    const data = {
      taskId: String(congViec._id),
      taskCode: congViec.MaCongViec || "",
      taskName: congViec.TieuDe || "Công việc",
      assigneeName: assigneeName,
      daysLeft: daysLeft ?? 0,
      daysOverdue: daysOverdue ?? 0,
      deadline: congViec.NgayHetHan
        ? new Date(congViec.NgayHetHan).toLocaleDateString("vi-VN")
        : "",
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for YeuCau state machine transitions
   * Handles all YeuCau actions: TAO_MOI, TIEP_NHAN, TU_CHOI, etc.
   * @private
   */
  async _handleYeuCauStateMachine(context, config) {
    const { yeuCau } = context;
    console.log(`[TriggerService] 🎫 _handleYeuCauStateMachine called`);

    if (!yeuCau) {
      console.log(
        `[TriggerService] ⚠️ _handleYeuCauStateMachine: missing yeuCau`
      );
      return null;
    }

    let recipientNhanVienIds = [];

    // Determine recipients based on config.recipients
    switch (config.recipients) {
      case "requester":
        // Người yêu cầu
        if (yeuCau.NguoiYeuCauID) {
          recipientNhanVienIds.push(yeuCau.NguoiYeuCauID);
        }
        break;

      case "performer":
        // Người xử lý - ưu tiên NguoiDuocDieuPhoiID (cho DIEU_PHOI), fallback NguoiXuLyID
        if (yeuCau.NguoiDuocDieuPhoiID) {
          // Người được điều phối (có giá trị ngay khi DIEU_PHOI)
          recipientNhanVienIds.push(yeuCau.NguoiDuocDieuPhoiID);
        } else if (yeuCau.NguoiXuLyID) {
          // Người xử lý thực sự (có giá trị sau TIEP_NHAN)
          recipientNhanVienIds.push(yeuCau.NguoiXuLyID);
        }
        break;

      case "targetDept":
        // Khoa được yêu cầu - gửi cho tất cả điều phối viên trong DanhSachNguoiDieuPhoi
        try {
          const cauHinh = await CauHinhThongBaoKhoa.findOne({
            KhoaID: yeuCau.KhoaDichID,
          });
          if (
            cauHinh &&
            cauHinh.DanhSachNguoiDieuPhoi &&
            cauHinh.DanhSachNguoiDieuPhoi.length > 0
          ) {
            const dieuPhoiIds = cauHinh.DanhSachNguoiDieuPhoi.map(
              (item) => item.NhanVienID
            );
            recipientNhanVienIds.push(...dieuPhoiIds);
            console.log(
              `[TriggerService] 📋 Found ${dieuPhoiIds.length} coordinators for KhoaDichID ${yeuCau.KhoaDichID}`
            );
          } else {
            console.warn(
              `[TriggerService] ⚠️ No coordinators found in CauHinhThongBaoKhoa for KhoaDichID ${yeuCau.KhoaDichID}`
            );
          }
        } catch (error) {
          console.error(
            `[TriggerService] ❌ Error querying CauHinhThongBaoKhoa:`,
            error.message
          );
        }
        break;

      case "sourceDept":
        // Khoa yêu cầu (người yêu cầu + trưởng khoa)
        if (yeuCau.NguoiYeuCauID) {
          recipientNhanVienIds.push(yeuCau.NguoiYeuCauID);
        }
        break;

      case "manager":
        // Quản lý (trưởng khoa / giám đốc)
        // TODO: Implement logic to get manager based on KhoaDuocYeuCauID
        if (yeuCau.NguoiDieuPhoiID) {
          recipientNhanVienIds.push(yeuCau.NguoiDieuPhoiID);
        }
        break;

      case "all":
        // Tất cả người liên quan
        if (yeuCau.NguoiYeuCauID)
          recipientNhanVienIds.push(yeuCau.NguoiYeuCauID);
        if (yeuCau.NguoiXuLyID) recipientNhanVienIds.push(yeuCau.NguoiXuLyID);
        if (yeuCau.NguoiDieuPhoiID)
          recipientNhanVienIds.push(yeuCau.NguoiDieuPhoiID);
        if (yeuCau.NguoiDuocDieuPhoiID)
          recipientNhanVienIds.push(yeuCau.NguoiDuocDieuPhoiID);
        break;

      default:
        console.warn(
          `[TriggerService] Unknown recipients type for YeuCau: ${config.recipients}`
        );
        return null;
    }

    console.log(
      `[TriggerService] 🎫 YeuCau recipientNhanVienIds:`,
      recipientNhanVienIds
    );

    // Build data object - pass context variables directly
    // Business logic will prepare the variables (requestCode, requestTitle, etc.)
    const data = { ...context };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for CongViec update actions
   * Handles field changes: deadline, priority, participants, progress, files
   * @private
   */
  async _handleCongViecUpdate(context, config) {
    const { congViec, specificRecipient } = context;
    console.log(`[TriggerService] 📝 _handleCongViecUpdate called`);

    if (!congViec) {
      console.log(
        `[TriggerService] ⚠️ _handleCongViecUpdate: missing congViec`
      );
      return null;
    }

    let recipientNhanVienIds = [];

    // If specific recipient is provided (e.g., new participant), use it
    if (specificRecipient) {
      recipientNhanVienIds.push(specificRecipient);
    } else {
      // Determine recipients based on config
      switch (config.recipients) {
        case "assignee":
          if (congViec.NguoiChinhID) {
            recipientNhanVienIds.push(congViec.NguoiChinhID);
          }
          break;

        case "assigner":
          if (congViec.NguoiGiaoViecID) {
            recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
          }
          break;

        case "newAssignee":
          // For assignee change, send to new assignee
          if (context.newAssigneeId) {
            recipientNhanVienIds.push(context.newAssigneeId);
          }
          break;

        case "newParticipant":
          // For participant added
          if (context.newParticipantId) {
            recipientNhanVienIds.push(context.newParticipantId);
          }
          break;

        case "removedParticipant":
          // For participant removed
          if (context.removedParticipantId) {
            recipientNhanVienIds.push(context.removedParticipantId);
          }
          break;

        case "all":
          // All people related to task
          if (congViec.NguoiChinhID)
            recipientNhanVienIds.push(congViec.NguoiChinhID);
          if (congViec.NguoiGiaoViecID)
            recipientNhanVienIds.push(congViec.NguoiGiaoViecID);
          if (Array.isArray(congViec.NguoiThamGia)) {
            congViec.NguoiThamGia.forEach((p) => {
              if (p.NhanVienID) recipientNhanVienIds.push(p.NhanVienID);
              else if (p._id) recipientNhanVienIds.push(p._id);
            });
          }
          break;

        default:
          console.warn(
            `[TriggerService] Unknown recipients type: ${config.recipients}`
          );
          return null;
      }
    }

    console.log(
      `[TriggerService] 📝 CongViec update recipientNhanVienIds:`,
      recipientNhanVienIds
    );

    // Enrich context with common variables
    const performerName = context.performerId
      ? await notificationHelper.getDisplayName(context.performerId)
      : await notificationHelper.getDisplayName(congViec.NguoiGiaoViecID);

    const data = {
      ...context,
      taskId: String(congViec._id),
      taskCode: congViec.MaCongViec || "",
      taskName: congViec.TieuDe || "Công việc",
      taskTitle: congViec.TieuDe || "Công việc",
      performerName,
      deadline: congViec.NgayHetHan
        ? require("dayjs")(congViec.NgayHetHan).format("DD/MM/YYYY HH:mm")
        : null,
      priority: congViec.MucDoUuTien || "Bình thường",
      progress: congViec.TienDo || 0,
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Handler for KPI update actions
   * Handles: capNhatDiemQL, tuDanhGia, phanHoi
   * @private
   */
  async _handleKPIUpdate(context, config) {
    const { danhGiaKPI } = context;
    console.log(`[TriggerService] 📊 _handleKPIUpdate called`);

    if (!danhGiaKPI) {
      console.log(`[TriggerService] ⚠️ _handleKPIUpdate: missing danhGiaKPI`);
      return null;
    }

    let recipientNhanVienIds = [];

    // Determine recipients
    switch (config.recipients) {
      case "employee":
        // Send to employee being evaluated
        if (danhGiaKPI.NhanVienID) {
          recipientNhanVienIds.push(danhGiaKPI.NhanVienID);
        }
        break;

      case "manager":
        // Send to manager evaluating
        if (danhGiaKPI.NguoiDanhGiaID) {
          recipientNhanVienIds.push(danhGiaKPI.NguoiDanhGiaID);
        }
        break;

      default:
        console.warn(
          `[TriggerService] Unknown recipients type for KPI: ${config.recipients}`
        );
        return null;
    }

    console.log(
      `[TriggerService] 📊 KPI update recipientNhanVienIds:`,
      recipientNhanVienIds
    );

    // Enrich context with extracted variables
    const employeeName =
      context.nhanVien?.HoTen ||
      (danhGiaKPI.NhanVienID?.HoTen
        ? danhGiaKPI.NhanVienID.HoTen
        : "Nhân viên");
    const managerName = context.performerId
      ? await notificationHelper.getDisplayName(context.performerId)
      : danhGiaKPI.NguoiDanhGiaID?.HoTen || "Quản lý";

    const data = {
      ...context,
      evaluationId: String(danhGiaKPI._id),
      cycleName: context.chuKy?.TenChuKy || "Chu kỳ đánh giá",
      employeeName,
      managerName,
      rating: danhGiaKPI.TongDiemKPI || 0,
      feedback: context.feedback || context.noiDung || "",
    };

    return { recipientNhanVienIds, data };
  }

  /**
   * Map TrangThai to Vietnamese display
   * @private
   */
  _mapStatus(status) {
    const statusMap = {
      NHAP: "Nháp",
      DA_GIAO: "Đã giao",
      DANG_THUC_HIEN: "Đang thực hiện",
      HOAN_THANH_TAM: "Chờ duyệt",
      HOAN_THANH: "Hoàn thành",
    };
    return statusMap[status] || status;
  }

  /**
   * Get rating text from score
   * @private
   */
  _getRating(score) {
    if (score == null) return "Chưa có";
    if (score >= 90) return "Xuất sắc";
    if (score >= 80) return "Tốt";
    if (score >= 70) return "Khá";
    if (score >= 50) return "Trung bình";
    return "Cần cải thiện";
  }

  /**
   * Get summary of all triggers (for debug endpoint)
   */
  getSummary() {
    const triggerList = Object.entries(this.triggers).map(([key, config]) => ({
      key,
      enabled: config.enabled,
      template: config.template,
      description: config.description,
      handler: config.handler,
      recipients: config.recipients,
    }));

    return {
      total: triggerList.length,
      enabled: triggerList.filter((t) => t.enabled).length,
      disabled: triggerList.filter((t) => !t.enabled).length,
      triggers: triggerList,
    };
  }
}

module.exports = new TriggerService();
