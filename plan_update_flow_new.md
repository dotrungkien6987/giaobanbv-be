# Kế hoạch triển khai cập nhật workflow công việc (flow_congviec.md)

Phiên bản: 1.0
Ngày lập: (cập nhật khi commit)
Người lập: GitHub Copilot

---

## 0. Mục tiêu

Đưa backend hiện tại (modules/workmanagement) tương thích đặc tả mới trong `flow_congviec.md` với tác động tối thiểu, đảm bảo:

- Thêm nhánh workflow tùy chọn (CoDuyetHoanThanh) mà không phá vỡ dữ liệu cũ.
- Chuẩn hóa lại logic cảnh báo dùng NgayBatDau thay vì NgayGiaoViec cho mode PERCENT.
- Bổ sung trường báo cáo (SoGioTre, HoanThanhTreHan, ...).
- Đảm bảo migration an toàn và rollback nhanh.

---

## 1. Chênh lệch hiện trạng vs thiết kế

| Hạng mục                            | Hiện tại                                                            | Thiết kế mới                                              | Việc phải làm                                                  |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- | ----------------- | ------------------- |
| Workflow hoàn thành                 | hoanThanh() luôn chuyển CHO_DUYET, duyetHoanThanh() => HOAN_THANH   | Tùy CoDuyetHoanThanh: có thể vào thẳng HOAN_THANH         | Thêm field flag + rẽ nhánh ở service.hoanThanh                 |
| CoDuyetHoanThanh                    | Chưa tồn tại                                                        | bool default false                                        | Thêm schema + form create                                      |
| NgayHoanThanhTam                    | Không có                                                            | Lưu khi Hoàn thành phải chờ duyệt                         | Thêm schema + set ở hoanThanh() khi chờ duyệt                  |
| NgayTiepNhanThucTe                  | Không có (chỉ có TrangThai chuyển)                                  | Lưu thời điểm tiếp nhận                                   | Thêm schema + set ở tiepNhan()                                 |
| computeNgayCanhBao()                | Dùng ngayGiao (NgayGiaoViec) làm base cho PERCENT                   | Phải dùng NgayBatDau                                      | Sửa hàm + nơi gọi (create + update)                            |
| NgayBatDau                          | Tồn tại nhưng logic giao việc hiện auto set NgayGiaoViec khi create | Dùng làm planned start, không auto giao                   | Không auto set NgayGiaoViec trong create; chỉ khi gọi giaoViec |
| Giao việc                           | createCongViec đang set NgayGiaoViec = now                          | Chỉ set khi gọi action giao việc                          | Loại bỏ set sớm + migration backfill                           |
| Cảnh báo PERCENT recalc             | Chỉ khi đổi NgayHetHan                                              | Cả khi đổi NgayBatDau hoặc NgayHetHan                     | Thêm hook trong update                                         |
| CanhBaoSapHetHanPercent default     | Có logic default 0.8 khi PERCENT                                    | Giữ nguyên                                                | Kiểm tra vẫn hoạt động sau đổi base                            |
| FIXED validation                    | Base = NgayGiaoViec                                                 |                                                           | createdAt                                                      | Base = NgayBatDau | Sửa pre('validate') |
| SoGioTre / HoanThanhTreHan          | Chưa có                                                             | Bắt buộc khi HOAN_THANH                                   | Thêm schema + tính ở hoanThanh/duyetHoanThanh                  |
| FirstSapQuaHanAt / FirstQuaHanAt    | Chưa có                                                             | OPTIONAL                                                  | Thêm schema (optional) + cập nhật lazily                       |
| Audit LichSuTrangThai               | Đã có                                                               | Giữ + mở rộng actionExecuted                              | Thêm action mã + meta                                          |
| Audit thay đổi cảnh báo             | Chưa có LichSuCauHinhCanhBao                                        | Bắt buộc                                                  | Thêm schema + service.patchCauHinhCanhBao                      |
| Endpoint patch cảnh báo             | Không có                                                            | PATCH /congviec/:id/cauhinh-canhbao                       | Thêm route + controller + service                              |
| Due status trả về                   | Virtual TinhTrangThoiHan đơn giản (SAP_QUA_HAN, QUA_HAN, null)      | Mở rộng HOAN_THANH_TRE_HAN, HOAN_THANH_DUNG_HAN, DUNG_HAN | Mở rộng virtual hoặc map DTO                                   |
| Migration CHO_DUYET không cần duyệt | Chưa xử lý                                                          | Convert sang HOAN_THANH                                   | Viết script                                                    |
| Index {TrangThai, NgayCanhBao}      | Chưa có composite                                                   | Bắt buộc                                                  | Thêm index                                                     |

