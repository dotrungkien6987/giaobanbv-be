const TapSanBaiBao = require("../models/TapSanBaiBao");
const TapSan = require("../models/TapSan");

// Lấy danh sách bài báo theo TapSan
exports.getByTapSan = async (req, res) => {
  try {
    const { tapSanId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = "NgayTao",
      order = "desc",
      search = "",
      trangThai = "",
      tacGia = "",
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
    const filter = {};
    if (search) {
      filter.$or = [
        { TieuDe: { $regex: search, $options: "i" } },
        { TacGia: { $regex: search, $options: "i" } },
        { TomTat: { $regex: search, $options: "i" } },
      ];
    }
    if (trangThai) {
      filter.TrangThai = trangThai;
    }
    if (tacGia) {
      filter.TacGia = { $regex: tacGia, $options: "i" };
    }

    // Xây dựng sort
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Lấy dữ liệu với pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj,
      filter,
      populate: ["NguoiTao", "NguoiCapNhat"],
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
      .populate("NguoiCapNhat", "HoTen Email");

    if (!baiBao) {
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
    const { TieuDe, TacGia, TomTat, NoiDung, TrangThai, GhiChu } = req.body;

    // Kiểm tra TapSan có tồn tại
    const tapSan = await TapSan.findById(tapSanId);
    if (!tapSan) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tập san",
      });
    }

    // Validation
    if (!TieuDe || !TacGia) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề và tác giả là bắt buộc",
      });
    }

    const baiBao = new TapSanBaiBao({
      TapSanId: tapSanId,
      TieuDe,
      TacGia,
      TomTat,
      NoiDung,
      TrangThai: TrangThai || "Dự thảo",
      GhiChu,
      NguoiTao: req.userId,
      NguoiCapNhat: req.userId,
    });

    await baiBao.save();

    const populated = await TapSanBaiBao.findById(baiBao._id)
      .populate("TapSanId")
      .populate("NguoiTao", "HoTen Email")
      .populate("NguoiCapNhat", "HoTen Email");

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
    const { TieuDe, TacGia, TomTat, NoiDung, TrangThai, GhiChu } = req.body;

    const baiBao = await TapSanBaiBao.findById(id);
    if (!baiBao) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài báo",
      });
    }

    // Validation
    if (!TieuDe || !TacGia) {
      return res.status(400).json({
        success: false,
        message: "Tiêu đề và tác giả là bắt buộc",
      });
    }

    // Cập nhật các trường
    baiBao.TieuDe = TieuDe;
    baiBao.TacGia = TacGia;
    baiBao.TomTat = TomTat;
    baiBao.NoiDung = NoiDung;
    baiBao.TrangThai = TrangThai;
    baiBao.GhiChu = GhiChu;
    baiBao.NguoiCapNhat = req.userId;

    await baiBao.save();

    const populated = await TapSanBaiBao.findById(baiBao._id)
      .populate("TapSanId")
      .populate("NguoiTao", "HoTen Email")
      .populate("NguoiCapNhat", "HoTen Email");

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

// Xóa bài báo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const baiBao = await TapSanBaiBao.findById(id);
    if (!baiBao) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài báo",
      });
    }

    await TapSanBaiBao.findByIdAndDelete(id);

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

// Thống kê bài báo theo trạng thái
exports.getStatsByTapSan = async (req, res) => {
  try {
    const { tapSanId } = req.params;

    // Kiểm tra TapSan có tồn tại
    const tapSan = await TapSan.findById(tapSanId);
    if (!tapSan) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tập san",
      });
    }

    const stats = await TapSanBaiBao.aggregate([
      { $match: { TapSanId: tapSan._id } },
      {
        $group: {
          _id: "$TrangThai",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          byStatus: {
            $push: {
              status: "$_id",
              count: "$count",
            },
          },
        },
      },
    ]);

    const result = stats[0] || { total: 0, byStatus: [] };

    res.json({
      success: true,
      data: {
        total: result.total,
        byStatus: result.byStatus,
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
    console.error("Error getting article stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê bài báo",
      error: error.message,
    });
  }
};
