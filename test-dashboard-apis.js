/**
 * Test script for Dashboard APIs
 * Run: node test-dashboard-apis.js
 *
 * Tests all 6 new dashboard endpoints:
 * 1. GET /api/workmanagement/congviec/dashboard/:nhanVienId
 * 2. GET /api/workmanagement/congviec/summary/:nhanVienId
 * 3. GET /api/workmanagement/yeucau/summary/:nhanVienId
 * 4. GET /api/workmanagement/kpi/personal/:nhanVienId
 * 5. GET /api/workmanagement/kpi/summary/:nhanVienId
 */

require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");

// Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8020";
const API_BASE = `${BASE_URL}/api/workmanagement`;

// ANSI colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(
      `\n${colors.cyan}${"=".repeat(60)}${colors.reset}\n${colors.cyan}${msg}${
        colors.reset
      }\n${colors.cyan}${"=".repeat(60)}${colors.reset}`
    ),
  data: (obj) =>
    console.log(`${colors.gray}${JSON.stringify(obj, null, 2)}${colors.reset}`),
};

// Test user credentials (update these with actual test account)
const TEST_USER = {
  UserName: process.env.TEST_USERNAME || "admin", // Change to actual test user
  PassWord: process.env.TEST_PASSWORD || "123456", // Change to actual test password
};

let authToken = null;
let testNhanVienId = null;
let testUserId = null;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    };

    if (data) {
      if (method === "GET") {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Step 1: Connect to database to get test data
async function connectDatabase() {
  try {
    log.section("STEP 1: Kết nối Database");

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    log.success("Kết nối MongoDB thành công");
    log.info(`Database: ${process.env.MONGODB_URI}`);

    return true;
  } catch (error) {
    log.error(`Lỗi kết nối database: ${error.message}`);
    return false;
  }
}

// Step 2: Get test user data
async function getTestUserData() {
  try {
    log.section("STEP 2: Lấy dữ liệu test user");

    const User = require("./models/User");
    const user = await User.findOne({ UserName: TEST_USER.UserName })
      .populate("KhoaID", "TenKhoa")
      .lean();

    if (!user) {
      log.error(`Không tìm thấy user: ${TEST_USER.UserName}`);
      log.warn("Hãy cập nhật TEST_USER trong script với tài khoản thực tế");
      return false;
    }

    testUserId = user._id.toString();
    testNhanVienId = user.NhanVienID?.toString();

    if (!testNhanVienId) {
      log.error("User không có NhanVienID!");
      return false;
    }

    log.success(`User ID: ${testUserId}`);
    log.success(`NhanVien ID: ${testNhanVienId}`);
    log.info(`Họ tên: ${user.HoTen}`);
    log.info(`Khoa: ${user.KhoaID?.TenKhoa || "N/A"}`);

    return true;
  } catch (error) {
    log.error(`Lỗi lấy user data: ${error.message}`);
    return false;
  }
}

// Step 3: Login to get JWT token
async function login() {
  try {
    log.section("STEP 3: Đăng nhập để lấy JWT token");

    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      UserName: TEST_USER.UserName,
      PassWord: TEST_USER.PassWord,
    });

    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      log.success("Đăng nhập thành công");
      log.info(`Token: ${authToken.substring(0, 30)}...`);
      return true;
    } else {
      log.error("Login không trả về token");
      return false;
    }
  } catch (error) {
    log.error(
      `Lỗi đăng nhập: ${error.response?.data?.message || error.message}`
    );
    log.warn("Kiểm tra lại TEST_USER credentials trong script");
    return false;
  }
}

// Step 4: Test Công Việc Dashboard
async function testCongViecDashboard() {
  log.section("STEP 4: Test Công Việc Dashboard APIs");

  // Test 1: Get full dashboard
  log.info("Test 1: GET /congviec/dashboard/:nhanVienId");
  const result1 = await apiCall("GET", `/congviec/dashboard/${testNhanVienId}`);

  if (result1.success) {
    log.success("API hoạt động tốt");
    const { received, assigned, byStatus, byDeadline } = result1.data.data;
    console.log(`  - Received: ${received.total} (urgent: ${received.urgent})`);
    console.log(`  - Assigned: ${assigned.total} (urgent: ${assigned.urgent})`);
    console.log(`  - By Status:`, byStatus);
    console.log(`  - By Deadline:`, byDeadline);
  } else {
    log.error(`API thất bại: ${result1.error.message || result1.error}`);
    log.data(result1.error);
  }

  // Test 2: Get summary
  log.info("\nTest 2: GET /congviec/summary/:nhanVienId");
  const result2 = await apiCall("GET", `/congviec/summary/${testNhanVienId}`);

  if (result2.success) {
    log.success("API hoạt động tốt");
    console.log(`  - Total: ${result2.data.data.total}`);
    console.log(`  - Urgent: ${result2.data.data.urgent}`);
  } else {
    log.error(`API thất bại: ${result2.error.message || result2.error}`);
  }
}

