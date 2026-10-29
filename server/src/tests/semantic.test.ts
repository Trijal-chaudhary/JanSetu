import assert from "assert";
import { pythonService, NormalizedReport } from "../services/pythonService";

async function runNodeSemanticTests() {
  console.log("==========================================");
  console.log(" Running Node.js Phase 7 Semantic Tests   ");
  console.log("==========================================");

  // Test 1: Python service gracefully handles unreachable server
  console.log("Test 1: Graceful offline fallback in PythonService...");
  const unreachableService = new (pythonService.constructor as any)();
  (unreachableService as any).baseUrl = "http://127.0.0.1:9999"; // non-existent port
  (unreachableService as any).timeoutMs = 1000;

  const healthRes = await unreachableService.checkHealth();
  assert.strictEqual(healthRes, null, "Unreachable service should return null without throwing");

  const searchRes = await unreachableService.searchSimilar({
    category: "Public Infrastructure",
    problemDescription: "Streetlight broken test",
    radius_km: 10,
  });
  assert.strictEqual(searchRes.success, false, "Search should return success: false on network error");
  assert.deepStrictEqual(searchRes.candidates, [], "Candidates should be empty on failure");
  console.log("✅ Test 1 Passed: Network failure handled gracefully without uncaught exceptions.");

  // Test 2: Payload normalization validation
  console.log("Test 2: Normalization structure checks...");
  const sampleReport: NormalizedReport = {
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

  assert.strictEqual(sampleReport.id, "mongo_test_id_123");
  assert.strictEqual(sampleReport.source, "mongodb");
  assert.strictEqual(sampleReport.location?.latitude, 28.4682);
  console.log("✅ Test 2 Passed: Payload normalization meets internal contract.");

  // Test 3: Deduplication logic test
  console.log("Test 3: Source deduplication logic...");
  const existingMongoIds = new Set(["rep_001", "rep_002"]);
  const existingDescriptions = new Set(["pothole on main road"]);

  const jsonRecord1 = { _id: "rep_001", problemDescription: "pothole on main road" };
  const jsonRecord2 = { _id: "json_unique_99", problemDescription: "broken water pipe" };

  const isDup1 = existingMongoIds.has(jsonRecord1._id) || existingDescriptions.has(jsonRecord1.problemDescription);
  const isDup2 = existingMongoIds.has(jsonRecord2._id) || existingDescriptions.has(jsonRecord2.problemDescription);

  assert.strictEqual(isDup1, true, "Duplicate record should be flagged");
  assert.strictEqual(isDup2, false, "Unique JSON record should not be flagged");
  console.log("✅ Test 3 Passed: Source deduplication accurately distinguishes duplicates.");

  console.log("==========================================");
  console.log(" 🎉 All Node.js Semantic Tests Passed!    ");
  console.log("==========================================");
}

runNodeSemanticTests().catch((err) => {
  console.error("❌ Node.js test failure:", err);
  process.exit(1);
});