---

## 2. Danh sách trường bổ sung schema

MUST thêm:

- CoDuyetHoanThanh: { type: Boolean, default: false, index: true }
- NgayTiepNhanThucTe: { type: Date }
- NgayHoanThanhTam: { type: Date }
- SoGioTre: { type: Number, min:0 }
- HoanThanhTreHan: { type: Boolean }
- LichSuCauHinhCanhBao: [ { At, By, ModeBefore, ModeAfter, PercentBefore, PercentAfter, NgayCanhBaoBefore, NgayCanhBaoAfter } ]

SHOULD:

- FirstSapQuaHanAt: { type: Date }
- FirstQuaHanAt: { type: Date }

---

## 3. Thứ tự triển khai (phân lớp)

1. Schema & index (không phá logic cũ): thêm fields ở model (ẩn, chưa dùng) + index mới.
2. Migration script (idempotent) chạy sau deploy schema:
   - Backfill NgayBatDau nếu null ( = NgayGiaoViec || createdAt ).
   - Set CoDuyetHoanThanh=false (mặc định) cho toàn bộ.
   - Convert bản ghi TrangThai=CHO_DUYET AND CoDuyetHoanThanh=false => HOAN_THANH (set NgayHoanThanh=NgayHoanThanh || updatedAt).
   - Recalc NgayCanhBao cho mode=PERCENT dựa NgayBatDau mới (nếu lệch >1 phút so với công thức).
   - Tính SoGioTre & HoanThanhTreHan cho bản ghi đã HOAN_THANH nếu chưa có (SoGioTre = max(0, (NgayHoanThanh - NgayHetHan)/3600000)).
3. Cập nhật computeNgayCanhBao() và các nơi gọi.
4. Cập nhật virtual due status (DTO mapping) để trả đủ 5 tình trạng.
5. Refactor service actions:
   - createCongViec: bỏ auto set NgayGiaoViec; không ép cảnh báo PERCENT nếu thiếu NgayBatDau/NgayHetHan.
   - giaoViec: set NgayGiaoViec=now nếu null, TrangThai=DA_GIAO.
   - tiepNhan: set NgayTiepNhanThucTe=now nếu null, TrangThai=DANG_THUC_HIEN.
   - hoanThanh:
     - if CoDuyetHoanThanh=true => TrangThai=CHO_DUYET; NgayHoanThanhTam=now.
     - else => TrangThai=HOAN_THANH; NgayHoanThanh=now; tính SoGioTre + HoanThanhTreHan.
   - duyetHoanThanh: chuyển CHO_DUYET -> HOAN_THANH; set NgayHoanThanh=now; tính trễ.
6. Thêm endpoint PATCH cauhinh-canhbao:
   - Body: { mode, percent, fixedNgayCanhBao }
   - Validate transitions; push LichSuCauHinhCanhBao.
   - Recalc nếu mode=PERCENT.
7. LichSuTrangThai: mỗi action push {HanhDong, TuTrangThai, DenTrangThai, ThoiGian, NguoiThucHienID}.
8. FirstSapQuaHanAt / FirstQuaHanAt: hook middleware post-find? => đơn giản: trong mapCongViecDTO nếu status derivation lần đầu và field null => schedule async update (avoid slowing request).
9. DTO mở rộng: thêm CoDuyetHoanThanh, NgayHoanThanhTam, SoGioTre, HoanThanhTreHan, due status mới.
10. Tests & regression.

