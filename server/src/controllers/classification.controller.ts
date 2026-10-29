import { Request, Response } from "express";
import ReportDraftModel, { IDraftDocument } from "../model/draft";
import reportDetails from "../model/report";
import {
  classifyGrievance,
  computeDraftContentHash,
  GrievanceClassificationInput,
} from "../services/classificationService";
import { pythonService } from "../services/pythonService";
import { normalizeReportDraftToEnglish, runtimeDummyReports } from "./chating.controller";

/**
 * Helper to hydrate and filter candidates for duplicate detection.
 * Strictly excludes any sensitive reports from duplicate candidates.
 */
async function hydrateAndFilterCandidates(candidates: any[], currentUserId?: string) {
  const eligibleCandidates: any[] = [];

  for (const cand of candidates) {
    let report: any = null;
    const repId = String(cand.report_id || "");

    // 1. Authoritative check in MongoDB
    if (repId.match(/^[0-9a-fA-F]{24}$/)) {
      const doc = await reportDetails.findById(repId).lean();
      if (doc) report = doc;
    }

    // 2. Check runtime dummy reports
    if (!report) {
      const dummy = runtimeDummyReports.find((r: any) => r._id === repId);
      if (dummy) report = dummy;
    }

    if (!report) continue;

    // Security check: sensitive reports must NEVER be surfaced as duplicate candidates
    if (report.sensitivity && report.sensitivity.status === "sensitive") {
      continue;
    }

    // Eligibility check: Resolved, Closed, or Rejected grievances cannot receive community support
    const status = report.applicationStatus || "Reported";
    if (status === "Resolved" || status === "Rejected" || status === "Closed") {
      continue;
    }

    const supportedByList: string[] = Array.isArray(report.supportedBy) ? report.supportedBy : [];
    const isSupported = currentUserId ? supportedByList.includes(currentUserId) : false;

    eligibleCandidates.push({
      _id: (report._id || report.id).toString(),
      category: report.category,
      subcategory: report.subcategory,
      issueType: report.issueType,
      problemDescription: report.problemDescription,
      location: report.location,
      applicationStatus: report.applicationStatus,
      supportCount: supportedByList.length,
      isSupported,
      distanceKm: cand.distance_km ?? null,
      similarityScore: cand.similarity_score,
      combinedScore: cand.combined_score,
      source: cand.source,
      evidence: report.evidence || [],
    });
  }

  return eligibleCandidates;
}

/**
 * Creates or updates an unfinalized grievance draft.
 * Automatically computes content hash and invalidates stale classifications if fields changed.
 */
