const TapSanBaiBao = require("../models/TapSanBaiBao");
const TapSan = require("../models/TapSan");

const pad2 = (n) => String(n).padStart(2, "0");

// Lấy danh sách bài báo theo TapSan
exports.getByTapSan = async (req, res) => {
  try {
    const { tapSanId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = "SoThuTu",
      order = "asc",
      search = "",
      khoiChuyenMon = "",
      loaiHinh = "",
    } = req.query;

    // Kiểm tra TapSan có tồn tại
    const tapSan = await TapSan.findById(tapSanId);
    if (!tapSan) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tập san",
      });
    }

    // Xây dựng filter
    const filter = { isDeleted: { $ne: true } };
    if (search) {
      filter.$or = [
        { TieuDe: { $regex: search, $options: "i" } },
        { MaBaiBao: { $regex: search, $options: "i" } },
      ];
    }
    if (khoiChuyenMon) filter.KhoiChuyenMon = String(khoiChuyenMon);
    if (loaiHinh) filter.LoaiHinh = String(loaiHinh);

    // Xây dựng sort
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Lấy dữ liệu với pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj,
      filter,
      populate: ["NguoiTao", "NguoiCapNhat", "TacGiaChinhID", "DongTacGiaIDs"],
    };

    const [items, total] = await Promise.all([
      TapSanBaiBao.getByTapSan(tapSanId, options),
      TapSanBaiBao.countByTapSan(tapSanId, filter),
    ]);

    const normalizedItems = items.map((item) => item.normalize());

    res.json({
      success: true,
      data: {
        items: normalizedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        tapSan: {
          _id: tapSan._id,
          Loai: tapSan.Loai,
          NamXuatBan: tapSan.NamXuatBan,
          SoXuatBan: tapSan.SoXuatBan,
          TrangThai: tapSan.TrangThai,
        },
      },
    });
  } catch (error) {
    console.error("Error getting articles by TapSan:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách bài báo",
      error: error.message,
    });
  }
};

// Lấy chi tiết bài báo
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const baiBao = await TapSanBaiBao.findById(id)
      .populate("TapSanId")
      .populate("NguoiTao", "HoTen Email")
      .populate("NguoiCapNhat", "HoTen Email")
      .populate("TacGiaChinhID", "Ten MaNhanVien")
      .populate("DongTacGiaIDs", "Ten MaNhanVien");

    if (!baiBao || baiBao.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài báo",
      });
    }

    res.json({
      success: true,
      data: baiBao.normalize(),
    });
  } catch (error) {
    console.error("Error getting article by ID:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết bài báo",
      error: error.message,
    });
  }
};

// Tạo bài báo mới
exports.create = async (req, res) => {
  try {
    const { tapSanId } = req.params;
    const {
      TieuDe,
      TomTat,
      LoaiHinh,
      KhoiChuyenMon,
      SoThuTu,
      TacGiaChinhID,
      DongTacGiaIDs = [],
      GhiChu,
    } = req.body;

    // Kiểm tra TapSan có tồn tại
    const tapSan = await TapSan.findById(tapSanId);
    if (!tapSan) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tập san",
      });
    }

    // Validation
    if (!TieuDe || !LoaiHinh || !KhoiChuyenMon || !SoThuTu || !TacGiaChinhID) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu bắt buộc (Tiêu đề, Loại hình, Khối chuyên môn, Số thứ tự, Tác giả chính)",
      });
    }
    if (
      Array.isArray(DongTacGiaIDs) &&
      DongTacGiaIDs.some((x) => String(x) === String(TacGiaChinhID))
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Đồng tác giả không được trùng Tác giả chính",
        });
    }
    if (!Number.isInteger(Number(SoThuTu)) || Number(SoThuTu) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số thứ tự phải là số nguyên dương" });
    }

    // Check unique SoThuTu within TapSan
    const dup = await TapSanBaiBao.findOne({
      TapSanId: tapSanId,
      SoThuTu: Number(SoThuTu),
      isDeleted: { $ne: true },
    }).lean();
    if (dup) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Số thứ tự đã tồn tại trong Tập san",
        });
    }

    const baiBao = new TapSanBaiBao({
      TapSanId: tapSanId,
      TieuDe,
      TomTat,
      LoaiHinh,
      KhoiChuyenMon,
      SoThuTu: Number(SoThuTu),
      TacGiaChinhID,
      DongTacGiaIDs,
      GhiChu,
      NguoiTao: req.userId,
      NguoiCapNhat: req.userId,
    });

    await baiBao.save();

    const populated = await TapSanBaiBao.findById(baiBao._id)
      .populate("TapSanId")
      .populate("NguoiTao", "HoTen Email")
      .populate("NguoiCapNhat", "HoTen Email")
      .populate("TacGiaChinhID", "Ten MaNhanVien")
      .populate("DongTacGiaIDs", "Ten MaNhanVien");

    res.status(201).json({
      success: true,
      message: "Tạo bài báo thành công",
      data: populated.normalize(),
    });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo bài báo",
      error: error.message,
    });
  }
};