// Step 5: Test Yêu Cầu Summary
async function testYeuCauSummary() {
  log.section("STEP 5: Test Yêu Cầu Summary API");

  log.info("Test: GET /yeucau/summary/:nhanVienId");
  const result = await apiCall("GET", `/yeucau/summary/${testNhanVienId}`);

  if (result.success) {
    log.success("API hoạt động tốt");
    const { sent, needAction, inProgress, completed } = result.data.data;
    console.log(`  - Sent: ${sent}`);
    console.log(`  - Need Action: ${needAction}`);
    console.log(`  - In Progress: ${inProgress}`);
    console.log(`  - Completed: ${completed}`);
  } else {
    log.error(`API thất bại: ${result.error.message || result.error}`);
    log.data(result.error);
  }
}

// Step 6: Test KPI Dashboard
async function testKPIDashboard() {
  log.section("STEP 6: Test KPI Dashboard APIs");

  // Test 1: Personal dashboard
  log.info("Test 1: GET /kpi/personal/:nhanVienId");
  const result1 = await apiCall("GET", `/kpi/personal/${testNhanVienId}`);

  if (result1.success) {
    log.success("API hoạt động tốt");
    const { danhGiaKPI, chuKy, summary } = result1.data.data;
    console.log(`  - Chu kỳ: ${chuKy?.TenChuKy || "N/A"}`);
    console.log(`  - Tổng điểm KPI: ${summary.TongDiemKPI || "Chưa có"}`);
    console.log(`  - Trạng thái: ${summary.TrangThai}`);
    console.log(
      `  - Nhiệm vụ: ${summary.scoredNhiemVu}/${summary.totalNhiemVu} (${summary.progressPercentage}%)`
    );

    if (!danhGiaKPI) {
      log.warn("Chưa có đánh giá KPI trong chu kỳ hiện tại");
    }
  } else {
    log.error(`API thất bại: ${result1.error.message || result1.error}`);
    log.data(result1.error);
  }

  // Test 2: KPI summary
  log.info("\nTest 2: GET /kpi/summary/:nhanVienId");
  const result2 = await apiCall("GET", `/kpi/summary/${testNhanVienId}`);

  if (result2.success) {
    log.success("API hoạt động tốt");
    const { score, status, cycleName, isDone, hasEvaluation } =
      result2.data.data;
    console.log(`  - Điểm: ${score || "Chưa có"}`);
    console.log(`  - Trạng thái: ${status}`);
    console.log(`  - Chu kỳ: ${cycleName || "N/A"}`);
    console.log(`  - Đã đóng: ${isDone ? "Có" : "Không"}`);
    console.log(`  - Có đánh giá: ${hasEvaluation ? "Có" : "Không"}`);
  } else {
    log.error(`API thất bại: ${result2.error.message || result2.error}`);
  }
}

// Step 7: Performance check
async function checkPerformance() {
  log.section("STEP 7: Kiểm tra Performance");

  const endpoints = [
    {
      name: "Công Việc Dashboard",
      url: `/congviec/dashboard/${testNhanVienId}`,
    },
    { name: "Công Việc Summary", url: `/congviec/summary/${testNhanVienId}` },
    { name: "Yêu Cầu Summary", url: `/yeucau/summary/${testNhanVienId}` },
    { name: "KPI Personal", url: `/kpi/personal/${testNhanVienId}` },
    { name: "KPI Summary", url: `/kpi/summary/${testNhanVienId}` },
  ];

  for (const endpoint of endpoints) {
    const start = Date.now();
    await apiCall("GET", endpoint.url);
    const duration = Date.now() - start;

    if (duration < 300) {
      log.success(`${endpoint.name}: ${duration}ms ✓`);
    } else if (duration < 500) {
      log.warn(`${endpoint.name}: ${duration}ms (acceptable)`);
    } else {
      log.error(`${endpoint.name}: ${duration}ms (too slow!)`);
    }
  }
}

// Main test runner
async function runTests() {
  console.clear();
  log.section("🧪 DASHBOARD APIs TEST SUITE");
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Test User: ${TEST_USER.UserName}`);

  try {
    // Step 1: Connect database
    if (!(await connectDatabase())) {
      log.error("Không thể kết nối database. Dừng test.");
      process.exit(1);
    }

    // Step 2: Get test user
    if (!(await getTestUserData())) {
      log.error("Không thể lấy dữ liệu test user. Dừng test.");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Step 3: Login
    if (!(await login())) {
      log.error("Không thể đăng nhập. Dừng test.");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Step 4-6: Run API tests
    await testCongViecDashboard();
    await testYeuCauSummary();
    await testKPIDashboard();

    // Step 7: Performance check
    await checkPerformance();

    // Summary
    log.section("📊 SUMMARY");
    log.success("Tất cả các API đã được kiểm tra");
    log.info("Kiểm tra kết quả ở trên để xem chi tiết");
  } catch (error) {
    log.error(`Lỗi không xác định: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info("\nĐã ngắt kết nối database");
    process.exit(0);
  }
}

// Run tests
runTests();
