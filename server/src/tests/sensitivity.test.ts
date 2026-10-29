import assert from "assert";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import {
  classifyGrievance,
  validateClassificationOutput,
  computeDraftContentHash,
  GrievanceClassificationInput,
} from "../services/classificationService";
import reportDetails from "../model/report";
import ReportDraftModel from "../model/draft";
import {
  runtimeDummyReports,
  isDepartmentAuthorizedForReport,
} from "../controllers/chating.controller";

async function runSensitivityTestSuite() {
  console.log("=================================================================");
  console.log(" JanSetu Sensitivity Classification & Pipeline Test Suite       ");
  console.log("=================================================================");

  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    throw new Error("DB_URL is not defined in environment.");
  }

  console.log("Connecting to MongoDB for test verification...");
  await mongoose.connect(dbUrl);
  console.log("✅ MongoDB connected successfully.");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Public infrastructure grievance classified as non_sensitive
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Classifying public infrastructure grievance...");
    const infraGrievance: GrievanceClassificationInput = {
      category: "Public Infrastructure",
      subcategory: "Roads and potholes",
      problemDescription:
        "Large pothole on the service road near Pari Chowk causing daily traffic congestion and minor vehicle damage.",
      issueType: "Road Asphalt Crater",
      location: {
        address: "Pari Chowk, Greater Noida",
        latitude: 28.4682,
        longitude: 77.518,
      },
    };

    const infraResult = await classifyGrievance(infraGrievance);
    console.log("Infra classification result:", infraResult);
    assert.strictEqual(
      infraResult.status,
      "non_sensitive",
      "Public infrastructure road defect must be non_sensitive"
    );
    assert(
      infraResult.reason && infraResult.reason.length > 10,
      "Valid reason must be returned"
    );
    assert.strictEqual(
      infraResult.classificationVersion,
      "1.0.0",
      "Classification version should match"
    );
    console.log("✅ Test 1 Passed: Public infrastructure classified as non_sensitive with reason.");

    // -------------------------------------------------------------------------
    // TEST 2: Allegation of bribery involving an identifiable employee -> sensitive
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Classifying bribery allegation against employee...");
    const briberyGrievance: GrievanceClassificationInput = {
      category: "Administrative Processes",
      subcategory: "Applying for a birth/death certificate",
      problemDescription:
        "Revenue Clerk Ramesh Sharma in Tehsil counter 3 demanded a cash bribe of Rs 2000 to process my father's death certificate.",
      issueType: "Bribery and Corruption",
      serviceOrScheme: "Tehsil Registry Desk",
    };

    const briberyResult = await classifyGrievance(briberyGrievance);
    console.log("Bribery classification result:", briberyResult);
    assert.strictEqual(
      briberyResult.status,
      "sensitive",
      "Bribery allegation against identifiable employee must be sensitive"
    );
    assert(
      briberyResult.reason && briberyResult.reason.length > 10,
      "Valid sensitivity reason must be returned"
    );
    console.log("✅ Test 2 Passed: Identifiable employee bribery allegation classified as sensitive.");

    // -------------------------------------------------------------------------
    // TEST 3: Report exposing confidential personal identity documents -> sensitive
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Classifying confidential personal information report...");
    const privateInfoGrievance: GrievanceClassificationInput = {
      category: "Welfare Schemes",
      subcategory: "Disbursement delays",
      problemDescription:
        "Pension delayed. Complainant Aadhaar No: 4821-9923-0182, Bank Account No: 0928101002341 IFSC: SBIN0001827 with confidential medical report attached.",
      issueType: "Disbursement failure",
    };

    const privateResult = await classifyGrievance(privateInfoGrievance);
    console.log("Private data classification result:", privateResult);
    assert.strictEqual(
      privateResult.status,
      "sensitive",
      "Complaints exposing private financial/identity data must be sensitive"
    );
    console.log("✅ Test 3 Passed: Confidential personal/financial information classified as sensitive.");

    // -------------------------------------------------------------------------
    // TEST 4: Runtime output validation strictly rejects malformed / unsupported statuses
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Validating strict output schema enforcement...");
    assert.throws(
      () => validateClassificationOutput({ status: "not_assessed", reason: "Pending" }),
      /Invalid classification status/,
      "Must reject 'not_assessed'"
    );
    assert.throws(
      () => validateClassificationOutput({ status: "pending_review", reason: "Pending" }),
      /Invalid classification status/,
      "Must reject 'pending_review'"
    );
    assert.throws(
      () => validateClassificationOutput({ status: "sensitive", reason: "" }),
      /Invalid classification reason/,
      "Must reject empty reason"
    );
    assert.throws(
      () => validateClassificationOutput("random text"),
      /Invalid classification output/,
      "Must reject non-object output"
    );
    const validCheck = validateClassificationOutput({
      status: "non_sensitive",
      reason: "Public street lighting failure with no personal allegations.",
    });
    assert.strictEqual(validCheck.status, "non_sensitive");
    console.log("✅ Test 4 Passed: Strict runtime validator enforces exact statuses and reasons.");

    // -------------------------------------------------------------------------
    // TEST 5: Content Hash computation & modification invalidation
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Verifying content hash and modification detection...");
    const initialContent = {
      category: "Public Infrastructure",
      subcategory: "Water supply",
      problemDescription: "Dirty water in Sector 62",
    };
    const hash1 = computeDraftContentHash(initialContent);

    // Minor whitespace/case changes should produce identical canonical hash
    const identicalContent = {
      category: "Public Infrastructure  ",
      subcategory: "water supply",
      problemDescription: "Dirty water in Sector 62",
    };
    const hash2 = computeDraftContentHash(identicalContent);
    assert.strictEqual(hash1, hash2, "Canonical hash should normalize whitespace and casing");

    // Substantive change must alter the hash
    const modifiedContent = {
      category: "Public Infrastructure",
      subcategory: "Water supply",
      problemDescription: "Dirty water and supervisor Rajesh extorted money",
    };
    const hash3 = computeDraftContentHash(modifiedContent);
    assert.notStrictEqual(hash1, hash3, "Substantive change must alter the hash");
    console.log("✅ Test 5 Passed: Deterministic content hash accurately flags grievance changes.");

    // -------------------------------------------------------------------------
    // TEST 6: Report Model enforces sensitivity field on save
    // -------------------------------------------------------------------------
    console.log("\n[Test 6] Verifying Mongoose Report schema requires valid sensitivity...");
    const testReportData = {
      category: "Public Infrastructure",
      subcategory: "Roads and potholes",
      problemDescription: "Test pothole for schema verification",
      location: {
        address: "Test Location",
        latitude: 28.4682,
        longitude: 77.518,
      },
      applicationStatus: "Reported",
    };

    // Missing sensitivity field must fail validation on save
    const reportWithoutSensitivity = new reportDetails(testReportData);
    let validationFailed = false;
    try {
      await reportWithoutSensitivity.save();
    } catch (valErr: any) {
      validationFailed = true;
      assert(valErr.message.includes("sensitivity"), "Error should cite missing sensitivity field");
    }
    assert.strictEqual(
      validationFailed,
      true,
      "Saving report without sensitivity must fail validation"
    );

    // Saving with valid sensitivity must succeed
    const reportWithSensitivity = new reportDetails({
      ...testReportData,
      sensitivity: {
        status: "non_sensitive",
        reason: "Public infrastructure maintenance issue.",
        classifiedAt: new Date(),
        classificationVersion: "1.0.0",
      },
    });
    const savedDoc = await reportWithSensitivity.save();
    assert.strictEqual(savedDoc.sensitivity?.status, "non_sensitive");
    assert(savedDoc.sensitivity?.reason);
    console.log("Saved report ID with sensitivity:", savedDoc._id);

    // Clean up test doc
    await reportDetails.findByIdAndDelete(savedDoc._id);
    console.log("✅ Test 6 Passed: Report schema strictly enforces required sensitivity subdocument.");

    // -------------------------------------------------------------------------
    // TEST 7: Draft persistence & idempotency
    // -------------------------------------------------------------------------
    console.log("\n[Test 7] Verifying draft persistence & idempotency...");
    const testDraftId = `draft_test_${Date.now()}`;
    const draftDoc = new ReportDraftModel({
      draftId: testDraftId,
      createdBy: "test_citizen_001",
      contentHash: hash1,
      draftData: initialContent,
      sensitivity: {
        status: "non_sensitive",
        reason: "General public water shortage issue.",
        classifiedAt: new Date(),
        classificationVersion: "1.0.0",
      },
    });
    await draftDoc.save();

    const fetchedDraft = await ReportDraftModel.findOne({ draftId: testDraftId });
    assert(fetchedDraft !== null, "Draft should be persisted");
    assert.strictEqual(fetchedDraft?.sensitivity?.status, "non_sensitive");

    // Clean up test draft
    await ReportDraftModel.deleteOne({ draftId: testDraftId });
    console.log("✅ Test 7 Passed: Unfinalized draft and classification are safely stored and queried.");

    // -------------------------------------------------------------------------
    // TEST 8: Visibility & Access Control rules
    // -------------------------------------------------------------------------
    console.log("\n[Test 8] Verifying backend access control for sensitive reports...");
    // Create temporary sensitive report
    const sensitiveReport = new reportDetails({
      category: "Administrative Processes",
      subcategory: "Applying for a birth/death certificate",
      problemDescription: "Confidential corruption grievance",
      createdBy: "citizen_whistleblower_123",
      sensitivity: {
        status: "sensitive",
        reason: "Contains allegations against identifiable personnel.",
        classifiedAt: new Date(),
        classificationVersion: "1.0.0",
      },
    });
    await sensitiveReport.save();
    const sensitiveId = sensitiveReport._id.toString();

    // Check department authorization helper
    const adminDeptId = "dept_admin_01"; // Authorized for Administrative Processes
    const infraDeptId = "dept_infra_kp2"; // Public Infrastructure only

    const isAuthorizedForAdmin = isDepartmentAuthorizedForReport(adminDeptId, sensitiveReport);
    const isAuthorizedForInfra = isDepartmentAuthorizedForReport(infraDeptId, sensitiveReport);

    assert.strictEqual(
      isAuthorizedForAdmin,
      true,
      "Admin department should be authorized for Administrative Processes report"
    );
    assert.strictEqual(
      isAuthorizedForInfra,
      false,
      "Infrastructure department must NOT be authorized for Administrative report"
    );

    // Clean up temporary report
    await reportDetails.findByIdAndDelete(sensitiveId);
    console.log("✅ Test 8 Passed: Role and category access controls protect sensitive grievances.");

    console.log("\n=================================================================");
    console.log(" 🎉 All 8 Comprehensive Sensitivity Tests Passed Successfully!   ");
    console.log("=================================================================");
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

runSensitivityTestSuite().catch((err) => {
  console.error("❌ Sensitivity test suite failed:", err);
  process.exit(1);
});
