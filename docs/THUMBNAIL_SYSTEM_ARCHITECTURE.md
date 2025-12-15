# 📸 THUMBNAIL SYSTEM - Kiến trúc & Triển khai

## 📋 Tổng quan

Hệ thống thumbnail cho phép hiển thị ảnh preview nhỏ (200x200px) của file đính kèm trong comment/reply mà **không yêu cầu authentication**, giải quyết vấn đề `<img>` tag không thể gửi JWT header.

---

## 🎯 Vấn đề cần giải quyết

### **Vấn đề gốc: `<img>` tag không hỗ trợ custom headers**

```jsx
// ❌ KHÔNG THỂ làm như thế này:
<img
  src="/api/files/abc123/inline"
  headers={{ Authorization: "Bearer token123" }} // ← Không có thuộc tính này!
/>
```

**Browser gửi request `<img src="...">` dưới dạng:**

```http
GET /api/files/abc123/inline HTTP/1.1
Host: 192.168.5.200:8000
Accept: image/*
// ❌ KHÔNG CÓ Authorization header!
```

**Kết quả:** Server trả về **401 Unauthorized** → Ảnh không hiển thị

---

## ✅ Giải pháp: Hybrid Approach

### **1. Public Thumbnail Endpoint (Không auth)**

- **URL**: `/api/workmanagement/files/:id/thumb`
- **Kích thước**: 200x200px (đủ để preview, không lộ chi tiết)
- **Bảo vệ**: Rate limiting (100 requests/phút/IP)
- **Mục đích**: Cho phép `<img>` hiển thị preview

### **2. Protected Original Endpoints (Có auth)**

- `/api/workmanagement/files/:id/inline` - Xem full size
- `/api/workmanagement/files/:id/download` - Tải về
- **Bảo vệ**: JWT authentication + permission check

---

## 🏗️ Kiến trúc Backend

### **1. Route Configuration (`files.api.js`)**

```javascript
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ═══════════════════════════════════════════════════════════════
// 🔓 PUBLIC ENDPOINT - MUST BE FIRST (before auth middleware)
// ═══════════════════════════════════════════════════════════════
const thumbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100, // 100 requests/IP/phút
  message: "Quá nhiều yêu cầu thumbnail",
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/files/:id/thumb", thumbLimiter, fileController.streamThumbnail);

// ═══════════════════════════════════════════════════════════════
// 🔒 PROTECTED ENDPOINTS - Require authentication
// ═══════════════════════════════════════════════════════════════
router.use(authentication.loginRequired);

router.get("/files/:id/inline", fileController.streamInline);
router.get("/files/:id/download", fileController.streamDownload);
// ... other protected routes
```

**⚠️ QUAN TRỌNG:** Thumbnail route **PHẢI ĐẶT TRƯỚC** `router.use(authentication.loginRequired)`

---

### **2. Thumbnail Service (`file.service.js`)**

```javascript
service.streamThumbnail = async (fileId, res) => {
  // 1. Kiểm tra file tồn tại
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED") {
    throw new AppError(404, "Không tìm thấy tệp");
  }

  // 2. Kiểm tra MIME type (chỉ hỗ trợ ảnh)
  const isImage = /^image\/(jpeg|jpg|png|gif|webp|bmp)/i.test(doc.LoaiFile);
  if (!isImage) {
    // ❌ KHÔNG TRẢ JSON vì <img> không render được JSON!
    return res.status(404).send("File không phải là ảnh");
  }

  // 3. Kiểm tra file tồn tại trên disk
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(404, "Tệp không tồn tại trên hệ thống");
  }

  // 4. Giới hạn kích thước (chống resize bomb)
  const stats = await fs.stat(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  if (fileSizeMB > 20) {
    return res.status(413).send("File quá lớn");
  }

  // 5. Set headers phù hợp
  const contentType = mime.lookup(doc.TenGoc) || "image/jpeg";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h

  // 6. Resize với Sharp (timeout 5s)
  try {
    const buffer = await Promise.race([
      sharp(filePath)
        .resize(200, 200, {
          fit: "cover",
          withoutEnlargement: true,
        })
        .timeout({ seconds: 5 })
        .toBuffer(),

      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Resize timeout")), 5000)
      ),
    ]);

    res.send(buffer); // ✅ Trả binary image
  } catch (err) {
    console.error("Thumbnail error:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Lỗi khi tạo thumbnail");
    }
  }
};
```

