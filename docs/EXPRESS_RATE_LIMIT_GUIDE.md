# 🛡️ EXPRESS-RATE-LIMIT - Security Guide

## 📋 Tổng quan

`express-rate-limit` là middleware giới hạn số lượng requests từ một IP/user trong khoảng thời gian nhất định, bảo vệ API khỏi:

- **Brute-force attacks** (đoán password)
- **DDoS attacks** (tấn công từ chối dịch vụ)
- **API abuse** (spam requests)
- **Scraping/crawling** không kiểm soát

---

## 🚀 Installation & Basic Setup

### **1. Installation**

```bash
npm install express-rate-limit
```

### **2. Basic Usage**

```javascript
const rateLimit = require("express-rate-limit");

// Tạo limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Max 100 requests/IP
  message: "Quá nhiều requests từ IP này, vui lòng thử lại sau",
});

// Apply cho tất cả routes
app.use(limiter);

// Hoặc apply cho specific route
app.post("/api/login", limiter, loginController);
```

---

## ⚙️ Configuration Options

### **Các tham số quan trọng:**

```javascript
const limiter = rateLimit({
  // ════════════════════════════════════════════════════════════
  // Time Window
  // ════════════════════════════════════════════════════════════
  windowMs: 15 * 60 * 1000, // 15 phút (đơn vị: milliseconds)

  // ════════════════════════════════════════════════════════════
  // Request Limit
  // ════════════════════════════════════════════════════════════
  max: 100, // Max 100 requests trong windowMs

  // ════════════════════════════════════════════════════════════
  // Response
  // ════════════════════════════════════════════════════════════
  message: "Too many requests", // Hoặc object/function
  statusCode: 429, // HTTP status code (default: 429)

  // ════════════════════════════════════════════════════════════
  // Headers
  // ════════════════════════════════════════════════════════════
  standardHeaders: true, // Thêm RateLimit-* headers (RFC 6585)
  legacyHeaders: false, // Tắt X-RateLimit-* headers (deprecated)

  // ════════════════════════════════════════════════════════════
  // Key Generator (Identify client)
  // ════════════════════════════════════════════════════════════
  keyGenerator: (req) => {
    return req.ip; // Default: dùng IP
    // return req.user?.id;      // Hoặc dùng user ID nếu authenticated
  },

  // ════════════════════════════════════════════════════════════
  // Skip Conditions
  // ════════════════════════════════════════════════════════════
  skip: (req) => {
    // Skip rate limit cho admin hoặc whitelist IPs
    if (req.user?.role === "admin") return true;
    if (["127.0.0.1", "192.168.5.200"].includes(req.ip)) return true;
    return false;
  },

  // ════════════════════════════════════════════════════════════
  // Custom Handler (Optional)
  // ════════════════════════════════════════════════════════════
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: options.message,
      retryAfter: res.getHeader("Retry-After"),
    });
  },

  // ════════════════════════════════════════════════════════════
  // Store (Default: MemoryStore)
  // ════════════════════════════════════════════════════════════
  store: undefined, // Hoặc dùng Redis store (xem phần dưới)
});
```

---

## 🎯 Use Cases trong Hệ thống

### **1. Public Thumbnail Endpoint**

**File:** `modules/workmanagement/routes/files.api.js`

```javascript
const thumbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100, // 100 requests/IP/phút
  message: {
    success: false,
    message: "Quá nhiều yêu cầu thumbnail, vui lòng thử lại sau",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply cho thumbnail endpoint (public, không cần auth)
router.get("/files/:id/thumb", thumbLimiter, fileController.streamThumbnail);
```

**Tại sao cần:**

- Endpoint public (không auth) → Dễ bị abuse
- Image resizing tốn CPU → Cần giới hạn
- Ngăn scan/brute-force file IDs

---

### **2. Login Endpoint (Chống Brute-force)**

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Max 5 login attempts
  message: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút",
  skipSuccessfulRequests: true, // Không count request thành công
});

router.post("/auth/login", loginLimiter, authController.login);
```

**Scenario:**

```
User A: 192.168.1.100
- Attempt 1: Wrong password → Count = 1
- Attempt 2: Wrong password → Count = 2
- Attempt 3: Wrong password → Count = 3
- Attempt 4: Wrong password → Count = 4
- Attempt 5: Wrong password → Count = 5
- Attempt 6: Correct password → ❌ 429 Too Many Requests
  → Phải chờ 15 phút!
