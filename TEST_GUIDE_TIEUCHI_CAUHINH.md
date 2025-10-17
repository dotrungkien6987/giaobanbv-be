# Hướng Dẫn Test CRUD TieuChiCauHinh

## 🚀 Bắt Đầu

### 1. Start Backend

```bash
cd d:\project\webBV\giaobanbv-be
npm start
```

### 2. Start Frontend

```bash
cd d:\project\webBV\fe-bcgiaobanbvt
npm start
```

---

## ✅ Test Case 1: Tạo Chu Kỳ Mới Với Tiêu Chí

### Bước 1: Mở Form

1. Navigate to: Quản lý công việc → Chu kỳ đánh giá
2. Click button "Thêm chu kỳ"

### Bước 2: Nhập Thông Tin

- **Tháng:** 10
- **Năm:** 2025
- **Ngày bắt đầu:** 01/10/2025
- **Ngày kết thúc:** 31/10/2025
- **Mô tả:** "Test chu kỳ với tiêu chí"

### Bước 3: Copy Tiêu Chí Từ Chu Kỳ Trước

1. Click button "Copy từ chu kỳ trước"
2. **Expected:** Danh sách tiêu chí được điền tự động
3. **Check Console:**
   ```
   GET /workmanagement/chu-ky-danh-gia/previous-criteria
   Response: { tieuChi: [...], chuKyName: "..." }
   ```

### Bước 4: Thêm/Sửa Tiêu Chí

1. Click "Thêm tiêu chí mới"
2. Nhập:
   - **Tên tiêu chí:** "Hoàn thành đúng hạn"
   - **Loại:** Tăng điểm
   - **Giá trị Min:** 0
   - **Giá trị Max:** 100
   - **Đơn vị:** %
3. Click icon ✓ để lưu
4. **Expected:** Tiêu chí mới xuất hiện trong danh sách với chip màu xanh

### Bước 5: Submit Form

1. Click "Thêm mới"
2. **Check Browser Console:**

   ```javascript
   🚀 Submitting ChuKy payload: {
     TenChuKy: "",
     Thang: 10,
     Nam: 2025,
     NgayBatDau: "2025-10-01T...",
     NgayKetThuc: "2025-10-31T...",
     MoTa: "Test chu kỳ với tiêu chí",
     TieuChiCauHinh: [
       {
         TenTieuChi: "Hoàn thành đúng hạn",
         LoaiTieuChi: "TANG_DIEM",
         GiaTriMin: 0,
         GiaTriMax: 100,
         DonVi: "%",
         ThuTu: 0,
         GhiChu: ""
       }
     ]
   }
   ```

3. **Check Backend Console:**

   ```
   🚀 Creating ChuKy with payload: { ..., TieuChiCauHinh: [...] }
   ```

4. **Expected Result:**
   - ✅ Toast: "Tạo chu kỳ đánh giá thành công"
   - ✅ Form closes
   - ✅ List refreshes with new chu kỳ

### Bước 6: Verify Database

**MongoDB Compass hoặc Shell:**

```javascript
db.chukydanhgias.findOne({ Thang: 10, Nam: 2025 })

// Expected output:
{
  _id: ObjectId("..."),
  TenChuKy: "Tháng 10/2025",
  Thang: 10,
  Nam: 2025,
  TieuChiCauHinh: [
    {
      TenTieuChi: "Hoàn thành đúng hạn",
      LoaiTieuChi: "TANG_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 100,
      DonVi: "%",
      ThuTu: 0,
      GhiChu: "",
      _id: ObjectId("...")
    }
  ],
  // ... other fields
}
```

---

## ✅ Test Case 2: Cập Nhật Tiêu Chí Của Chu Kỳ Hiện Có

### Bước 1: Mở Form Edit

1. Tìm chu kỳ vừa tạo trong danh sách
2. Click icon Edit (✏️)
3. **Expected:** Form mở với dữ liệu hiện tại, including tiêu chí

### Bước 2: Verify Loaded Data

1. **Check form fields:** Tháng, Năm, dates đã được fill
2. **Check tiêu chí:** Danh sách tiêu chí hiện tại được hiển thị
3. **Check React DevTools:**
   ```javascript
   ThongTinChuKyDanhGia
     props: { item: { TieuChiCauHinh: [...] } }
     state: { tieuChiList: [...] } // Should match item.TieuChiCauHinh
   ```