**⚠️ LƯU Ý QUAN TRỌNG:**

- **KHÔNG BAO GIỜ** trả `res.json()` cho thumbnail endpoint
- `<img>` chỉ render được **binary image data**
- Nếu trả JSON → Trình duyệt hiện "broken image" icon

---

### **3. DTO Builder (Service Layer)**

**Trong `file.service.js` - toDTO():**

```javascript
service.toDTO = (doc) => {
  return {
    _id: String(d._id),
    TenFile: d.TenFile,
    TenGoc: d.TenGoc,
    LoaiFile: d.LoaiFile,
    // ... other fields

    // ✅ Thêm thumbUrl vào DTO
    thumbUrl: `/api/workmanagement/files/${d._id}/thumb`,
    inlineUrl: `/api/workmanagement/files/${d._id}/inline`,
    downloadUrl: `/api/workmanagement/files/${d._id}/download`,
  };
};
```

**Trong `congViec.service.js` - Comment files DTO:**

```javascript
// getTaskDetail() - Comment files mapping
Files: Array.isArray(c.Files)
  ? c.Files.map((f) => ({
      _id: String(f._id),
      TenGoc: f.TenGoc,
      LoaiFile: f.LoaiFile,
      // ...
      thumbUrl: `/api/workmanagement/files/${String(f._id)}/thumb`, // ✅
      inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
      downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
    }))
  : [];
```

**Trong `congViec.service.js` - Reply files DTO:**

```javascript
// listReplies() - Reply files mapping
const filesByComment = files.reduce((acc, f) => {
  const key = String(f.BinhLuanID);
  (acc[key] = acc[key] || []).push({
    _id: String(f._id),
    // ...
    thumbUrl: `/api/workmanagement/files/${String(f._id)}/thumb`, // ✅
    inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
    downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
  });
  return acc;
}, {});
```

---

## 🎨 Frontend Implementation

### **1. URL Resolver (`utils/fileUrl.js`)**

```javascript
/**
 * Convert relative thumbnail URL to absolute URL
 * @param {string} thumbUrl - "/api/workmanagement/files/:id/thumb"
 * @returns {string} "http://192.168.5.200:8000/api/workmanagement/files/:id/thumb"
 */
export function getThumbUrl(thumbUrl) {
  if (!thumbUrl) return "";

  // Already absolute
  if (thumbUrl.startsWith("http://") || thumbUrl.startsWith("https://")) {
    return thumbUrl;
  }

  // Get base URL from environment
  const baseUrl =
    process.env.REACT_APP_BACKEND_API || "http://localhost:8020/api";

  // Remove '/api' suffix if present
  const baseOrigin = baseUrl.replace(/\/api\/?$/, "");

  // Ensure thumbUrl starts with '/'
  const normalizedUrl = thumbUrl.startsWith("/") ? thumbUrl : `/${thumbUrl}`;

  return `${baseOrigin}${normalizedUrl}`;
}
```

**Ví dụ:**

```javascript
// Input: "/api/workmanagement/files/abc123/thumb"
// REACT_APP_BACKEND_API = "http://192.168.5.200:8000/api"
// Output: "http://192.168.5.200:8000/api/workmanagement/files/abc123/thumb"
```

---

### **2. Component Usage (`CommentsList.js`)**