```

---

### **3. API Creation Endpoints (Chống Spam)**

```javascript
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 50, // Max 50 creates/giờ
  message: "Bạn đã tạo quá nhiều yêu cầu, vui lòng thử lại sau",
  keyGenerator: (req) => {
    // Rate limit theo user ID (nếu authenticated)
    return req.userId || req.ip;
  },
});

router.post(
  "/congviec",
  authentication.loginRequired,
  createLimiter,
  congViecController.create
);

router.post(
  "/yeucau",
  authentication.loginRequired,
  createLimiter,
  yeuCauController.create
);
```

---

### **4. File Upload Endpoints**

```javascript
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 20, // Max 20 uploads/giờ
  message: "Bạn đã upload quá nhiều files, vui lòng thử lại sau",
  skipFailedRequests: true, // Không count upload thất bại (validation error)
});

router.post(
  "/congviec/:id/files",
  authentication.loginRequired,
  uploadLimiter,
  upload.array("files"),
  fileController.uploadForTask
);
```

---

## 🌐 Response Headers

Khi rate limit được áp dụng, middleware thêm headers vào response:

### **Standard Headers (RFC 6585):**

```http
HTTP/1.1 200 OK
RateLimit-Limit: 100              # Max requests trong window
RateLimit-Remaining: 73           # Số requests còn lại
RateLimit-Reset: 1702656000       # Unix timestamp khi reset
```

### **Khi vượt quá limit (429):**

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1702656000
Retry-After: 900                  # Số giây phải chờ (15 phút)

{
  "success": false,
  "message": "Quá nhiều requests từ IP này"
}
```

---

## 🗄️ Store Options

### **1. MemoryStore (Default - Single Server)**

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // store: undefined,  // Tự động dùng MemoryStore
});
```

**Ưu điểm:**

- ✅ Không cần setup thêm
- ✅ Nhanh (in-memory)

**Nhược điểm:**

- ❌ Mất data khi restart server
- ❌ Không work với multi-server (load balancer)

---

### **2. RedisStore (Production - Multi-Server)**

**Installation:**

```bash
npm install rate-limit-redis redis
```

**Setup:**

```javascript
const RedisStore = require("rate-limit-redis");
const { createClient } = require("redis");

// Tạo Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.connect();

// Tạo limiter với Redis store
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:", // Key prefix trong Redis
  }),
});
```

**Redis keys:**

```
rl:192.168.1.100  → 73 (remaining requests)
rl:192.168.1.101  → 25
```

**Ưu điểm:**

- ✅ Persistent (không mất data khi restart)
- ✅ Work với multi-server
- ✅ Có thể monitor qua Redis CLI

**Nhược điểm:**

- ❌ Cần setup Redis server
- ❌ Tăng latency nhẹ (network call)

---

## 🔧 Advanced Patterns

### **1. Dynamic Limits dựa vào User Role**

```javascript
const dynamicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => {
    // Admin: 1000 requests/giờ
    if (req.user?.role === "admin") return 1000;

    // Manager: 500 requests/giờ
    if (req.user?.role === "manager") return 500;

    // User thường: 100 requests/giờ
    return 100;
  },
  message: (req, res) => {
    const limit = res.getHeader("RateLimit-Limit");
    return `Bạn đã vượt quá ${limit} requests/giờ`;
  },
});
```

---

### **2. Cascading Limiters (Multiple Limits)**

```javascript
// Limit 1: Global (tất cả endpoints)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 200, // 200 requests/phút
  message: "Quá nhiều requests, vui lòng chậm lại",
});

// Limit 2: Sensitive endpoints
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // 10 requests/giờ
  message: "Endpoint này có giới hạn nghiêm ngặt",
});

// Apply cả 2
app.use(globalLimiter);
router.delete("/user/:id", sensitiveLimiter, userController.delete);
```

**Cách hoạt động:**

```
Request DELETE /user/123
→ Check globalLimiter (200/phút) → ✅ Pass
→ Check sensitiveLimiter (10/giờ) → ✅ Pass
→ Execute handler
```

---

### **3. Conditional Rate Limiting**

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) => {
    // Skip nếu request từ internal network
    const internalIPs = ["10.0.0.0/8", "192.168.0.0/16"];
    if (isInternalIP(req.ip, internalIPs)) return true;

    // Skip nếu có API key hợp lệ
    if (req.headers["x-api-key"] === process.env.INTERNAL_API_KEY) {
      return true;
    }

    // Skip nếu admin đã authenticated
    if (req.user?.role === "admin") return true;

    return false;
  },
});
```

