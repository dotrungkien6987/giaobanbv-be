# 🔍 DEBUG: YEUCAU_DISPATCHED (Điều phối không tạo Notification)

> **Ngày tạo**: 17/12/2025  
> **Vấn đề**: Sau khi điều phối yêu cầu thành công, collection `notifications` không có bản ghi mới

---

## ✅ ĐÃ THÊM CONSOLE.LOG CHI TIẾT

Các log được thêm vào pipeline để trace luồng:

### 1. YeuCauStateMachine (nơi fire trigger)

**File**: `modules/workmanagement/services/yeuCauStateMachine.js`

**Logs thêm**:

- `[YeuCauStateMachine] 🔥 About to fire trigger: ${triggerKey}`
- Context đầy đủ: requestId, requestCode, requesterName, assigneeName, dispatcherName, performerId, hasYeuCau, yeuCauNguoiYeuCauID, yeuCauNguoiDuocDieuPhoiID
- `[YeuCauStateMachine] ✅ Fired trigger: ${triggerKey}`

### 2. TriggerService (pipeline chính)

**File**: `services/triggerService.js`

**Logs thêm**:

- `[TriggerService] 📥 fire() called: ${triggerKey}` - Đầu vào
- `[TriggerService] 📋 recipientNhanVienIds:` - Recipients NhanVienID từ handler
- `[TriggerService] 👥 Converted to userIds:` - Sau khi resolve NhanVien→User
- `[TriggerService] 🔍 Resolving performer NhanVienID to UserID` - Performer resolution
- `[TriggerService] 👤 Performer UserID:` - UserID của performer
- `[TriggerService] 🎯 Recipients after exclude: ${count}/${original}` - Sau excludePerformer
- `[TriggerService] 🚀 Sending notification to ${count} users:` - Trước khi gọi sendToMany
- `[TriggerService] 📧 Template: ${templateCode}, Priority: ${priority}`
- `[TriggerService] 📦 Data keys:` - Variables có trong data
- `[TriggerService] ✅ Sent ${success}/${total} notifications` - Kết quả cuối

### 3. NotificationHelper (resolve NhanVienID→UserID)

**File**: `helpers/notificationHelper.js`

**Logs sẵn có** (đã có từ trước):

- `[notificationHelper] 📥 resolveNhanVienListToUserIds input:`
- `[notificationHelper] 🔍 validIds after extract & filter:`
- `[notificationHelper] ✅ Found ${users.length} users:` - Kèm mapping \_id↔NhanVienID

### 4. NotificationService (insert DB)

**File**: `modules/workmanagement/services/notificationService.js`

**Logs thêm**:

- `[NotificationService] 📨 send() called for recipientId: ${recipientId}, type: ${type}`
- `[NotificationService] 🔄 After resolve: userId = ${userId}` - Sau convert
- `[NotificationService] ✅ recipientId is already a valid UserID` hoặc `❌ No user found`
- `[NotificationService] 🔍 Checking settings for user ${userId}, type ${type}`
- `[NotificationService] 🔔 shouldSend result: ${result}` - Settings check
- `[NotificationService] ❌ User ${userId} disabled ${type} notifications (settings block)` nếu chặn
- `[NotificationService] ✅ Successfully inserted notification to DB: ${notificationId}` - Insert thành công
- `[NotificationService] 📮 sendToMany called: type=${type}, recipients=${count}`
- `[NotificationService] 📊 sendToMany result: ${success}/${total} successful`

---

## 🧪 HƯỚNG DẪN TEST

### Bước 1: Khởi động lại backend

```powershell
cd D:\project\webBV\giaobanbv-be
npm run dev
```

Quan sát terminal, bạn sẽ thấy:

```
[TriggerService] ✅ Loaded 38 triggers (X enabled, Y disabled)
```

Nếu có disabled triggers, sẽ in ra: `[TriggerService] ⚠️ Disabled: ...`

### Bước 2: Chuẩn bị test case

**Yêu cầu**:

1. Một yêu cầu ở trạng thái `TIEP_NHAN` (đã tiếp nhận)
2. Người điều phối phải là user có quyền `manager` trở lên
3. Có nhân viên xử lý (assignee) để điều phối tới