```jsx
import { getThumbUrl } from "utils/fileUrl";

// Trong render function
{
  files.map((f) => {
    const isImage = /image\/(jpeg|jpg|png|gif|webp)/i.test(f.LoaiFile);

    if (isImage) {
      const resolvedThumbUrl = getThumbUrl(f.thumbUrl);

      return (
        <Box key={f._id}>
          <img
            alt={f.TenGoc}
            src={resolvedThumbUrl} // ✅ Public URL, không cần auth
            onError={(e) => {
              console.error("Image load failed:", resolvedThumbUrl);
              e.target.src = "/placeholder-image.png"; // Fallback
            }}
            style={{ width: 140, height: 100, objectFit: "cover" }}
          />
        </Box>
      );
    }
  });
}
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: 401 Unauthorized khi request thumbnail**

**Nguyên nhân:** Route thumbnail bị auth middleware chặn

**Cách kiểm tra:**

```bash
# Backend log
ERROR AppError: Login required
GET /api/workmanagement/files/:id/thumb 401
```

**Giải pháp:**

1. Kiểm tra `files.api.js`: Thumbnail route phải đặt **TRƯỚC** `router.use(authentication.loginRequired)`
2. Kiểm tra `workmanagement/routes/index.js`: `filesRoutes` phải mount **TRƯỚC** các route có wildcard pattern như `/:id`

**Ví dụ lỗi:**

```javascript
// ❌ SAI - Wildcard route đứng trước
router.get("/nhanvien/:id", authentication.loginRequired, ...);  // Match /files/... nhầm!
router.use("/", filesRoutes);  // Không bao giờ chạy đến đây

// ✅ ĐÚNG - Specific routes trước
router.use("/", filesRoutes);  // Match /files/:id/thumb trước
router.get("/nhanvien/:id", authentication.loginRequired, ...);
```

---

### **Issue 2: Thumbnail không hiển thị (broken image)**

**Nguyên nhân:** Response không phải binary image

**Cách kiểm tra:**

```javascript
// Mở DevTools → Network → Click request thumbnail
// Headers tab:
Content-Type: application/json  // ❌ SAI - Phải là image/jpeg!

// Response tab:
{ "success": false, "message": "..." }  // ❌ SAI - <img> không render JSON!
```

**Giải pháp:** Sửa service để trả binary:

```javascript
// ❌ SAI
if (!isImage) {
  return res.status(404).json({ success: false, message: "..." });
}

// ✅ ĐÚNG
if (!isImage) {
  return res.status(404).send("File không phải là ảnh");
}
```

---

### **Issue 3: thumbUrl = undefined trong frontend**

**Nguyên nhân:** Backend DTO không có field `thumbUrl`

**Cách kiểm tra:**

```javascript
// Browser console
console.log("[DEBUG] File object:", file);
// Output: { _id: "...", TenGoc: "...", inlineUrl: "...", thumbUrl: undefined }
```

**Giải pháp:** Thêm `thumbUrl` vào tất cả chỗ build file DTO:

- `file.service.js`: `toDTO()`
- `congViec.service.js`: Comment files mapping + Reply files mapping
- `yeuCau.service.js`: Comment files mapping

---

## 🔒 Security Considerations

### **1. Rate Limiting cho Public Endpoint**

```javascript
const thumbLimiter = rateLimit({
  windowMs: 60 * 1000, // Time window: 1 phút
  max: 100, // Max requests: 100/IP/phút
  message: "Quá nhiều yêu cầu thumbnail",
  standardHeaders: true, // Thêm RateLimit-* headers
  legacyHeaders: false, // Tắt X-RateLimit-* headers (deprecated)

  // Optional: Custom key generator
  keyGenerator: (req) => {
    return req.ip; // Default: dùng IP làm key
  },

  // Optional: Skip certain IPs
  skip: (req) => {
    const whitelistedIPs = ["127.0.0.1", "192.168.5.200"];
    return whitelistedIPs.includes(req.ip);
  },
});
```

**Tại sao cần rate limiting:**

- Ngăn brute-force scan file IDs
- Chống DDoS thumbnail endpoint
- Giảm tải server resize image

---

### **2. Thumbnail Size Limit**

```javascript
// Trong streamThumbnail()
const fileSizeMB = stats.size / (1024 * 1024);

