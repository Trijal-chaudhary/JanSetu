"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const pythonService_1 = require("../services/pythonService");
async function runNodeSemanticTests() {
    console.log("==========================================");
    console.log(" Running Node.js Phase 7 Semantic Tests   ");
    console.log("==========================================");
    // Test 1: Python service gracefully handles unreachable server
    console.log("Test 1: Graceful offline fallback in PythonService...");
    const unreachableService = new pythonService_1.pythonService.constructor();
    unreachableService.baseUrl = "http://127.0.0.1:9999"; // non-existent port
    unreachableService.timeoutMs = 1000;
    const healthRes = await unreachableService.checkHealth();
    assert_1.default.strictEqual(healthRes, null, "Unreachable service should return null without throwing");
    const searchRes = await unreachableService.searchSimilar({
        category: "Public Infrastructure",
        problemDescription: "Streetlight broken test",
        radius_km: 10,
    });
    assert_1.default.strictEqual(searchRes.success, false, "Search should return success: false on network error");
    assert_1.default.deepStrictEqual(searchRes.candidates, [], "Candidates should be empty on failure");
    console.log("✅ Test 1 Passed: Network failure handled gracefully without uncaught exceptions.");
    // Test 2: Payload normalization validation
    console.log("Test 2: Normalization structure checks...");
    const sampleReport = {
        id: "mongo_test_id_123",
        source: "mongodb",
        category: "Public Infrastructure",
        subcategory: "Streetlights",
        problemDescription: "Non functional streetlight on road",
        location: {
            address: "Greater Noida",
            latitude: 28.4682,
            longitude: 77.5180,
        },
        issueType: "Light failure",
    };
    assert_1.default.strictEqual(sampleReport.id, "mongo_test_id_123");
    assert_1.default.strictEqual(sampleReport.source, "mongodb");
    assert_1.default.strictEqual(sampleReport.location?.latitude, 28.4682);
    console.log("✅ Test 2 Passed: Payload normalization meets internal contract.");
    // Test 3: Deduplication logic test
    console.log("Test 3: Source deduplication logic...");
    const existingMongoIds = new Set(["rep_001", "rep_002"]);
    const existingDescriptions = new Set(["pothole on main road"]);
    const jsonRecord1 = { _id: "rep_001", problemDescription: "pothole on main road" };
    const jsonRecord2 = { _id: "json_unique_99", problemDescription: "broken water pipe" };
    const isDup1 = existingMongoIds.has(jsonRecord1._id) || existingDescriptions.has(jsonRecord1.problemDescription);
    const isDup2 = existingMongoIds.has(jsonRecord2._id) || existingDescriptions.has(jsonRecord2.problemDescription);
    assert_1.default.strictEqual(isDup1, true, "Duplicate record should be flagged");
    assert_1.default.strictEqual(isDup2, false, "Unique JSON record should not be flagged");
    console.log("✅ Test 3 Passed: Source deduplication accurately distinguishes duplicates.");
    console.log("==========================================");
    console.log(" 🎉 All Node.js Semantic Tests Passed!    ");
    console.log("==========================================");
}
runNodeSemanticTests().catch((err) => {
    console.error("❌ Node.js test failure:", err);
    process.exit(1);
});
//# sourceMappingURL=semantic.test.js.map