---

## 4. Chi tiết thay đổi code

### 4.1 Model `CongViec.js`

- Thêm fields (MUST + SHOULD) cuối schema để giảm diff conflation.
- Sửa pre('validate'):
  - FIXED base = NgayBatDau (không dùng NgayGiaoViec nữa).
- Thêm index: `congViecSchema.index({ TrangThai:1, NgayCanhBao:1 });`
- (Optional) index `congViecSchema.index({ CoDuyetHoanThanh:1, TrangThai:1 });`
- Virtual due status: mở rộng logic HOAN_THANH_TRE_HAN, HOAN_THANH_DUNG_HAN, DUNG_HAN.

### 4.2 Service `congViec.service.js`

- computeNgayCanhBao(): đổi tham số `ngayGiao` -> `ngayBatDau`.
- createCongViec():
  - Không set NgayGiaoViec.
  - Nếu mode=PERCENT và có đủ NgayBatDau & NgayHetHan thì tính NgayCanhBao.
- giaoViec(): giữ nguyên nhưng không phụ thuộc vào tính cảnh báo (chỉ recalc nếu mode=PERCENT và NgayCanhBao rỗng).
- tiepNhan(): thêm set NgayTiepNhanThucTe.
- hoanThanh(): thêm rẽ nhánh theo CoDuyetHoanThanh.
- duyetHoanThanh(): tính SoGioTre & HoanThanhTreHan.
- updateCongViec(): khi đổi NgayBatDau hoặc NgayHetHan và mode=PERCENT -> recalc.
- Thêm service.patchCauHinhCanhBao(): logic validate chuyển mode + audit lịch sử.
- Audit helper: pushLichSuTrangThai(congviec, action, from, to, userId, note?)
- Due status derivation: mapCongViecDTO bổ sung các trường mới.

### 4.3 Controller & Routes

- Thêm route PATCH `/congviec/:id/cauhinh-canhbao`.
- Trả về `actionExecuted` trong mỗi action (giao-viec, tiep-nhan, hoan-thanh, duyet-hoan-thanh, cauhinh-canhbao).

### 4.4 Migration script (tạo file riêng `scripts/migrate_flow_v2.js`)

Pseudo:

```js
// 1. Backfill dates
for each cv: if !NgayBatDau set = cv.NgayGiaoViec || cv.createdAt
// 2. Default flags
if cv.CoDuyetHoanThanh === undefined set false
// 3. Convert CHO_DUYET without approval => HOAN_THANH
if cv.TrangThai==='CHO_DUYET' && cv.CoDuyetHoanThanh===false {
  cv.TrangThai='HOAN_THANH'; cv.NgayHoanThanh = cv.NgayHoanThanh || cv.NgayHoanThanhTam || new Date();
}
// 4. Recalc PERCENT warning
if cv.CanhBaoMode==='PERCENT' and cv.NgayBatDau && cv.NgayHetHan {
  const p = cv.CanhBaoSapHetHanPercent ?? 0.8;
  const expect = new Date(cv.NgayBatDau.getTime() + (cv.NgayHetHan - cv.NgayBatDau)*p);
  if (!cv.NgayCanhBao || Math.abs(cv.NgayCanhBao - expect) > 60000) cv.NgayCanhBao = expect;
}
// 5. Completion lateness
if cv.TrangThai==='HOAN_THANH' && cv.NgayHoanThanh && cv.NgayHetHan {
  cv.HoanThanhTreHan = cv.NgayHoanThanh > cv.NgayHetHan;
  cv.SoGioTre = cv.HoanThanhTreHan ? Math.round((cv.NgayHoanThanh - cv.NgayHetHan)/3600000 * 100)/100 : 0;
}
save
```

- Idempotent: chạy nhiều lần không hỏng.

### 4.5 Testing

Unit tests (ưu tiên logic thuần):

- computeNgayCanhBao PERCENT (edge percent=0.5, 0.8, 0.99) & FIXED validation.
- Workflow transitions with/without CoDuyetHoanThanh.
- Recalc on NgayBatDau/NgayHetHan change.
- Migration script sample dataset.
  Integration smoke:
- Create -> giao -> tiepNhan -> hoanThanh (no approval) => HOAN_THANH.
- Create (CoDuyetHoanThanh=true) -> giao -> tiepNhan -> hoanThanh => CHO_DUYET -> duyet => HOAN_THANH.
- Late completion calculates SoGioTre.

---

## 5. Phân loại mức độ ưu tiên thực thi (Sprint đề xuất)

Sprint 1 (Schema & Core): 4.1, 4.2 (computeNgayCanhBao, create, hoanThanh branch), migration script thô.
Sprint 2 (Cảnh báo & Audit): patchCauHinhCanhBao endpoint, LichSuCauHinhCanhBao, recalc rules, due status mở rộng.
Sprint 3 (Báo cáo & Optional): FirstSapQuaHanAt, FirstQuaHanAt + async update, indexes tối ưu, bổ sung tests nâng cao.

---

## 6. Rủi ro & Giảm thiểu

| Rủi ro                                                            | Giảm thiểu                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Sai lệch NgayCanhBao sau migration lớn => cảnh báo ồ ạt           | Chạy dry-run script: chỉ log diff > 10 phút trước khi apply                                                                |
| Người dùng đang dùng CHO_DUYET cũ nhưng thực chất không cần duyệt | Xác định bằng rule (CoDuyetHoanThanh undefined => assume true? hoặc false). Chọn default false, gửi thông báo release note |
| Tải cao khi recalc hàng loạt                                      | Batch size & sleep giữa batches                                                                                            |
| Regression UI do DTO thay đổi                                     | Giữ tên trường cũ, chỉ thêm mới; version note FE                                                                           |

---

## 7. Rollback plan

1. Giữ backup dump trước migration (mongodump).
2. Triển khai schema mới nhưng chưa chạy migration -> nếu lỗi code: rollback container/code.
3. Sau khi chạy migration: nếu cần revert, restore dump + deploy lại code cũ.
4. Migration script có flag `DRY_RUN=1` để chỉ log.

---

## 8. Ghi chú triển khai CI/CD

- Thêm npm script: `"migrate:flowv2": "node scripts/migrate_flow_v2.js"`.
- Pipeline: deploy image -> run migration dry -> nếu OK -> run migration apply.
- Log summary: counts updated per bước.

---

## 9. Thay đổi FE liên quan (tham khảo nhanh)

- Thêm checkbox CoDuyetHoanThanh ở form tạo.
- Điều chỉnh nút Hoàn thành: nếu response.TrangThai === CHO_DUYET hiển thị badge “Chờ duyệt”.
- Hiển thị thời gian trễ (SoGioTre) & phân loại HOAN_THANH_TRE_HAN / DUNG_HAN.
- Cập nhật màu icon theo TinhTrangThoiHan mở rộng.

---

## 10. Checklist hoàn thành

MUST:

- [ ] Schema fields & index
- [ ] computeNgayCanhBao base NgayBatDau
- [ ] Branch hoanThanh theo CoDuyetHoanThanh
- [ ] SoGioTre & HoanThanhTreHan tính đúng
- [ ] Migration script chạy thành công (dry + apply)
- [ ] Recalc PERCENT khi đổi NgayBatDau/NgayHetHan
- [ ] Endpoint patch cauhinh-canhbao + audit
- [ ] Extended due status DTO

SHOULD:

- [ ] FirstSapQuaHanAt / FirstQuaHanAt lazy update
- [ ] Index {CoDuyetHoanThanh, TrangThai}
- [ ] Tests cover edge percent=0.99, fixed outside range rejected

OPTIONAL / FUTURE:

- [ ] Async job batch recompute due status caches
- [ ] SLA analytics endpoints

---

## 11. Kết luận

Kế hoạch phân lớp giảm rủi ro: trước tiên mở rộng schema (an toàn), sau đó refactor logic, cuối cùng bổ sung audit & chỉ số mở rộng. Migration idempotent & có dry-run đảm bảo khả năng rollback.

(END)