**Lấy thông tin cần thiết** (MongoDB Compass hoặc shell):

```js
// Tìm 1 yêu cầu test
db.yeucaus.findOne(
  { TrangThai: "TIEP_NHAN", isDeleted: { $ne: true } },
  { _id: 1, MaYeuCau: 1, NguoiYeuCauID: 1, NguoiXuLyID: 1, TrangThai: 1 }
);

// Copy ra _id của yêu cầu để test
```

### Bước 3: Thực hiện điều phối qua UI

1. Đăng nhập vào FE với tài khoản manager/admin
2. Vào **Yêu cầu** → Tìm yêu cầu cần test
3. Click vào yêu cầu → Mở chi tiết
4. Click nút **"Phân công"** hoặc **"Điều phối"**
5. Chọn nhân viên xử lý
6. Click **"Xác nhận điều phối"**

### Bước 4: Theo dõi logs backend

**Luồng MONG ĐỢI khi điều phối thành công**:

```
[YeuCauStateMachine] 🔥 About to fire trigger: YeuCau.DIEU_PHOI
[YeuCauStateMachine] 📦 Context: {
  requestId: '...',
  requestCode: 'YC-...',
  requesterName: 'Tên người yêu cầu',
  assigneeName: 'Tên người được điều phối',
  dispatcherName: 'Tên người điều phối',
  performerId: ObjectId('...'),  ← NhanVienID của dispatcher
  hasYeuCau: true,
  yeuCauNguoiYeuCauID: ObjectId('...'),  ← NhanVienID requester
  yeuCauNguoiDuocDieuPhoiID: ObjectId('...')  ← NhanVienID assignee
}
[TriggerService] 📥 fire() called: YeuCau.DIEU_PHOI
[TriggerService] 📋 recipientNhanVienIds: [ObjectId('requester'), ObjectId('assignee')]
[notificationHelper] 📥 resolveNhanVienListToUserIds input: [...]
[notificationHelper] 🔍 validIds after extract & filter: [...]
[notificationHelper] ✅ Found 2 users: [...]  ← QUAN TRỌNG: phải có 2 users
[TriggerService] 👥 Converted to userIds: [ObjectId('user1'), ObjectId('user2')]
[TriggerService] 🔍 Resolving performer NhanVienID to UserID: ObjectId('dispatcherNhanVienID')
[TriggerService] 👤 Performer UserID: ObjectId('dispatcherUserId')
[TriggerService] 🎯 Recipients after exclude: 2/2 (removed performer: 0)  ← hoặc 1/2 nếu dispatcher = requester/assignee
[TriggerService] 🚀 Sending notification to 2 users: [...]
[TriggerService] 📧 Template: YEUCAU_DISPATCHED, Priority: normal
[TriggerService] 📦 Data keys: [...]
[NotificationService] 📮 sendToMany called: type=YEUCAU_DISPATCHED, recipients=2
[NotificationService] 📨 send() called for recipientId: ObjectId('...'), type: YEUCAU_DISPATCHED
[NotificationService] 🔄 After resolve: userId = ObjectId('...')
[NotificationService] 🔍 Checking settings for user ..., type YEUCAU_DISPATCHED
[NotificationService] 🔔 shouldSend result: true
[NotificationService] ✅ Successfully inserted notification to DB: ObjectId('notificationId') for user ...
[NotificationService] 📨 send() called for recipientId: ObjectId('...'), type: YEUCAU_DISPATCHED  ← Recipient thứ 2
[NotificationService] 🔄 After resolve: userId = ObjectId('...')
...
[NotificationService] ✅ Successfully inserted notification to DB: ObjectId('notificationId2') for user ...
[NotificationService] 📊 sendToMany result: 2/2 successful (0 nulls filtered)
[TriggerService] ✅ Sent 2/2 notifications for: YeuCau.DIEU_PHOI (nulls filtered: 0)
[YeuCauStateMachine] ✅ Fired trigger: YeuCau.DIEU_PHOI
```

### Bước 5: Xác định điểm dừng (nếu KHÔNG có notification DB)

#### **Điểm 1: Trigger không được gọi**

**Log xuất hiện**:

- Không thấy `[YeuCauStateMachine] 🔥 About to fire trigger`