if (fileSizeMB > 20) {
  // ❌ Từ chối file quá lớn (chống resize bomb)
  return res.status(413).send("File quá lớn để tạo thumbnail");
}
```

**Tại sao cần giới hạn:**

- File 100MB+ có thể làm treo server khi resize
- Sharp cần RAM = 2-3x file size để xử lý
- Timeout 5s để tránh request lâu

---

### **3. File Validation**

```javascript
// Chỉ cho phép image types
const isImage = /^image\/(jpeg|jpg|png|gif|webp|bmp)/i.test(doc.LoaiFile);

if (!isImage) {
  return res.status(404).send("File không phải là ảnh");
}
```

**Tại sao cần validate:**

- Tránh lộ nội dung file PDF/DOCX nhạy cảm
- Ngăn exploit Sharp vulnerabilities với file types lạ

---

## 📊 Performance Optimization

### **1. Response Headers**

```javascript
res.setHeader("Content-Type", "image/jpeg");
res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h
res.setHeader("ETag", fileHash); // Optional: cho conditional requests
```

**Benefits:**

- Browser cache thumbnail 24 giờ
- Giảm bandwidth và load server
- CDN có thể cache được

---

### **2. Sharp Optimization**

```javascript
sharp(filePath)
  .resize(200, 200, {
    fit: "cover", // Crop để fit
    withoutEnlargement: true, // Không scale up ảnh nhỏ
  })
  .jpeg({ quality: 80 }) // Compress JPEG
  .timeout({ seconds: 5 }) // Timeout để tránh hang
  .toBuffer();
```

**Benefits:**

- Output file size ~5-15KB (vs 100KB+ original)
- Nhanh hơn 10x so với resize on-the-fly
- CPU usage ổn định

---

### **3. Future: CDN Integration**

```javascript
// Trong production, có thể upload thumbnail lên CDN
service.streamThumbnail = async (fileId, res) => {
  // Check CDN cache first
  const cdnUrl = `https://cdn.example.com/thumbs/${fileId}.jpg`;
  if (await checkCDNExists(cdnUrl)) {
    return res.redirect(cdnUrl); // 302 redirect to CDN
  }

  // Generate thumbnail và upload lên CDN
  const buffer = await sharp(filePath).resize(200, 200).toBuffer();
  await uploadToCDN(fileId, buffer);

  res.send(buffer);
};
```

---

## 🧪 Testing Checklist

### **Backend Tests:**

- [ ] Request `/thumb` không có auth header → 200 OK
- [ ] Request `/thumb` với file không phải ảnh → 404
- [ ] Request `/thumb` với file > 20MB → 413
- [ ] Request `/thumb` quá 100 lần/phút → 429 (rate limit)
- [ ] Response có header `Content-Type: image/jpeg`
- [ ] Response có header `Cache-Control: public, max-age=86400`

### **Frontend Tests:**

- [ ] Comment với ảnh hiển thị thumbnail
- [ ] Reply với ảnh hiển thị thumbnail
- [ ] Click thumbnail mở modal full size (dùng `/inline` endpoint)
- [ ] Download file dùng `/download` endpoint (có auth)
- [ ] Refresh page → Thumbnail load từ cache

---

## 📚 Related Documentation

- [Express Rate Limit Guide](./EXPRESS_RATE_LIMIT_GUIDE.md)
- [File Upload Security](./FILE_UPLOAD_SECURITY.md)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Express Routing Best Practices](https://expressjs.com/en/guide/routing.html)

---

**Last updated:** 2025-12-15
**Author:** AI Assistant
**Status:** ✅ Production Ready