---

## 🧪 Testing Rate Limits

### **1. Manual Testing (curl)**

```bash
# Test thumbnail rate limit (100 requests/phút)
for i in {1..105}; do
  echo "Request $i"
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://192.168.5.200:8000/api/workmanagement/files/abc123/thumb
  sleep 0.1
done

# Expected output:
# Request 1-100: 200
# Request 101-105: 429
```

---

### **2. Automated Testing (Jest)**

```javascript
describe("Rate Limiting", () => {
  it("should block after 100 thumbnail requests", async () => {
    const fileId = "675abcd123";

    // Gửi 100 requests → OK
    for (let i = 0; i < 100; i++) {
      const res = await request(app).get(
        `/api/workmanagement/files/${fileId}/thumb`
      );
      expect(res.status).toBe(200);
    }

    // Request 101 → 429
    const res = await request(app).get(
      `/api/workmanagement/files/${fileId}/thumb`
    );
    expect(res.status).toBe(429);
    expect(res.body.message).toContain("Quá nhiều yêu cầu");
  });
});
```

---

## 📊 Monitoring & Logging

### **1. Log Rate Limit Events**

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  handler: (req, res, next, options) => {
    // Log blocked request
    console.warn("[RATE LIMIT] Blocked request:", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.userId,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
});
```

---

### **2. Monitor với Prometheus (Optional)**

```javascript
const prometheus = require("prom-client");

const rateLimitCounter = new prometheus.Counter({
  name: "rate_limit_blocks_total",
  help: "Total number of rate-limited requests",
  labelNames: ["endpoint", "ip"],
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  handler: (req, res, next, options) => {
    // Increment counter
    rateLimitCounter.inc({
      endpoint: req.path,
      ip: req.ip,
    });

    res.status(429).json({ message: "Too many requests" });
  },
});
```

---

## 🚨 Security Best Practices

### **1. Combine với CAPTCHA**

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    // Sau 5 lần thất bại, yêu cầu CAPTCHA
    res.status(429).json({
      success: false,
      message: "Quá nhiều lần đăng nhập thất bại",
      requireCaptcha: true, // Frontend hiện CAPTCHA
    });
  },
});
```

---

### **2. IP Whitelist cho Internal Services**

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) => {
    const whitelistedIPs = [
      "10.0.0.0/8", // Internal network
      "192.168.5.200", // Development server
      "127.0.0.1", // Localhost
    ];
    return whitelistedIPs.some((ip) => req.ip.startsWith(ip.split("/")[0]));
  },
});
```

---

### **3. Exponential Backoff**

```javascript
const backoffLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    // Lần đầu: 100 requests/phút
    // Lần 2: 50 requests/phút
    // Lần 3+: 10 requests/phút
    const violations = getViolationCount(req.ip);
    if (violations === 0) return 100;
    if (violations === 1) return 50;
    return 10;
  },
});
```

---

## 📚 Related Resources

- **Official Docs:** https://github.com/express-rate-limit/express-rate-limit
- **Redis Store:** https://github.com/wyattjoh/rate-limit-redis
- **RFC 6585 (Additional HTTP Status Codes):** https://tools.ietf.org/html/rfc6585

---

## ✅ Checklist: Implementing Rate Limiting

- [ ] Identify sensitive endpoints (login, upload, create, public)
- [ ] Choose appropriate limits (max, windowMs) per endpoint
- [ ] Decide on store: MemoryStore (dev) hoặc Redis (production)
- [ ] Configure headers (standardHeaders: true, legacyHeaders: false)
- [ ] Add custom error messages (tiếng Việt)
- [ ] Implement skip logic (admin, whitelist IPs)
- [ ] Add logging/monitoring
- [ ] Test rate limits (manual + automated)
- [ ] Document limits cho frontend team

---

**Last updated:** 2025-12-15
**Author:** AI Assistant
**Status:** ✅ Production Ready