### Bước 3: Thêm Tiêu Chí Mới

1. Click "Thêm tiêu chí mới"
2. Nhập:
   - **Tên tiêu chí:** "Vi phạm quy định"
   - **Loại:** Giảm điểm
   - **Giá trị Max:** 50
   - **Đơn vị:** %
3. Click ✓
4. **Expected:** Tiêu chí mới với chip màu đỏ

### Bước 4: Sửa Tiêu Chí Cũ

1. Click icon Edit (✏️) trên tiêu chí "Hoàn thành đúng hạn"
2. Sửa GiaTriMax thành 120
3. Click ✓
4. **Expected:** Giá trị được cập nhật

### Bước 5: Xóa Tiêu Chí

1. Click icon Delete (🗑️) trên một tiêu chí
2. **Expected:** Tiêu chí biến mất khỏi danh sách

### Bước 6: Submit Update

1. Click "Cập nhật"
2. **Check Browser Console:**

   ```javascript
   🚀 Submitting ChuKy payload: {
     ...,
     TieuChiCauHinh: [
       {
         TenTieuChi: "Hoàn thành đúng hạn",
         GiaTriMax: 120, // ← Changed
         ...
       },
       {
         TenTieuChi: "Vi phạm quy định", // ← New
         LoaiTieuChi: "GIAM_DIEM",
         ...
       }
       // Deleted criterion not present
     ]
   }
   ```

3. **Check Backend Console:**

   ```
   🔄 Updating ChuKy: <id> with payload: { TieuChiCauHinh: [...] }
   ```

4. **Expected Result:**
   - ✅ Toast: "Cập nhật chu kỳ đánh giá thành công"
   - ✅ Form closes
   - ✅ List refreshes

### Bước 7: Verify Update in Database

```javascript
db.chukydanhgias.findOne({ Thang: 10, Nam: 2025 })

// Expected: TieuChiCauHinh array updated
{
  TieuChiCauHinh: [
    {
      TenTieuChi: "Hoàn thành đúng hạn",
      GiaTriMax: 120, // ← Should be 120, not 100
      ...
    },
    {
      TenTieuChi: "Vi phạm quy định", // ← New entry
      LoaiTieuChi: "GIAM_DIEM",
      ...
    }
  ]
}
```

---

## ✅ Test Case 3: Tạo KPI Với Tiêu Chí Từ Chu Kỳ

### Bước 1: Khởi Tạo KPI

1. Navigate to: Danh sách đánh giá KPI
2. Click "Khởi tạo đánh giá"
3. Chọn chu kỳ vừa cập nhật (Tháng 10/2025)
4. Chọn nhân viên

### Bước 2: Verify Criteria Copied

1. Click "Chấm điểm" cho một nhiệm vụ
2. **Expected:** ChiTietDiem contains criteria from ChuKy.TieuChiCauHinh
3. **Check Database:**

   ```javascript
   db.danhgianv.findOne({ ChuKyDanhGiaID: <chuky_id> })

   // Expected:
   {
     ChiTietDiem: [
       {
         TenTieuChi: "Hoàn thành đúng hạn",
         LoaiTieuChi: "TANG_DIEM",
         GiaTriMax: 120, // ← From ChuKy, not from TieuChiDanhGia master
         DiemDat: 0,
         ...
       },
       {
         TenTieuChi: "Vi phạm quy định",
         LoaiTieuChi: "GIAM_DIEM",
         ...
       }
     ]
   }
   ```

### Bước 3: Score and Approve

1. Nhập điểm cho tiêu chí
2. Lưu đánh giá
3. Approve KPI (Duyệt)
4. **Expected:** Status = DA_DUYET

### Bước 4: Try to Edit Chu Kỳ After Approval

1. Go back to Chu kỳ đánh giá list
2. Click Edit on approved chu kỳ
3. **Expected:**
   - ✅ Form opens (no restriction on chu kỳ level)
   - ❓ OR show warning: "Chu kỳ đã có KPI được duyệt, không nên sửa tiêu chí"

---

## ✅ Test Case 4: Edge Cases

### 4.1: Empty TieuChiCauHinh

1. Tạo chu kỳ mới
2. Không thêm tiêu chí nào
3. Click "Thêm mới"
4. **Expected:**
   - ✅ Chu kỳ được tạo với TieuChiCauHinh = []
   - ✅ Database có field TieuChiCauHinh: []

