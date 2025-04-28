const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const Khoa = require("../models/Khoa");

const khoaController = {};

// Create a new Khoa
khoaController.insertOne = catchAsync(async (req, res, next) => {
  // Get data from request
  const { TenKhoa, MaKhoa, LoaiKhoa, STT, HisDepartmentID, HisDepartmentGroupID, HisDepartmentType } = req.body;

  // Check if MaKhoa already exists
  let existingKhoa = await Khoa.findOne({ MaKhoa });
  if (existingKhoa) throw new AppError(400, "Mã khoa đã tồn tại", "Insert Khoa Error");

  // Create new Khoa
  const newKhoa = await Khoa.create({ 
    TenKhoa, 
    MaKhoa, 
    LoaiKhoa, 
    STT, 
    HisDepartmentID, 
    HisDepartmentGroupID,
    HisDepartmentType
  });

  // Response
  sendResponse(res, 201, true, { newKhoa }, null, "Tạo khoa thành công");
});

// Get all Khoas
khoaController.getAll = catchAsync(async (req, res, next) => {
  const khoas = await Khoa.find().sort({ STT: 1 });
  sendResponse(res, 200, true, { khoas }, null, "Lấy danh sách khoa thành công");
});

// Get Khoa with pagination
khoaController.getKhoasPhanTrang = catchAsync(async (req, res, next) => {
  let { page, limit, TenKhoa, LoaiKhoa, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;

  const filterConditions = [];
  
  if (TenKhoa) {
    filterConditions.push({
      TenKhoa: { $regex: TenKhoa, $options: "i" },
    });
  }
  
  if (LoaiKhoa) {
    filterConditions.push({
      LoaiKhoa: LoaiKhoa,
    });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await Khoa.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  const khoas = await Khoa.find(filterCriteria)
    .sort({ STT: 1 })
    .skip(offset)
    .limit(limit);

  sendResponse(res, 200, true, { khoas, totalPages, count }, null, "Lấy danh sách khoa thành công");
});

// Get a single Khoa by ID
khoaController.getById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const khoa = await Khoa.findById(id);
  if (!khoa) throw new AppError(404, "Không tìm thấy khoa", "Get Khoa Error");
  sendResponse(res, 200, true, { khoa }, null, "Lấy thông tin khoa thành công");
});

// Update a Khoa by ID
khoaController.updateOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Kiểm tra xem khoa cần update có tồn tại không 
  const khoa = await Khoa.findById(id);
  if (!khoa) throw new AppError(404, "Không tìm thấy khoa", "Update Khoa Error");
console.log("updateData", updateData);
console.log("khoa", khoa);
  // Nếu đang cập nhật MaKhoa và MaKhoa đã thay đổi
  if (updateData.MaKhoa && updateData.MaKhoa !== khoa.MaKhoa) {
    // Kiểm tra xem MaKhoa mới đã tồn tại chưa
    const existingKhoa = await Khoa.findOne({ MaKhoa: updateData.MaKhoa });
    if (existingKhoa) throw new AppError(400, "Mã khoa đã tồn tại 1", "Update Khoa Error");
  }

  // Cập nhật khoa
  const updatedKhoa = await Khoa.findByIdAndUpdate(id, updateData, { new: true });
  
  sendResponse(res, 200, true, { updatedKhoa }, null, "Cập nhật khoa thành công");
});

// Delete a Khoa by ID
khoaController.deleteOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedKhoa = await Khoa.findByIdAndDelete(id);
  if (!deletedKhoa) throw new AppError(404, "Không tìm thấy khoa", "Delete Khoa Error");

  sendResponse(res, 200, true, { deletedKhoa }, null, "Xóa khoa thành công");
});

module.exports = khoaController;