export const saveOrUpdateDraft = async (req: Request, res: Response) => {
  try {
    const sessionUserId =
      (req.session as any)?.userId ||
      req.body.userId ||
      req.body.createdBy ||
      "citizen_anonymous";

    const { draftId, draft } = req.body;

    if (!draft || typeof draft !== "object") {
      return res.status(400).json({
        success: false,
        message: "Valid draft payload is required.",
      });
    }

    // Sanitize any "notrequired" strings into null
    const sanitizedDraft: any = {};
    for (const [key, value] of Object.entries(draft)) {
      if (typeof value === "string" && value.trim().toLowerCase() === "notrequired") {
        sanitizedDraft[key] = null;
      } else {
        sanitizedDraft[key] = value;
      }
    }

    const currentHash = computeDraftContentHash(sanitizedDraft);

    let draftDoc: IDraftDocument | null = null;
    if (draftId && typeof draftId === "string") {
      draftDoc = await ReportDraftModel.findOne({ draftId });
    }

    if (draftDoc) {
      // Content modification detection: if relevant content changed, invalidate previous sensitivity classification
      if (draftDoc.contentHash !== currentHash) {
        draftDoc.sensitivity = null;
      }
      draftDoc.contentHash = currentHash;
      draftDoc.draftData = sanitizedDraft;
      draftDoc.updatedAt = new Date();
      await draftDoc.save();

      return res.status(200).json({
        success: true,
        draftId: draftDoc.draftId,
        contentHash: draftDoc.contentHash,
        sensitivity: draftDoc.sensitivity || null,
        draft: draftDoc.draftData,
      });
    }

    // Create fresh draft (reuse client draftId if valid, otherwise generate new)
    const newDraftId =
      draftId && typeof draftId === "string" && draftId.startsWith("draft_")
        ? draftId
        : `draft_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newDraft = new ReportDraftModel({
      draftId: newDraftId,
      createdBy: sessionUserId,
      contentHash: currentHash,
      draftData: sanitizedDraft,
      sensitivity: null,
      finalizedReportId: null,
    });

    await newDraft.save();

    return res.status(201).json({
      success: true,
      draftId: newDraft.draftId,
      contentHash: newDraft.contentHash,
      sensitivity: null,
      draft: newDraft.draftData,
    });
  } catch (error: any) {
    console.error("saveOrUpdateDraft error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save draft.",
    });
  }
};

/**
 * Retrieves a draft by draftId.
 */
export const getDraft = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    if (!draftId) {
      return res.status(400).json({ success: false, message: "Draft ID is required." });
    }

    const draft = await ReportDraftModel.findOne({ draftId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "Draft not found." });
    }

    return res.status(200).json({
      success: true,
      draftId: draft.draftId,
      createdBy: draft.createdBy,
      contentHash: draft.contentHash,
      sensitivity: draft.sensitivity || null,
      finalizedReportId: draft.finalizedReportId || null,
      draft: draft.draftData,
    });
  } catch (error: any) {
    console.error("getDraft error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch draft.",
    });
  }
};

/**
 * Invokes Groq to classify a draft's sensitivity.
 * Reusable backend service for both AI Mode and Manual Mode.
 */
export const classifyDraft = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const forceReclassify = Boolean(req.body.forceReclassify);

    if (!draftId) {
      return res.status(400).json({ success: false, message: "Draft ID is required." });
    }

    const draft = await ReportDraftModel.findOne({ draftId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "Draft not found." });
    }

    // Verify current content hash matches the draft data
    const currentHash = computeDraftContentHash(draft.draftData);
    if (draft.contentHash !== currentHash) {
      draft.contentHash = currentHash;
      draft.sensitivity = null;
    }

    // Return existing valid classification if content has not changed and not forcing reclassification
    if (draft.sensitivity && !forceReclassify && draft.contentHash === currentHash) {
      return res.status(200).json({
        success: true,
        draftId: draft.draftId,
        sensitivity: draft.sensitivity,
        cached: true,
      });
    }

    // Invoke shared Groq classification service
    const classification = await classifyGrievance(draft.draftData as GrievanceClassificationInput);

    // Persist authoritative classification in draft
    draft.sensitivity = classification;
    draft.updatedAt = new Date();
    await draft.save();

    return res.status(200).json({
      success: true,
      draftId: draft.draftId,
      sensitivity: draft.sensitivity,
      cached: false,
    });
  } catch (error: any) {
    console.error("classifyDraft error:", error);
    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "Groq sensitivity classification failed. Draft is preserved; please retry.",
    });
  }
};

/**
 * Checks for similar existing reports for a saved draft.
 * Respects privacy and eligibility:
 * - Sensitive drafts skip semantic clustering ("Public similarity checking is skipped to protect the privacy of this grievance.")
 * - Non-Public Infrastructure drafts skip semantic clustering ("Similarity checking is not applicable for this category.")
 * - Eligible drafts query Python ChromaDB service and return hydrated, non-sensitive candidates.
 */
export const checkDraftSimilar = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const sessionUserId = (req.session as any)?.userId;

    if (!draftId) {
      return res.status(400).json({ success: false, message: "Draft ID is required." });
    }

    const draft = await ReportDraftModel.findOne({ draftId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "Draft not found." });
    }

    const draftData = draft.draftData || {};
    const sensitivity = draft.sensitivity;

    // 1. Check if draft is classified as sensitive
    if (sensitivity && sensitivity.status === "sensitive") {
      return res.status(200).json({
        success: true,
        isSensitive: true,
        similarFound: false,
        candidates: [],
        message: "Public similarity checking is skipped to protect the privacy of this grievance.",
      });
    }

    // 2. Check category eligibility (only Public Infrastructure is eligible for semantic clustering)
    if (draftData.category !== "Public Infrastructure") {
      return res.status(200).json({
        success: true,
        ineligibleCategory: true,
        category: draftData.category || "Unspecified",
        similarFound: false,
        candidates: [],
        message: "Similarity checking is not applicable for this category.",
      });
    }

    // 3. Check if semantic search is disabled via env
    if (process.env.SEMANTIC_SEARCH_ENABLED === "false") {
      return res.status(200).json({
        success: true,
        similarFound: false,
        candidates: [],
        message: "Semantic search is currently disabled.",
      });
    }

    // 4. Query ChromaDB semantic search via pythonService
    const radiusKm = Number(process.env.SEMANTIC_SEARCH_RADIUS_KM) || 10;
    const threshold = Number(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.40;

    const searchRes = await pythonService.searchSimilar({
      category: "Public Infrastructure",
      subcategory: draftData.subcategory,
      problemDescription: draftData.problemDescription,
      issueType: draftData.issueType,
      location: draftData.location,
      radius_km: radiusKm,
      limit: 5,
      threshold,
    });

    if (!searchRes || !searchRes.success || !Array.isArray(searchRes.candidates) || searchRes.candidates.length === 0) {
      return res.status(200).json({
        success: true,
        similarFound: false,
        candidates: [],
      });
    }

    const eligibleCandidates = await hydrateAndFilterCandidates(searchRes.candidates, sessionUserId);

    return res.status(200).json({
      success: true,
      similarFound: eligibleCandidates.length > 0,
      candidates: eligibleCandidates,
    });
  } catch (error: any) {
    console.error("checkDraftSimilar error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to perform semantic similarity check.",
    });
  }
};

/**
 * Citizen Final Confirmation & Submission Pipeline.
 * Triggered ONLY when the citizen clicks Submit on the Sensitivity Review page.
 * Validates authoritative classification, runs semantic clustering if eligible, and finalizes the report.
 */
export const finalizeDraftSubmission = async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const sessionUserId = (req.session as any)?.userId;
    const shouldSkipSimilarity = Boolean(req.body.skipSimilarityCheck);

    if (!draftId) {
      return res.status(400).json({ success: false, message: "Draft ID is required." });
    }

    const draft = await ReportDraftModel.findOne({ draftId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "Draft not found." });
    }

    // 1. Idempotency Check: Prevent duplicate reports if citizen clicks multiple times
    if (draft.finalizedReportId) {
      const existingReport = await reportDetails.findById(draft.finalizedReportId);
      if (existingReport) {
        return res.status(200).json({
          success: true,
          message: "Report was already submitted successfully.",
          report: existingReport,
          alreadyFinalized: true,
        });
      }
    }

    // 2. Draft Integrity & Hash Verification
    const currentHash = computeDraftContentHash(draft.draftData);
    if (draft.contentHash !== currentHash) {
      draft.contentHash = currentHash;
      draft.sensitivity = null;
      await draft.save();
      return res.status(400).json({
        success: false,
        message: "The grievance content changed after classification. Re-classification is required.",
        needsReclassification: true,
      });
    }

    // 3. Sensitivity Classification Check
    if (!draft.sensitivity || !draft.sensitivity.status || !draft.sensitivity.reason) {
      return res.status(400).json({
        success: false,
        message: "This grievance has not yet been classified. Sensitivity review is required before submission.",
        needsReclassification: true,
      });
    }

    const sensitivityStatus = draft.sensitivity.status;
    if (sensitivityStatus !== "sensitive" && sensitivityStatus !== "non_sensitive") {
      return res.status(400).json({
        success: false,
        message: "Invalid sensitivity classification. Re-classification is required.",
        needsReclassification: true,
      });
    }

    const draftData = draft.draftData;

    // 4. Semantic Clustering & Duplicate Detection:
    // Strictly occurs AFTER the citizen confirms Submit on the Sensitivity Review page.
    // Triggered ONLY for non-sensitive Public Infrastructure reports.
    const isPublicInfra = draftData.category === "Public Infrastructure";
    const isNonSensitive = sensitivityStatus === "non_sensitive";
    const semanticEnabled = process.env.SEMANTIC_SEARCH_ENABLED !== "false";

    if (
      isPublicInfra &&
      isNonSensitive &&
      !shouldSkipSimilarity &&
      semanticEnabled &&
      draftData.problemDescription
    ) {
      try {
        const radiusKm = Number(process.env.SEMANTIC_SEARCH_RADIUS_KM) || 10;
        const threshold = Number(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.40;

        const searchRes = await pythonService.searchSimilar({
          category: "Public Infrastructure",
          subcategory: draftData.subcategory,
          problemDescription: draftData.problemDescription,
          issueType: draftData.issueType,
          location: draftData.location,
          radius_km: radiusKm,
          limit: 5,
          threshold,
        });

        if (searchRes.success && searchRes.candidates.length > 0) {
          const eligibleCandidates = await hydrateAndFilterCandidates(
            searchRes.candidates,
            sessionUserId
          );

          if (eligibleCandidates.length > 0) {
            // Return candidates so citizen can inspect and choose to support existing or submit new
            return res.status(200).json({
              success: true,
              similarFound: true,
              message: "Similar issues reported nearby",
              candidates: eligibleCandidates,
              draftId: draft.draftId,
            });
          }
        }
      } catch (searchErr: any) {
        console.warn("Semantic clustering check encountered an error, falling back safely:", searchErr.message);
      }
    }

    // 5. Final Report Normalization & Persistence
    const normalizedReport = await normalizeReportDraftToEnglish(draftData);

    const determinedCreatedBy =
      sessionUserId ||
      draft.createdBy ||
      draftData.createdBy ||
      draftData.userId ||
      req.body.createdBy ||
      req.body.userId ||
      null;

    const reportData = {
      ...normalizedReport,
      createdBy: determinedCreatedBy,
      sensitivity: {
        status: draft.sensitivity.status,
        reason: draft.sensitivity.reason,
        classifiedAt: draft.sensitivity.classifiedAt || new Date(),
        classificationVersion: draft.sensitivity.classificationVersion || "1.0.0",
      },
      indexingStatus: isNonSensitive ? "pending" : "skipped",
    };

    const report = new reportDetails(reportData);
    await report.save();

    // Mark draft as finalized for idempotency
    draft.finalizedReportId = (report._id as any).toString();
    draft.updatedAt = new Date();
    await draft.save();

    // 6. Vector Synchronization:
    // Only non-sensitive reports are indexed into ChromaDB.
    // Sensitive reports are NEVER indexed into public semantic search.
    if (isNonSensitive) {
      try {
        const indexRes = await pythonService.indexReports([
          {
            id: (report._id as any).toString(),
            source: "mongodb",
            category: report.category,
            subcategory: report.subcategory,
            problemDescription: report.problemDescription,
            location: report.location,
            issueType: report.issueType,
            serviceOrScheme: report.serviceOrScheme,
            relevantDateOrDuration: report.relevantDateOrDuration,
            applicationStatus: report.applicationStatus,
            impact: report.impact,
            desiredResolution: report.desiredResolution,
            affectedPeople: report.affectedPeople,
            riskOrUrgency: report.riskOrUrgency,
            createdAt: report.createdAt ? (report.createdAt as Date).toISOString() : null,
            updatedAt: report.updatedAt ? (report.updatedAt as Date).toISOString() : null,
          },
        ]);

        if (indexRes && indexRes.success) {
          report.indexingStatus = "indexed";
          report.lastIndexedAt = new Date();
          await report.save();
        } else {
          report.indexingStatus = "failed";
          report.indexingError = indexRes?.errors?.join("; ") || "Indexing failed";
          await report.save();
        }
      } catch (idxErr: any) {
        console.warn("ChromaDB vector indexing exception:", idxErr.message);
        report.indexingStatus = "failed";
        report.indexingError = idxErr.message;
        await report.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error: any) {
    console.error("finalizeDraftSubmission error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to finalize report submission.",
    });
  }
};