**Nguyên nhân**: Controller không gọi state machine hoặc action sai
**Kiểm tra**: FE có gọi đúng endpoint `/workmanagement/yeucau/:id/dieu-phoi` không?

---

#### **Điểm 2: Trigger disabled**

**Log xuất hiện**:

```
[TriggerService] 📥 fire() called: YeuCau.DIEU_PHOI
[TriggerService] ⏭️ Skipped (disabled): YeuCau.DIEU_PHOI
```

**Nguyên nhân**: `config/notificationTriggers.js` có `enabled: false` cho trigger này
**Fix**: Sửa trigger config:

```js
{
  module: "yeuCau",
  trigger: "DIEU_PHOI",
  enabled: true,  // ← Đổi thành true
  // ...
}
```

---

#### **Điểm 3: Handler trả null**

**Log xuất hiện**:

```
[TriggerService] 📥 fire() called: YeuCau.DIEU_PHOI
[TriggerService] ⚠️ Handler returned null for: YeuCau.DIEU_PHOI
```

**Nguyên nhân**: Context thiếu `yeuCau` hoặc `yeuCau` không được populate
**Kiểm tra**: Log trong YeuCauStateMachine có `hasYeuCau: true` không?
**Fix**: Đảm bảo state machine populate đầy đủ YeuCau trước khi build context

---

#### **Điểm 4: Recipients rỗng (NhanVienIDs)**

**Log xuất hiện**:

```
[TriggerService] 📋 recipientNhanVienIds: []
[notificationHelper] ⚠️ Empty or invalid input array
[TriggerService] 👥 Converted to userIds: []
[TriggerService] ⚠️ No valid recipients for: YeuCau.DIEU_PHOI
```

**Nguyên nhân**: YeuCau không có `NguoiYeuCauID` hoặc `NguoiDuocDieuPhoiID`
**Kiểm tra DB**:

```js
db.yeucaus.findOne(
  { _id: ObjectId("<yeuCauId>") },
  { NguoiYeuCauID: 1, NguoiDuocDieuPhoiID: 1 }
);
```

**Fix**: Đảm bảo khi tạo/điều phối YeuCau, các trường này được set đúng

---

#### **Điểm 5: Recipients không map được sang UserIds** 🔥 KHẢ NĂNG CAO NHẤT

**Log xuất hiện**:

```
[TriggerService] 📋 recipientNhanVienIds: [ObjectId('...'), ObjectId('...')]
[notificationHelper] 📥 resolveNhanVienListToUserIds input: [...]
[notificationHelper] 🔍 validIds after extract & filter: [ObjectId('...'), ObjectId('...')]
[notificationHelper] ✅ Found 0 users: []  ← KHÔNG TÌM THẤY USER NÀO
[TriggerService] 👥 Converted to userIds: []
[TriggerService] ⚠️ No valid recipients for: YeuCau.DIEU_PHOI
```

**Nguyên nhân**:

- Các NhanVien (requester/assignee) **KHÔNG CÓ TÀI KHOẢN USER** trong collection `users`
- Hoặc User có nhưng `User.NhanVienID` không khớp với NhanVien.\_id
- Hoặc User bị `isDeleted: true`

**Kiểm tra DB** (quan trọng nhất):

```js
// 1. Lấy NhanVienIDs từ YeuCau
const yeuCau = db.yeucaus.findOne({ _id: ObjectId("<yeuCauId>") });
const nhanVienIds = [yeuCau.NguoiYeuCauID, yeuCau.NguoiDuocDieuPhoiID];

// 2. Tìm Users mapping với NhanVienIDs này
db.users
  .find(
    {
      NhanVienID: { $in: nhanVienIds },
      isDeleted: { $ne: true },
    },
    { _id: 1, UserName: 1, HoTen: 1, NhanVienID: 1 }
  )
  .pretty();

// KẾT QUẢ MONG ĐỢI: 2 users
// NẾU KẾT QUẢ: 0 users → ĐÂY LÀ NGUYÊN NHÂN
```

**Fix**:

```js
// Tạo User cho NhanVien chưa có User
db.users.insertOne({
  UserName: "username_nhanvien",
  PassWord: "<hash_password>",
  NhanVienID: ObjectId("<nhanVienId>"),
  HoTen: "Họ tên",
  Email: "email@example.com",
  PhanQuyen: "user",
  KhoaID: ObjectId("<khoaId>"),
  isDeleted: false,
});
```

---

#### **Điểm 6: Rỗng sau excludePerformer**

**Log xuất hiện**:

```
[TriggerService] 👥 Converted to userIds: [ObjectId('user1')]
[TriggerService] 🔍 Resolving performer NhanVienID to UserID: ObjectId('...')
[TriggerService] 👤 Performer UserID: ObjectId('user1')
[TriggerService] 🎯 Recipients after exclude: 0/1 (removed performer: 1)
[TriggerService] ⚠️ No recipients after exclusion for: YeuCau.DIEU_PHOI
```

**Nguyên nhân**:

- Người điều phối (dispatcher) ĐỒNG THỜI là người yêu cầu hoặc người được điều phối
- Chỉ có 1 recipient và người đó chính là performer

**Fix**:

- Nếu đúng nghiệp vụ thì không fix (vì không nên gửi cho chính mình)
- Nếu muốn vẫn gửi: đổi `excludePerformer: false` trong trigger config (không khuyến khích)

---

#### **Điểm 7: Settings chặn** (Bạn đã loại trừ khả năng này)

**Log xuất hiện**:

```
[NotificationService] 📨 send() called for recipientId: ObjectId('...'), type: YEUCAU_DISPATCHED
[NotificationService] 🔄 After resolve: userId = ObjectId('...')
[NotificationService] 🔍 Checking settings for user ..., type YEUCAU_DISPATCHED
[NotificationService] 🔔 shouldSend result: false
[NotificationService] ❌ User ... disabled YEUCAU_DISPATCHED notifications (settings block)
```

**Kiểm tra DB**:

```js
db.usernotificationsettings.findOne(
  { userId: ObjectId("<userId>") },
  { enableNotifications: 1, "typePreferences.YEUCAU_DISPATCHED": 1 }
);
```

**Fix**:

```js
// Bật lại
db.usernotificationsettings.updateOne(
  { userId: ObjectId("<userId>") },
  {
    $set: {
      enableNotifications: true,
      "typePreferences.YEUCAU_DISPATCHED.inapp": true,
    },
  }
);
```

---

## 📊 CHECKLIST XÁC ĐỊNH NHANH

Sau khi thực hiện điều phối, check theo thứ tự:

- [ ] **Trigger có được gọi không?** → Tìm `[YeuCauStateMachine] 🔥 About to fire trigger`
- [ ] **Trigger có enabled không?** → Không thấy `⏭️ Skipped (disabled)`
- [ ] **Handler có trả recipients không?** → Tìm `📋 recipientNhanVienIds: [...]` (không rỗng)
- [ ] **Recipients map được sang UserIds không?** → Tìm `✅ Found X users` (X > 0)
- [ ] **Còn recipients sau excludePerformer không?** → Tìm `🎯 Recipients after exclude: X/Y` (X > 0)
- [ ] **Có vào sendToMany không?** → Tìm `📮 sendToMany called`
- [ ] **Có insert DB thành công không?** → Tìm `✅ Successfully inserted notification to DB`

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau test, bạn sẽ thu được:

1. **Full logs** từ YeuCauStateMachine → TriggerService → NotificationHelper → NotificationService
2. **Điểm dừng chính xác** (nếu không có notification DB)
3. **Dữ liệu cụ thể** để fix (VD: NhanVienID nào không có User, UserID nào bị settings chặn)

---

## 📝 CÁCH CHIA SẺ KẾT QUẢ

Copy toàn bộ logs từ terminal sau khi điều phối (từ dòng `[YeuCauStateMachine] 🔥` đến dòng cuối cùng có `[TriggerService]` hoặc `[NotificationService]`).

Ví dụ:

```
[YeuCauStateMachine] 🔥 About to fire trigger: YeuCau.DIEU_PHOI
...
[TriggerService] ⚠️ No valid recipients for: YeuCau.DIEU_PHOI
```

Và kèm theo:

- YeuCau.\_id đã test
- User đang đăng nhập (để biết performerId)

---

**Sẵn sàng để test!** 🚀