// Cập nhật bài báo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      TieuDe,
      TomTat,
      LoaiHinh,
      KhoiChuyenMon,
      SoThuTu,
      TacGiaChinhID,
      DongTacGiaIDs = [],
      GhiChu,
    } = req.body;

    const baiBao = await TapSanBaiBao.findById(id);
    if (!baiBao || baiBao.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài báo",
      });
    }

    // Validation
    if (!TieuDe || !LoaiHinh || !KhoiChuyenMon || !SoThuTu || !TacGiaChinhID) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu bắt buộc (Tiêu đề, Loại hình, Khối chuyên môn, Số thứ tự, Tác giả chính)",
      });
    }
    if (
      Array.isArray(DongTacGiaIDs) &&
      DongTacGiaIDs.some((x) => String(x) === String(TacGiaChinhID))
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Đồng tác giả không được trùng Tác giả chính",
        });
    }
    if (!Number.isInteger(Number(SoThuTu)) || Number(SoThuTu) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số thứ tự phải là số nguyên dương" });
    }

    // Nếu đổi SoThuTu → kiểm tra trùng
    if (baiBao.SoThuTu !== Number(SoThuTu)) {
      const dup = await TapSanBaiBao.findOne({
        TapSanId: baiBao.TapSanId,
        SoThuTu: Number(SoThuTu),
        isDeleted: { $ne: true },
      }).lean();
      if (dup) {
        return res
          .status(409)
          .json({
            success: false,
            message: "Số thứ tự đã tồn tại trong Tập san",
          });
      }
    }

    // Cập nhật các trường
    baiBao.TieuDe = TieuDe;
    baiBao.TomTat = TomTat;
    baiBao.LoaiHinh = LoaiHinh;
    baiBao.KhoiChuyenMon = KhoiChuyenMon;
    baiBao.SoThuTu = Number(SoThuTu);
    baiBao.TacGiaChinhID = TacGiaChinhID;
    baiBao.DongTacGiaIDs = Array.isArray(DongTacGiaIDs) ? DongTacGiaIDs : [];
    baiBao.GhiChu = GhiChu;
    baiBao.NguoiCapNhat = req.userId;

    await baiBao.save();

    const populated = await TapSanBaiBao.findById(baiBao._id)
      .populate("TapSanId")
      .populate("NguoiTao", "HoTen Email")
      .populate("NguoiCapNhat", "HoTen Email")
      .populate("TacGiaChinhID", "Ten MaNhanVien")
      .populate("DongTacGiaIDs", "Ten MaNhanVien");

    res.json({
      success: true,
      message: "Cập nhật bài báo thành công",
      data: populated.normalize(),
    });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật bài báo",
      error: error.message,
    });
  }
};

// Xóa bài báo (soft delete)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const baiBao = await TapSanBaiBao.findById(id);
    if (!baiBao || baiBao.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài báo",
      });
    }

    baiBao.isDeleted = true;
    baiBao.NguoiCapNhat = req.userId;
    await baiBao.save();

    res.json({
      success: true,
      message: "Xóa bài báo thành công",
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa bài báo",
      error: error.message,
    });
  }
};

// Reorder SoThuTu hàng loạt
exports.reorder = async (req, res) => {
  try {
    const { tapSanId } = req.params;
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu reorder không hợp lệ" });
    }

    const ts = await TapSan.findById(tapSanId).lean();
    if (!ts)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy tập san" });

    const ids = items.map((x) => x.id);
    const docs = await TapSanBaiBao.find({
      _id: { $in: ids },
      TapSanId: tapSanId,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();
    if (docs.length !== ids.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Tồn tại bài báo không thuộc tập san hoặc đã xóa",
        });
    }

    const setSo = new Set();
    for (const it of items) {
      const v = Number(it.SoThuTu);
      if (!Number.isInteger(v) || v <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Số thứ tự phải là số nguyên dương",
          });
      }
      if (setSo.has(v)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Số thứ tự bị trùng trong danh sách gửi lên",
          });
      }
      setSo.add(v);
    }

    const soTap = pad2(ts.SoXuatBan || 0);
    const ops = items.map(({ id, SoThuTu }) => ({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            SoThuTu: Number(SoThuTu),
            MaBaiBao: `${ts.Loai}-${ts.NamXuatBan}-${soTap}-${pad2(
              Number(SoThuTu)
            )}`,
          },
        },
      },
    }));

    await TapSanBaiBao.bulkWrite(ops);

    return res.json({ success: true, message: "Cập nhật thứ tự thành công" });
  } catch (error) {
    console.error("Error reordering articles:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Lỗi server khi sắp xếp bài báo",
        error: error.message,
      });
  }
};
