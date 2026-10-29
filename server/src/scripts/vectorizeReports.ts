import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import initialDummyReports from "../data/dummyData.json";
import reportDetails from "../model/report";
import { pythonService, NormalizedReport } from "../services/pythonService";

const BATCH_SIZE = 25;

async function vectorizeHistoricalReports() {
  console.log("==========================================================");
  console.log(" JanSetu Phase 7: Historical Report Vectorization Script ");
  console.log("==========================================================");

  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error("❌ DB_URL is missing from environment variables.");
    process.exit(1);
  }

  // 1. Check Python vector service health
  console.log("🔍 Checking Python Semantic Vector Service health...");
  const health = await pythonService.checkHealth();
  if (!health || !health.chroma_available) {
    console.error(
      "❌ Python Semantic Vector Service is not reachable or ChromaDB is not ready.\n" +
        "   Please ensure the FastAPI service is running: (e.g., uvicorn app.main:app --port 8000)"
    );
    process.exit(1);
  }
  console.log(`✅ Connected to Python Service (Chroma Collection: ${health.total_documents} existing documents).`);

  // 2. Connect to MongoDB
  console.log("📦 Connecting to MongoDB...");
  await mongoose.connect(dbUrl);
  console.log("✅ MongoDB connected successfully.");

  try {
    // 3. Read all MongoDB reports
    const mongoReports = await reportDetails.find({}).lean();
    console.log(`📋 Found ${mongoReports.length} reports in MongoDB database.`);

    // Map existing MongoDB canonical IDs and descriptions for deduplication
    const mongoIds = new Set<string>();
    const mongoDescSet = new Set<string>();

    mongoReports.forEach((r: any) => {
      const idStr = r._id.toString();
      mongoIds.add(idStr);
      if (r.problemDescription) {
        mongoDescSet.add(r.problemDescription.trim().toLowerCase());
      }
    });

    const normalizedBatch: NormalizedReport[] = [];

    // 4. Normalize MongoDB reports (Canonical source of truth)
    for (const r of mongoReports) {
      // Sensitive reports must NEVER be indexed into public semantic search
      if (r.sensitivity && r.sensitivity.status === "sensitive") {
        console.log(`🔒 Skipping sensitive report from public vector indexing: ${r._id}`);
        continue;
      }
      normalizedBatch.push({
        id: (r._id as any).toString(),
        source: "mongodb",
        category: r.category || null,
        subcategory: r.subcategory || null,
        problemDescription: r.problemDescription || null,
        location: r.location || null,
        issueType: r.issueType || null,
        serviceOrScheme: r.serviceOrScheme || null,
        relevantDateOrDuration: r.relevantDateOrDuration || null,
        applicationStatus: r.applicationStatus || "Reported",
        impact: r.impact || null,
        desiredResolution: r.desiredResolution || null,
        affectedPeople: r.affectedPeople || null,
        riskOrUrgency: r.riskOrUrgency || null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      });
    }

    // 5. Normalize JSON dataset records, deduplicating against MongoDB
    let jsonDeduplicatedCount = 0;
    let jsonAddedCount = 0;

    for (const dummy of initialDummyReports as any[]) {
      const dummyId = dummy._id;
      const descLower = (dummy.problemDescription || "").trim().toLowerCase();

      // Deduplication Rule: If already present in MongoDB by ID or exact description, skip JSON duplicate
      if (mongoIds.has(dummyId) || mongoDescSet.has(descLower)) {
        jsonDeduplicatedCount++;
        continue;
      }

      normalizedBatch.push({
        id: dummyId,
        source: "json_dataset",
        category: dummy.category || null,
        subcategory: dummy.subcategory || null,
        problemDescription: dummy.problemDescription || null,
        location: dummy.location || null,
        issueType: dummy.issueType || null,
        serviceOrScheme: dummy.serviceOrScheme || null,
        relevantDateOrDuration: dummy.relevantDateOrDuration || null,
        applicationStatus: dummy.applicationStatus || "Reported",
        impact: dummy.impact || null,
        desiredResolution: dummy.desiredResolution || null,
        affectedPeople: dummy.affectedPeople || null,
        riskOrUrgency: dummy.riskOrUrgency || null,
        createdAt: dummy.createdAt || null,
        updatedAt: dummy.updatedAt || null,
      });
      jsonAddedCount++;
    }

    console.log(`📊 Total records prepared for vectorization: ${normalizedBatch.length}`);
    console.log(`   - MongoDB canonical records: ${mongoReports.length}`);
    console.log(`   - JSON dataset records included: ${jsonAddedCount}`);
    console.log(`   - JSON duplicate records skipped: ${jsonDeduplicatedCount}`);

    // 6. Batch indexing into ChromaDB via FastAPI
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const indexedMongoIds: string[] = [];

    for (let i = 0; i < normalizedBatch.length; i += BATCH_SIZE) {
      const chunk = normalizedBatch.slice(i, i + BATCH_SIZE);
      console.log(`🚀 Indexing batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} records)...`);

      const res = await pythonService.indexReports(chunk);
      totalProcessed += res.processed;
      totalInserted += res.inserted;
      totalUpdated += res.updated;
      totalSkipped += res.skipped;
      totalFailed += res.failed;

      if (res.errors && res.errors.length > 0) {
        console.warn(`   ⚠️ Batch warnings/errors:`, res.errors);
      }

      // Track successful MongoDB items for status update
      if (res.success) {
        chunk.forEach((item) => {
          if (item.source === "mongodb") {
            indexedMongoIds.push(item.id);
          }
        });
      }
    }

    // 7. Update MongoDB indexing status for indexed reports
    if (indexedMongoIds.length > 0) {
      await reportDetails.updateMany(
        { _id: { $in: indexedMongoIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        {
          $set: {
            indexingStatus: "indexed",
            indexingError: null,
            lastIndexedAt: new Date(),
          },
        }
      );
      console.log(`📝 Updated indexing status in MongoDB for ${indexedMongoIds.length} reports.`);
    }

    console.log("\n==========================================================");
    console.log(" 🎉 Historical Vectorization Summary:");
    console.log(`    Total Processed : ${totalProcessed}`);
    console.log(`    Newly Inserted  : ${totalInserted}`);
    console.log(`    Updated/Refreshed: ${totalUpdated}`);
    console.log(`    Skipped         : ${totalSkipped}`);
    console.log(`    Failed          : ${totalFailed}`);
    console.log("==========================================================");
  } catch (err) {
    console.error("❌ Historical vectorization failed with error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB. Process completed.");
    process.exit(0);
  }
}

vectorizeHistoricalReports();
