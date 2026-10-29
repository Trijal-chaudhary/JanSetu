"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pythonService_1 = require("../services/pythonService");
async function runLiveIntegrationTest() {
    console.log("=================================================");
    console.log(" Node.js <-> FastAPI Live Integration Test       ");
    console.log("=================================================");
    // 1. Health check
    console.log("Step 1: Pinging Python FastAPI Health Endpoint...");
    const health = await pythonService_1.pythonService.checkHealth();
    (0, assert_1.default)(health !== null, "Python service health check returned null");
    assert_1.default.strictEqual(health.chroma_available, true, "ChromaDB should be available");
    console.log(`✅ Step 1: Health check passed. Total indexed documents in Chroma: ${health.total_documents}`);
    // 2. Index a test infrastructure report
    const testId = "integration_test_streetlamp_kp2";
    const testReport = {
        id: testId,
        source: "mongodb",
        category: "Public Infrastructure",
        subcategory: "Streetlights",
        issueType: "Broken streetlight fixture",
        problemDescription: "Main road street light fixture broken and dark at night near knowledge park metro",
        location: {
            address: "Knowledge Park II, Greater Noida",
            latitude: 28.4682,
            longitude: 77.5180,
        },
        applicationStatus: "Reported",
    };
    console.log("Step 2: Indexing test report into ChromaDB via FastAPI...");
    const indexRes = await pythonService_1.pythonService.indexReports([testReport]);
    assert_1.default.strictEqual(indexRes.success, true, "Indexing should succeed");
    console.log(`✅ Step 2: Indexing succeeded (Inserted: ${indexRes.inserted}, Updated: ${indexRes.updated}).`);
    // 3. Search for semantically similar issue nearby
    console.log("Step 3: Performing location-aware semantic search nearby...");
    const searchRes = await pythonService_1.pythonService.searchSimilar({
        category: "Public Infrastructure",
        subcategory: "Streetlights",
        problemDescription: "The street light is completely out and not working at knowledge park metro station gate",
        location: {
            latitude: 28.4685,
            longitude: 77.5182,
        },
        radius_km: 10,
        threshold: 0.40,
    });
    assert_1.default.strictEqual(searchRes.success, true, "Semantic search should succeed");
    (0, assert_1.default)(searchRes.candidates.length > 0, "Should find at least 1 candidate match");
    const topMatch = searchRes.candidates[0];
    console.log(`   Top Candidate ID: ${topMatch.report_id}`);
    console.log(`   Similarity Score: ${topMatch.similarity_score}`);
    console.log(`   Combined Score  : ${topMatch.combined_score}`);
    console.log(`   Distance (km)   : ${topMatch.distance_km}`);
    (0, assert_1.default)(typeof topMatch.distance_km === "number" && topMatch.distance_km < 1.0, "Distance should be under 1 km");
    (0, assert_1.default)(topMatch.combined_score >= 0.40, "Combined score should meet threshold");
    console.log("✅ Step 3: Location-aware semantic match verified successfully.");
    // 4. Distant search rejection test (> 10 km)
    console.log("Step 4: Testing geographic radius filtering for distant query (~25 km away)...");
    const distantRes = await pythonService_1.pythonService.searchSimilar({
        category: "Public Infrastructure",
        subcategory: "Streetlights",
        problemDescription: "The street light is completely out and not working",
        location: {
            latitude: 28.6250, // Sector 62 Noida (~22 km from Knowledge Park)
            longitude: 77.3730,
        },
        radius_km: 10,
        threshold: 0.40,
    });
    const distantMatchFound = distantRes.candidates.some((c) => c.report_id === testId);
    assert_1.default.strictEqual(distantMatchFound, false, "Candidate beyond 10 km must be rejected by geographic filtering");
    console.log("✅ Step 4: Distant report was properly filtered out by geographic radius.");
    // 5. Clean up test record
    console.log("Step 5: Cleaning up test vector record...");
    const removeOk = await pythonService_1.pythonService.removeReport(testId);
    assert_1.default.strictEqual(removeOk, true, "Removal should succeed");
    console.log("✅ Step 5: Test vector cleaned up successfully.");
    console.log("=================================================");
    console.log(" 🎉 All Live Integration Tests Succeeded!        ");
    console.log("=================================================");
}
runLiveIntegrationTest().catch((err) => {
    console.error("❌ Integration test failed:", err);
    process.exit(1);
});
//# sourceMappingURL=integration.test.js.map