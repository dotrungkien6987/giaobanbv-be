/**
 * Quick Test Script for Notification APIs
 *
 * Usage:
 * 1. Start server: npm start
 * 2. Get JWT token from login
 * 3. Update TOKEN variable below
 * 4. Run: node test-notification-api.js
 */

const axios = require("axios");

const BASE_URL = "http://localhost:8020/api/workmanagement/notifications";
const TOKEN = "YOUR_JWT_TOKEN_HERE"; // Update this after login

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, success, message) {
  const status = success ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} - ${name}`);
  if (message) console.log(`   ${message}`);

  results.tests.push({ name, success, message });
  if (success) results.passed++;
  else results.failed++;
}

async function test1_getAllTypes() {
  try {
    const response = await api.get("/types");
    const { success, data } = response.data;

    if (success && data.types && Array.isArray(data.types)) {
      logTest("GET /types", true, `Found ${data.total} types`);
      return data.types[0]; // Return first type for next tests
    } else {
      logTest("GET /types", false, "Invalid response structure");
      return null;
    }
  } catch (error) {
    logTest("GET /types", false, error.message);
    return null;
  }
}

async function test2_getTypeByCode() {
  try {
    const response = await api.get("/types/code/yeucau-tao-moi");
    const { success, data } = response.data;

    if (success && data.type) {
      logTest("GET /types/code/:code", true, `Found type: ${data.type.name}`);
      return data.type;
    } else {
      logTest("GET /types/code/:code", false, "Type not found");
      return null;
    }
  } catch (error) {
    logTest("GET /types/code/:code", false, error.message);
    return null;
  }
}

async function test3_getAllTemplates() {
  try {
    const response = await api.get("/templates");
    const { success, data } = response.data;

    if (success && data.templates && Array.isArray(data.templates)) {
      logTest("GET /templates", true, `Found ${data.total} templates`);
      return data.templates[0]; // Return first template for next tests
    } else {
      logTest("GET /templates", false, "Invalid response structure");
      return null;
    }
  } catch (error) {
    logTest("GET /templates", false, error.message);
    return null;
  }
}

async function test4_getTemplatesByType() {
  try {
    const response = await api.get("/templates?typeCode=yeucau-tao-moi");
    const { success, data } = response.data;

    if (success && data.templates) {
      logTest(
        "GET /templates?typeCode=...",
        true,
        `Found ${data.templates.length} templates for yeucau-tao-moi`
      );
      return data.templates[0];
    } else {
      logTest("GET /templates?typeCode=...", false, "No templates found");
      return null;
    }
  } catch (error) {
    logTest("GET /templates?typeCode=...", false, error.message);
    return null;
  }
}

async function test5_previewTemplate(templateId) {
  if (!templateId) {
    logTest("POST /templates/:id/preview", false, "No template ID provided");
    return;
  }

  try {
    const sampleData = {
      data: {
        MaYeuCau: "YC-TEST-001",
        TieuDe: "Test notification preview",
        TenKhoaGui: "Khoa Nội",
        TenKhoaNhan: "Khoa Ngoại",
        _id: "64f3cb6035c717ab00d75b8b",
      },
    };

    const response = await api.post(
      `/templates/${templateId}/preview`,
      sampleData
    );
    const { success, data } = response.data;

    if (success && data.preview) {
      logTest(
        "POST /templates/:id/preview",
        true,
        `Preview: "${data.preview.title}"`
      );
      console.log("   Preview Body:", data.preview.body);
      console.log("   Extracted Variables:", data.extractedVars.join(", "));
    } else {
      logTest("POST /templates/:id/preview", false, "Preview failed");
    }
  } catch (error) {
    logTest("POST /templates/:id/preview", false, error.message);
  }
}

async function test6_createType() {
  try {
    const newType = {
      code: `test-type-${Date.now()}`,
      name: "Test Notification Type",
      description: "Created by test script",
      variables: [
        {
          name: "TestVariable",
          type: "String",
          description: "Test variable",
        },
      ],
      isActive: true,
    };

    const response = await api.post("/types", newType);
    const { success, data } = response.data;

    if (success && data.type) {
      logTest("POST /types (Create)", true, `Created type: ${data.type.code}`);
      return data.type;
    } else {
      logTest("POST /types (Create)", false, "Failed to create type");
      return null;
    }
  } catch (error) {
    logTest(
      "POST /types (Create)",
      false,
      error.response?.data?.errors?.message || error.message
    );
    return null;
  }
}

async function test7_updateType(typeId) {
  if (!typeId) {
    logTest("PUT /types/:id (Update)", false, "No type ID provided");
    return;
  }

  try {
    const updates = {
      name: "Updated Test Type Name",
      description: "Updated by test script",
    };

    const response = await api.put(`/types/${typeId}`, updates);
    const { success, data } = response.data;

    if (success && data.type) {
      logTest(
        "PUT /types/:id (Update)",
        true,
        `Updated type: ${data.type.name}`
      );
    } else {
      logTest("PUT /types/:id (Update)", false, "Failed to update type");
    }
  } catch (error) {
    logTest("PUT /types/:id (Update)", false, error.message);
  }
}

async function test8_deleteType(typeId) {
  if (!typeId) {
    logTest("DELETE /types/:id", false, "No type ID provided");
    return;
  }

  try {
    const response = await api.delete(`/types/${typeId}`);
    const { success } = response.data;

    if (success) {
      logTest("DELETE /types/:id", true, "Type deleted (soft delete)");
    } else {
      logTest("DELETE /types/:id", false, "Failed to delete type");
    }
  } catch (error) {
    logTest(
      "DELETE /types/:id",
      false,
      error.response?.data?.errors?.message || error.message
    );
  }
}

async function test9_clearCache() {
  try {
    const response = await api.post("/clear-cache");
    const { success } = response.data;

    if (success) {
      logTest("POST /clear-cache", true, "Cache cleared successfully");
    } else {
      logTest("POST /clear-cache", false, "Failed to clear cache");
    }
  } catch (error) {
    logTest("POST /clear-cache", false, error.message);
  }
}

async function runAllTests() {
  console.log("\n🚀 Starting Notification API Tests...\n");
  console.log("═══════════════════════════════════════════════════════\n");

  // Test 1: Get all types
  console.log("📋 Testing Notification Types...\n");
  const firstType = await test1_getAllTypes();

  // Test 2: Get type by code
  const typeByCode = await test2_getTypeByCode();

  // Test 3: Get all templates
  console.log("\n📧 Testing Notification Templates...\n");
  const firstTemplate = await test3_getAllTemplates();

  // Test 4: Get templates by type
  const templateByType = await test4_getTemplatesByType();

  // Test 5: Preview template
  if (firstTemplate) {
    console.log("\n👀 Testing Template Preview...\n");
    await test5_previewTemplate(firstTemplate._id);
  }

  // Test 6-8: CRUD operations
  console.log("\n✏️ Testing CRUD Operations...\n");
  const createdType = await test6_createType();

  if (createdType) {
    await test7_updateType(createdType._id);
    await test8_deleteType(createdType._id);
  }

  // Test 9: Clear cache
  console.log("\n🧹 Testing Cache Management...\n");
  await test9_clearCache();

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("📊 TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.tests.length}`);
  console.log("═══════════════════════════════════════════════════════\n");

  if (results.failed > 0) {
    console.log("❌ Some tests failed. Check details above.\n");
    process.exit(1);
  } else {
    console.log("✅ All tests passed!\n");
    process.exit(0);
  }
}

// Check if token is set
if (TOKEN === "YOUR_JWT_TOKEN_HERE") {
  console.error("\n❌ ERROR: Please update TOKEN variable in test script");
  console.error("   1. Login to get JWT token");
  console.error("   2. Update TOKEN constant at top of file");
  console.error("   3. Run script again\n");
  process.exit(1);
}

// Run tests
runAllTests().catch((error) => {
  console.error("\n❌ Test execution failed:", error.message);
  process.exit(1);
});