### 4.2: Copy From Previous (No Previous)

1. Xóa tất cả chu kỳ (hoặc test với DB mới)
2. Tạo chu kỳ mới
3. Click "Copy từ chu kỳ trước"
4. **Expected:**
   - ✅ Toast: "Không tìm thấy chu kỳ trước có tiêu chí"
   - ✅ tieuChiList remains empty

### 4.3: Very Long Criteria List

1. Thêm 20 tiêu chí
2. Submit form
3. **Expected:**
   - ✅ All 20 criteria saved
   - ✅ No performance issues
   - ✅ Scroll works in TieuChiConfigSection

### 4.4: Special Characters in TenTieuChi

1. Thêm tiêu chí: "Hoàn thành > 100% (Xuất sắc)"
2. Submit
3. **Expected:**
   - ✅ Special characters saved correctly
   - ✅ Display correctly on edit

---

## 🐛 Troubleshooting

### Issue: "TieuChiCauHinh is empty in database"

**Check:**

1. Browser Console: Verify payload includes TieuChiCauHinh

   ```javascript
   🚀 Submitting ChuKy payload: { TieuChiCauHinh: [...] }
   ```

2. Network Tab: Verify request body

   ```json
   POST /workmanagement/chu-ky-danh-gia
   Request Payload: { "TieuChiCauHinh": [...] }
   ```

3. Backend Console: Verify controller receives data

   ```
   🚀 Creating ChuKy with payload: { TieuChiCauHinh: [...] }
   ```

4. Backend Code: Check destructuring
   ```javascript
   const { TieuChiCauHinh, ... } = req.body; // ← Should be present
   ```

**Fix:** Add console.log in backend controller to debug

### Issue: "Update doesn't save TieuChiCauHinh"

**Check:**

1. Backend includes `markModified('TieuChiCauHinh')`
2. Payload sent to backend includes TieuChiCauHinh
3. Update endpoint receives correct data

**Fix:** Verify `chuKy.markModified('TieuChiCauHinh')` is called before `save()`

### Issue: "Form doesn't load existing criteria"

**Check:**

1. item prop passed to ThongTinChuKyDanhGia
2. item.TieuChiCauHinh is populated
3. useState initialized correctly

**Fix:**

```javascript
const [tieuChiList, setTieuChiList] = useState(item?.TieuChiCauHinh || []);
```

---

## 📊 Expected Console Output

### Successful CREATE Flow:

```
[Frontend] 🚀 Submitting ChuKy payload: { TieuChiCauHinh: [...] }
[Frontend] 🚀 Creating ChuKy with payload: { TieuChiCauHinh: [...] }
[Backend] POST /workmanagement/chu-ky-danh-gia
[Backend] Controller: taoChuKy - TieuChiCauHinh has 3 items
[Backend] MongoDB: Inserted document with TieuChiCauHinh
[Frontend] ✅ Toast: Tạo chu kỳ đánh giá thành công
[Frontend] Dispatch: getChuKyDanhGias
```

### Successful UPDATE Flow:

```
[Frontend] 🚀 Submitting ChuKy payload: { TieuChiCauHinh: [...] }
[Frontend] 🔄 Updating ChuKy: <id> with payload: { TieuChiCauHinh: [...] }
[Backend] PUT /workmanagement/chu-ky-danh-gia/<id>
[Backend] Controller: capNhat - Updating TieuChiCauHinh
[Backend] MongoDB: Updated document, markModified called
[Frontend] ✅ Toast: Cập nhật chu kỳ đánh giá thành công
[Frontend] Dispatch: getChuKyDanhGias
```

---

## ✅ Test Completion Checklist

- [ ] Test Case 1: Create với tiêu chí - PASSED
- [ ] Test Case 2: Update tiêu chí - PASSED
- [ ] Test Case 3: KPI initialization copies criteria - PASSED
- [ ] Test Case 4.1: Empty criteria - PASSED
- [ ] Test Case 4.2: Copy from previous (no previous) - PASSED
- [ ] Test Case 4.3: Long criteria list - PASSED
- [ ] Test Case 4.4: Special characters - PASSED
- [ ] Database verification - PASSED
- [ ] Console logs appear correctly - PASSED
- [ ] No errors in console - PASSED

---

**Date:** October 15, 2025  
**Tester:** ********\_********  
**Result:** ⬜ PASS / ⬜ FAIL  
**Notes:** ********************\_\_\_********************
