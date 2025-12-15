# 🎯 Thumbnail Implementation - Hybrid Security Model

## Tổng quan

Đã triển khai giải pháp **Hybrid**: thumbnail public (không auth) + full image protected (cần JWT).

```
THUMBNAIL (200×200px)              FULL IMAGE (Original)
┌─────────────┐                    ┌─────────────┐
│             │                    │             │
│  🔓 PUBLIC  │                    │ 🔒 PROTECTED│
│  No Auth    │                    │ JWT Required│
│             │                    │             │
└─────────────┘                    └─────────────┘
```

## Thay đổi Backend

### 1. Routes (`modules/workmanagement/routes/files.api.js`)

```javascript
// ✅ THÊM: Thumbnail endpoint (public)
router.get("/files/:id/thumb", thumbLimiter, fileController.streamThumbnail);

// Rate limiting: 100 requests/IP/phút
```

### 2. Controller (`modules/workmanagement/controllers/file.controller.js`)

```javascript
// ✅ THÊM: Thumbnail controller
controller.streamThumbnail = catchAsync(async (req, res) => {
  const { id } = req.params;
  await fileService.streamThumbnail(id, res);
});
```

### 3. Service (`modules/workmanagement/services/file.service.js`)

```javascript
// ✅ THÊM: Thumbnail service với Sharp resize
service.streamThumbnail = async (fileId, res) => {
  // 1. Tìm file (không kiểm tra quyền)
  // 2. Kiểm tra file size (max 20MB)
  // 3. Resize 200×200px với Sharp
  // 4. Timeout 5s
  // 5. Cache 24h
};

// ✅ CẬP NHẬT: toDTO thêm thumbUrl
return {
  ...
  thumbUrl: `/api/workmanagement/files/${d._id}/thumb`,
  inlineUrl: `/api/workmanagement/files/${d._id}/inline`,
  downloadUrl: `/api/workmanagement/files/${d._id}/download`,
};
```

### 4. Dependencies

```bash
npm install sharp express-rate-limit
```

## Thay đổi Frontend

### 1. CommentsList.js

```javascript
// ❌ TRƯỚC
<img src={f.inlineUrl} />

// ✅ SAU
<img src={f.thumbUrl} />
```

### 2. RepliesList.js

```javascript
// ❌ TRƯỚC
<img src={f.inlineUrl} />

// ✅ SAU
<img src={f.thumbUrl} />
```

## Bảo mật

### Rate Limiting

- 100 requests/IP/phút
- Chống DDoS request flooding

### File Size Limit

- Max 20MB để resize
- Timeout 5s
- Chống CPU exhaustion

### Fallback

- File quá lớn → JSON error
- Resize timeout → JSON error
- File không phải ảnh → JSON error

## Testing

### Backend

```bash
# Test thumbnail endpoint (không cần auth)
curl http://localhost:8020/api/workmanagement/files/FILE_ID/thumb

# Test full image (cần auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8020/api/workmanagement/files/FILE_ID/inline
```

### Frontend

1. Mở trang có comments với ảnh
2. Kiểm tra thumbnails hiển thị (không cần đăng nhập)
3. Click vào thumbnail → xem full image (cần đăng nhập)
4. Click download → tải file (cần đăng nhập)

## Monitoring

### Logs cần theo dõi

```javascript
// Thumbnail errors
console.error(`Thumbnail error for file ${fileId}:`, err.message);

// Slow resize (>3s)
logger.warn(`Slow thumbnail resize: ${fileId} took ${duration}ms`);
```

### Metrics quan trọng

- Thumbnail response time (nên <500ms)
- Thumbnail error rate (nên <1%)
- Rate limit hits (nếu cao → tăng limit hoặc IP whitelist)

## Trade-offs

### ✅ Ưu điểm

- Đơn giản: `<img src={thumbUrl}>` như bình thường
- Nhanh: Browser cache 24h
- An toàn: Chỉ thumbnail nhỏ bị public
- Full image vẫn protected với JWT

### ⚠️ Nhược điểm

- Thumbnail không có auth (chấp nhận được)
- CPU usage tăng khi resize (giảm bằng cache)

## Nâng cấp trong tương lai

### Option 1: Redis Cache cho thumbnails

```javascript
// Cache thumbnail buffer trong Redis
const cached = await redis.get(`thumb:${fileId}`);
if (cached) return res.send(cached);
```

### Option 2: CDN cho thumbnails

```javascript
// Upload thumbnail lên CDN sau khi resize
const cdnUrl = await uploadToCDN(buffer, fileId);
// Lưu cdnUrl vào DB
```

## Kết luận

✅ Giải pháp hoạt động giống Facebook/Zalo  
✅ Bảo mật phù hợp với use case  
✅ Performance tốt với rate limiting  
✅ Dễ maintain và scale

**Status:** ✅ READY FOR PRODUCTION
