"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.likeComment = exports.voteComment = exports.replyComment = exports.addComment = exports.getComments = exports.toggleSupport = exports.getUsers = exports.getReports = exports.getReportById = exports.reportManual = exports.checkSimilarReports = exports.uploadingEvedince = exports.collectingInfo = exports.initialReportDraft = exports.createFreshReportDraft = exports.runtimeDummyUsers = exports.runtimeDummyComments = exports.runtimeDummyReports = void 0;
exports.isDepartmentAuthorizedForReport = isDepartmentAuthorizedForReport;
exports.normalizeReportDraftToEnglish = normalizeReportDraftToEnglish;
const mongoose_1 = __importDefault(require("mongoose"));
const reqInfo_json_1 = __importDefault(require("../data/reqInfo.json"));
const dummyData_json_1 = __importDefault(require("../data/dummyData.json"));
const dummyUsers_json_1 = __importDefault(require("../data/dummyUsers.json"));
const dummyComments_json_1 = __importDefault(require("../data/dummyComments.json"));
const groq_config_1 = __importDefault(require("../config/groq.config"));
const report_1 = __importDefault(require("../model/report"));
const comment_1 = __importDefault(require("../model/comment"));
const user_1 = __importDefault(require("../model/user"));
const pythonService_1 = require("../services/pythonService");
const classificationService_1 = require("../services/classificationService");
const depart_controller_1 = require("./depart.controller");
const departmentData_json_1 = __importDefault(require("../data/departmentData.json"));
const departUsers_json_1 = __importDefault(require("../data/departUsers.json"));
// In-memory runtime copies of dummy data so JSON files on disk are never mutated
exports.runtimeDummyReports = JSON.parse(JSON.stringify(dummyData_json_1.default)).map((r) => ({
    ...r,
    sensitivity: r.sensitivity || {
        status: "non_sensitive",
        reason: "Public infrastructure or standard civic administration issue suitable for community visibility.",
        classifiedAt: new Date(r.createdAt || "2026-10-01T00:00:00.000Z"),
        classificationVersion: "1.0.0",
    },
}));
function isDepartmentAuthorizedForReport(departId, report) {
    const departments = departmentData_json_1.default || departUsers_json_1.default.departments || [];
    const dept = departments.find((d) => d.departmentId === departId);
    if (!dept)
        return false;
    if (dept.category !== report.category)
        return false;
    const subcatMatch = Array.isArray(dept.subcategories) && dept.subcategories.some((sc) => sc.toLowerCase() === (report.subcategory || "").toLowerCase());
    if (!subcatMatch)
        return false;
    if (dept.category === "Public Infrastructure") {
        const deptLat = dept.location?.latitude;
        const deptLng = dept.location?.longitude;
        const serviceRadiusKm = dept.location?.radiusKm ?? dept.location?.radius ?? 10;
        if (typeof deptLat === "number" && typeof deptLng === "number") {
            const repLat = parseFloat(report.location?.latitude);
            const repLng = parseFloat(report.location?.longitude);
            if (isNaN(repLat) || isNaN(repLng))
                return false;
            const dist = (0, depart_controller_1.calculateDistanceKm)(deptLat, deptLng, repLat, repLng);
            return dist <= serviceRadiusKm;
        }
    }
    return true;
}
exports.runtimeDummyComments = JSON.parse(JSON.stringify(dummyComments_json_1.default));
exports.runtimeDummyUsers = JSON.parse(JSON.stringify(dummyUsers_json_1.default));
const createFreshReportDraft = () => ({
    category: null,
    subcategory: null,
    problemDescription: null,
    location: {
        address: null,
        latitude: null,
        longitude: null,
    },
    issueType: null,
    serviceOrScheme: null,
    relevantDateOrDuration: null,
    applicationStatus: null,
    evidence: null,
    riskOrUrgency: null,
    impact: null,
    desiredResolution: null,
    affectedPeople: null,
});
exports.createFreshReportDraft = createFreshReportDraft;
exports.initialReportDraft = (0, exports.createFreshReportDraft)();
function extractJsonFromText(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        // Strip markdown fences if present
        const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        try {
            return JSON.parse(cleaned);
        }
        catch {
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
            }
            throw new Error("Unable to parse AI response as JSON");
        }
    }
}
async function normalizeReportDraftToEnglish(draft) {
    const textFieldsToInspect = [
        "problemDescription",
        "issueType",
        "relevantDateOrDuration",
        "riskOrUrgency",
        "impact",
        "desiredResolution",
        "affectedPeople",
    ];
    // Inspect if any field contains Devanagari or typical Hinglish markers
    const needsNormalization = textFieldsToInspect.some((field) => {
        const val = draft[field];
        if (typeof val === "string" && val.trim()) {
            if (/[\u0900-\u097F]/.test(val))
                return true;
            if (/\b(hai|hain|nahi|nhi|raha|rahi|rahe|tha|thi|the|kafi|bohot|bahut|kharab|ghadha|gaddha|gadha|paani|pani|bijli|sadak|mera|meri|mere|aur|bhi|kripya|jaldi|karo|hone|wala|wali|wale|hote|hota|hoti)\b/i.test(val)) {
                return true;
            }
        }
        return false;
    });
    if (!needsNormalization) {
        return draft;
    }
    try {
        const prompt = `You are an official civic data language normalizer for JanSetu in India.
Your task is to take the provided grievance fields and translate any Hindi (Devanagari) or Hinglish (Roman Hindi) text into clear, objective, formal English.

STRICT NORMALIZATION RULES:
1. Translate all Hindi or Hinglish phrases in problemDescription, issueType, relevantDateOrDuration, riskOrUrgency, impact, desiredResolution, and affectedPeople into professional English.
2. PRESERVE exact proper nouns, landmark names, street names, local area names (e.g. "Pari Chowk", "Knowledge Park", "Surajpur"), personal names, and official document/application numbers without altering them.
3. PRESERVE all factual details (dates, days, numbers, severity). DO NOT invent, exaggerate, or omit any facts.
4. Return ONLY a valid JSON object matching the input fields with normalized English values.

Input fields to normalize:
${JSON.stringify({
            problemDescription: draft.problemDescription,
            issueType: draft.issueType,
            relevantDateOrDuration: draft.relevantDateOrDuration,
            riskOrUrgency: draft.riskOrUrgency,
            impact: draft.impact,
            desiredResolution: draft.desiredResolution,
            affectedPeople: draft.affectedPeople,
        }, null, 2)}`;
        const completion = await groq_config_1.default.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_completion_tokens: 800,
            response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        if (content) {
            const parsed = extractJsonFromText(content);
            const updatedDraft = { ...draft };
            for (const field of textFieldsToInspect) {
                if (typeof parsed[field] === "string" && parsed[field].trim()) {
                    updatedDraft[field] = parsed[field].trim();
                }
            }
            return updatedDraft;
        }
    }
    catch (err) {
        console.error("Language normalization error:", err);
    }
    return draft;
}
const collectingInfo = async (req, res) => {
    try {
        /*
        |--------------------------------------------------------------------------
        | 1. GET CITIZEN MESSAGE & REPORT DRAFT & CONVERSATION HISTORY
        |--------------------------------------------------------------------------
        */
        const latestCitizenMessage = typeof req.body.data === "string" ? req.body.data.trim() : "";
        if (!latestCitizenMessage) {
            return res.status(400).json({
                success: false,
                message: "Citizen message is required.",
            });
        }
        // Initialize or adopt incoming draft
        let currentDraft = req.body.reportDraft
            ? { ...(0, exports.createFreshReportDraft)(), ...req.body.reportDraft }
            : req.session?.reportDraft
                ? { ...(0, exports.createFreshReportDraft)(), ...req.session.reportDraft }
                : { ...exports.initialReportDraft };
        // Clean up any stale "notrequired" string pollution in incoming draft
        const allKnownFields = [
            "problemDescription",
            "location",
            "issueType",
            "serviceOrScheme",
            "relevantDateOrDuration",
            "applicationStatus",
            "evidence",
            "riskOrUrgency",
            "impact",
            "desiredResolution",
            "affectedPeople",
        ];
        for (const f of allKnownFields) {
            if (typeof currentDraft[f] === "string" &&
                currentDraft[f].trim().toLowerCase() === "notrequired") {
                currentDraft[f] = null;
            }
        }
        // Extract recent conversation history (last 8 messages)
        const rawMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
        const recentMessages = rawMessages
            .slice(-8)
            .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "citizen",
            text: typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "",
        }))
            .filter((m) => m.text.trim() !== "");
        /*
        |--------------------------------------------------------------------------
        | 2. CATEGORY, SUBCATEGORY & REQUIRED FIELDS FROM reqInfo.json
        |--------------------------------------------------------------------------
        */
        const currentCategory = currentDraft.category;
        const currentSubcategory = currentDraft.subcategory;
        let requiredFields = [];
        if (currentCategory && currentSubcategory) {
            requiredFields =
                reqInfo_json_1.default.categories?.[currentCategory]?.subcategories?.[currentSubcategory]?.requiredFields ?? [];
        }
        const categoryOptions = Object.entries(reqInfo_json_1.default.categories).map(([catName, catData]) => ({
            category: catName,
            subcategories: Object.keys(catData.subcategories),
        }));
        /*
        |--------------------------------------------------------------------------
        | 3. SYSTEM PROMPT
        |--------------------------------------------------------------------------
        */
        const systemPrompt = `
You are MargDarshak AI, the official grievance assistant for JanSetu — a Citizen Voice and Accountability Intelligence Platform in India.

Your objective is to help citizens prepare an accurate, structured grievance report through natural conversation.

STRICT CONVERSATION & LANGUAGE NORMALIZATION RULES:
1. Ask exactly ONE focused follow-up question at a time.
2. Extract only facts explicitly provided by the citizen. Never invent or assume facts, coordinates, dates, or file uploads.
3. Use the currentReportDraft to see what information has already been collected.
4. Use recentConversation to understand the context of the citizen's latest response (e.g. if they answer a previous question with a short answer like "Yes", "Near city hall", "last week", or make a correction).
5. If category or subcategory is unknown or requires refinement, use the provided categoryOptions to guide or infer the correct category and subcategory based on the citizen's complaint.
6. Once category and subcategory are set, ask only about fields in requiredFields that are still missing.
7. If the citizen provides multiple pieces of information in a single message, extract all of them into reportDraft, and ask only ONE next question.
8. If the citizen corrects previously provided information, update the relevant field in reportDraft.
9. LANGUAGE NORMALIZATION: The citizen is free to communicate in Hindi (Devanagari), Hinglish (Roman Hindi), or English. However, ALL reportDraft free-text fields (problemDescription, issueType, relevantDateOrDuration, riskOrUrgency, impact, desiredResolution, affectedPeople) MUST ALWAYS be written in clear, objective English. NEVER put raw Hindi or Hinglish phrases into reportDraft.
10. PRESERVE proper nouns, personal names, specific street/locality names, landmark names (e.g. "Pari Chowk", "Knowledge Park II", "Sector 62"), and official reference numbers without altering them.
11. If the latest citizen message is in Hindi or Hinglish, generate assistantMessage in natural Hindi using Devanagari script. If the citizen wrote in English, respond in English.
12. Set targetedField to the specific field name from requiredFields (or "location", "evidence", "category", "subcategory") that your assistantMessage is currently asking for. If all required fields are collected, set targetedField to null.
13. Never invent latitude or longitude. A location can only have numeric coordinates if explicitly provided or fetched.
14. If all required fields are collected, write a concise summary in assistantMessage asking the citizen to review their completed report.

Return ONLY a valid JSON object matching this schema:
{
  "assistantMessage": "Follow-up question or review message",
  "reportDraft": {
    "category": string or null,
    "subcategory": string or null,
    "problemDescription": string or null,
    "location": {
      "address": string or null,
      "latitude": number or null,
      "longitude": number or null
    },
    "issueType": string or null,
    "serviceOrScheme": string or null,
    "relevantDateOrDuration": string or null,
    "applicationStatus": string or null,
    "evidence": array or null,
    "riskOrUrgency": string or null,
    "impact": string or null,
    "desiredResolution": string or null,
    "affectedPeople": string or null
  },
  "targetedField": "problemDescription" | "location" | "issueType" | "serviceOrScheme" | "relevantDateOrDuration" | "applicationStatus" | "evidence" | "riskOrUrgency" | "impact" | "desiredResolution" | "affectedPeople" | "category" | "subcategory" | null,
  "aiQueryType": "location" | "evidence" | "general"
}
`;
        /*
        |--------------------------------------------------------------------------
        | 4. CALL GROQ
        |--------------------------------------------------------------------------
        */
        const contextForAI = {
            currentReportDraft: currentDraft,
            requiredFields,
            categoryOptions,
            recentConversation: recentMessages,
            latestCitizenMessage,
        };
        let result = null;
        try {
            const completion = await groq_config_1.default.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(contextForAI) },
                ],
                temperature: 0.2,
                max_completion_tokens: 1200,
                response_format: { type: "json_object" },
            });
            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error("Groq returned an empty response.");
            }
            result = extractJsonFromText(content);
        }
        catch (apiError) {
            console.error("Groq API completion error:", apiError);
            // Graceful fallback response when LLM call encounters transient issue
            result = {
                assistantMessage: "I understood your details. Could you please share the next detail, such as the exact location or problem description?",
                reportDraft: currentDraft,
                targetedField: requiredFields[0] || "problemDescription",
                aiQueryType: "general",
            };
        }
        /*
        |--------------------------------------------------------------------------
        | 5. MERGE AI REPORT DRAFT INTO CURRENT DRAFT SAFELY
        |--------------------------------------------------------------------------
        */
        const aiDraft = result.reportDraft || {};
        // Validate category and subcategory against reqInfo.json
        if (aiDraft.category && reqInfo_json_1.default.categories?.[aiDraft.category]) {
            currentDraft.category = aiDraft.category;
            if (aiDraft.subcategory &&
                reqInfo_json_1.default.categories[aiDraft.category]?.subcategories?.[aiDraft.subcategory]) {
                currentDraft.subcategory = aiDraft.subcategory;
            }
        }
        // Merge standard text fields
        const textFields = [
            "problemDescription",
            "issueType",
            "serviceOrScheme",
            "relevantDateOrDuration",
            "applicationStatus",
            "riskOrUrgency",
            "impact",
            "desiredResolution",
            "affectedPeople",
        ];
        for (const field of textFields) {
            if (typeof aiDraft[field] === "string" && aiDraft[field].trim() !== "") {
                const val = aiDraft[field].trim();
                if (val.toLowerCase() !== "notrequired") {
                    currentDraft[field] = val;
                }
            }
        }
        // Merge location safely without wiping existing coordinates
        if (aiDraft.location) {
            const existingLoc = currentDraft.location || { address: null, latitude: null, longitude: null };
            const newAddress = typeof aiDraft.location.address === "string" && aiDraft.location.address.trim() !== ""
                ? aiDraft.location.address.trim()
                : existingLoc.address;
            const newLat = typeof aiDraft.location.latitude === "number" && Number.isFinite(aiDraft.location.latitude)
                ? aiDraft.location.latitude
                : existingLoc.latitude;
            const newLng = typeof aiDraft.location.longitude === "number" && Number.isFinite(aiDraft.location.longitude)
                ? aiDraft.location.longitude
                : existingLoc.longitude;
            currentDraft.location = {
                address: newAddress ?? null,
                latitude: newLat ?? null,
                longitude: newLng ?? null,
            };
        }
        // Merge evidence array safely
        if (Array.isArray(aiDraft.evidence) && aiDraft.evidence.length > 0) {
            const existingEv = Array.isArray(currentDraft.evidence) ? currentDraft.evidence : [];
            const evMap = new Map();
            existingEv.forEach((item) => {
                if (item?.url)
                    evMap.set(item.url, item);
            });
            aiDraft.evidence.forEach((item) => {
                if (item?.url)
                    evMap.set(item.url, item);
            });
            currentDraft.evidence = Array.from(evMap.values());
        }
        /*
        |--------------------------------------------------------------------------
        | 6. RE-CALCULATE AUTHORITATIVE REQUIRED FIELDS & COMPLETION FROM BACKEND
        |--------------------------------------------------------------------------
        */
        const finalCategory = currentDraft.category;
        const finalSubcategory = currentDraft.subcategory;
        let finalRequiredFields = [];
        if (finalCategory && finalSubcategory) {
            finalRequiredFields =
                reqInfo_json_1.default.categories?.[finalCategory]?.subcategories?.[finalSubcategory]?.requiredFields ?? [];
        }
        // Helper to test if a required field is completed
        const isFieldComplete = (field) => {
            if (field === "location") {
                const loc = currentDraft.location;
                if (!loc)
                    return false;
                const hasAddress = typeof loc.address === "string" && loc.address.trim() !== "";
                const hasCoords = typeof loc.latitude === "number" &&
                    Number.isFinite(loc.latitude) &&
                    typeof loc.longitude === "number" &&
                    Number.isFinite(loc.longitude);
                // For Public Infrastructure, spatial routing within 10 KM requires coordinates
                if (finalCategory === "Public Infrastructure") {
                    return hasAddress && hasCoords;
                }
                return hasAddress || hasCoords;
            }
            if (field === "evidence") {
                return Array.isArray(currentDraft.evidence) && currentDraft.evidence.length > 0;
            }
            const value = currentDraft[field];
            if (value === null || value === undefined)
                return false;
            if (typeof value === "string") {
                return value.trim() !== "" && value.trim().toLowerCase() !== "notrequired";
            }
            return true;
        };
        // Clean any non-applicable fields to null (do NOT use "notrequired" strings)
        for (const field of allKnownFields) {
            if (!finalRequiredFields.includes(field)) {
                if (typeof currentDraft[field] === "string" &&
                    currentDraft[field].toLowerCase() === "notrequired") {
                    currentDraft[field] = null;
                }
            }
        }
        const missingRequiredFields = finalRequiredFields.filter((field) => !isFieldComplete(field));
        const isComplete = Boolean(finalCategory && finalSubcategory) &&
            finalRequiredFields.length > 0 &&
            missingRequiredFields.length === 0;
        /*
        |--------------------------------------------------------------------------
        | 7. AUTHORITATIVE REQUESTED INPUT TYPE & FIELD
        |--------------------------------------------------------------------------
        */
        let requestedInputType = "text";
        let requestedField = null;
        let aiQueryType = "general";
        if (!isComplete) {
            const targeted = result.targetedField;
            const activeField = targeted && missingRequiredFields.includes(targeted)
                ? targeted
                : missingRequiredFields[0] ||
                    (!finalCategory ? "category" : !finalSubcategory ? "subcategory" : null);
            requestedField = activeField;
            if (activeField === "location") {
                requestedInputType = "location";
                aiQueryType = "location";
            }
            else if (activeField === "evidence") {
                aiQueryType = "evidence";
                if (finalCategory === "Public Infrastructure" ||
                    finalSubcategory?.toLowerCase().includes("road") ||
                    finalSubcategory?.toLowerCase().includes("street") ||
                    finalSubcategory?.toLowerCase().includes("damage")) {
                    requestedInputType = "image";
                }
                else if (finalCategory === "Administrative Processes" ||
                    finalSubcategory?.toLowerCase().includes("certificate") ||
                    finalSubcategory?.toLowerCase().includes("passport") ||
                    finalSubcategory?.toLowerCase().includes("record")) {
                    requestedInputType = "document";
                }
                else {
                    requestedInputType = "evidence";
                }
            }
            else if (activeField === "relevantDateOrDuration") {
                requestedInputType = "date";
                aiQueryType = "general";
            }
            else if (activeField === "category" || activeField === "subcategory") {
                requestedInputType = "selection";
                aiQueryType = "general";
            }
            else {
                requestedInputType = "text";
                aiQueryType = "general";
            }
        }
        /*
        |--------------------------------------------------------------------------
        | 8. SAVE STATE & RETURN RESPONSE
        |--------------------------------------------------------------------------
        */
        if (isComplete) {
            currentDraft = await normalizeReportDraftToEnglish(currentDraft);
        }
        if (req.session) {
            req.session.reportDraft = currentDraft;
        }
        exports.initialReportDraft = currentDraft;
        const finalResult = {
            assistantMessage: result.assistantMessage ?? "",
            reportDraft: currentDraft,
            missingRequiredFields,
            requiredFields: finalRequiredFields,
            isComplete,
            aiQueryType,
            requestedInputType,
            requestedField,
        };
        return res.status(200).json({
            success: true,
            result: finalResult,
        });
    }
    catch (error) {
        console.error("collectingInfo error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message ?? "Something went wrong while collecting information.",
        });
    }
};
exports.collectingInfo = collectingInfo;
const uploadingEvedince = (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files were uploaded",
            });
        }
        const evidence = files.map((file) => {
            let type = "other";
            if (file.mimetype.startsWith("image/")) {
                type = "image";
            }
            else if (file.mimetype.startsWith("video/")) {
                type = "video";
            }
            else if (file.mimetype === "application/pdf" ||
                file.mimetype === "application/msword" ||
                file.mimetype ===
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                type = "document";
            }
            return {
                url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
                type,
            };
        });
        return res.status(200).json({
            success: true,
            evidence,
        });
    }
    catch (error) {
        console.error("Evidence upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Evidence upload failed",
        });
    }
};
exports.uploadingEvedince = uploadingEvedince;
// Helper to hydrate, validate, and enrich candidate vector matches against MongoDB & runtime reports
async function hydrateAndFilterCandidates(candidates, currentUserId) {
    const eligibleCandidates = [];
    for (const cand of candidates) {
        let report = null;
        const repId = String(cand.report_id || "");
        // 1. Authoritative check in MongoDB
        if (repId.match(/^[0-9a-fA-F]{24}$/)) {
            const doc = await report_1.default.findById(repId).lean();
            if (doc)
                report = doc;
        }
        // 2. Check runtime dummy reports
        if (!report) {
            const dummy = exports.runtimeDummyReports.find((r) => r._id === repId);
            if (dummy)
                report = dummy;
        }
        if (!report)
            continue;
        // Security check: sensitive reports must NEVER be surfaced as duplicate candidates
        if (report.sensitivity && report.sensitivity.status === "sensitive") {
            continue;
        }
        // 3. Eligibility check: Resolved, Closed, or Rejected grievances cannot receive community support
        const status = report.applicationStatus || "Reported";
        if (status === "Resolved" || status === "Rejected" || status === "Closed") {
            continue;
        }
        const supportedByList = Array.isArray(report.supportedBy) ? report.supportedBy : [];
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
const checkSimilarReports = async (req, res) => {
    try {
        const sessionUserId = req.session?.userId;
        const { category, subcategory, problemDescription, issueType, location } = req.body;
        if (category !== "Public Infrastructure" || !problemDescription) {
            return res.status(200).json({
                success: true,
                similarFound: false,
                candidates: [],
            });
        }
        const radiusKm = Number(process.env.SEMANTIC_SEARCH_RADIUS_KM) || 10;
        const threshold = Number(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.40;
        const searchRes = await pythonService_1.pythonService.searchSimilar({
            category: "Public Infrastructure",
            subcategory,
            problemDescription,
            issueType,
            location,
            radius_km: radiusKm,
            limit: 5,
            threshold,
        });
        if (!searchRes.success || searchRes.candidates.length === 0) {
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
    }
    catch (error) {
        console.error("checkSimilarReports error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to perform semantic search check",
        });
    }
};
exports.checkSimilarReports = checkSimilarReports;
const reportManual = async (req, res) => {
    try {
        const form = req.body.data || req.body;
        const sessionUserId = req.session?.userId;
        const shouldSkipSimilarity = Boolean(req.body.skipSimilarityCheck || form.skipSimilarityCheck);
        // Sanitize any "notrequired" strings into null
        const sanitizedData = {};
        for (const [key, value] of Object.entries(form)) {
            if (typeof value === "string" && value.trim().toLowerCase() === "notrequired") {
                sanitizedData[key] = null;
            }
            else {
                sanitizedData[key] = value;
            }
        }
        // Authoritative sensitivity determination using shared Groq classification service
        let authoritativeSensitivity = form.sensitivity;
        if (!authoritativeSensitivity ||
            (authoritativeSensitivity.status !== "sensitive" && authoritativeSensitivity.status !== "non_sensitive") ||
            !authoritativeSensitivity.reason) {
            authoritativeSensitivity = await (0, classificationService_1.classifyGrievance)(sanitizedData);
        }
        const isNonSensitive = authoritativeSensitivity.status === "non_sensitive";
        // Real-Time Semantic Clustering Trigger: Public Infrastructure only, and ONLY for non-sensitive reports!
        const isPublicInfra = sanitizedData.category === "Public Infrastructure";
        const semanticEnabled = process.env.SEMANTIC_SEARCH_ENABLED !== "false";
        if (isPublicInfra && isNonSensitive && !shouldSkipSimilarity && semanticEnabled && sanitizedData.problemDescription) {
            try {
                const radiusKm = Number(process.env.SEMANTIC_SEARCH_RADIUS_KM) || 10;
                const threshold = Number(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.40;
                const searchRes = await pythonService_1.pythonService.searchSimilar({
                    category: "Public Infrastructure",
                    subcategory: sanitizedData.subcategory,
                    problemDescription: sanitizedData.problemDescription,
                    issueType: sanitizedData.issueType,
                    location: sanitizedData.location,
                    radius_km: radiusKm,
                    limit: 5,
                    threshold,
                });
                if (searchRes.success && searchRes.candidates.length > 0) {
                    const eligibleCandidates = await hydrateAndFilterCandidates(searchRes.candidates, sessionUserId);
                    if (eligibleCandidates.length > 0) {
                        return res.status(200).json({
                            success: true,
                            similarFound: true,
                            message: "Similar issues reported nearby",
                            candidates: eligibleCandidates,
                        });
                    }
                }
            }
            catch (searchErr) {
                console.warn("Semantic clustering check encountered an error, falling back safely:", searchErr.message);
            }
        }
        // Authoritatively normalize report text fields to English
        const normalizedReport = await normalizeReportDraftToEnglish(sanitizedData);
        const determinedCreatedBy = sessionUserId ||
            sanitizedData.createdBy ||
            sanitizedData.userId ||
            req.body.createdBy ||
            req.body.userId ||
            req.session?.user?.id ||
            null;
        const reportData = {
            ...normalizedReport,
            createdBy: determinedCreatedBy,
            sensitivity: {
                status: authoritativeSensitivity.status,
                reason: authoritativeSensitivity.reason,
                classifiedAt: authoritativeSensitivity.classifiedAt || new Date(),
                classificationVersion: authoritativeSensitivity.classificationVersion || "1.0.0",
            },
            indexingStatus: isNonSensitive ? "pending" : "skipped",
        };
        const report = new report_1.default(reportData);
        await report.save();
        console.log("Report created with createdBy:", determinedCreatedBy, "id:", report._id);
        // Synchronize to ChromaDB vector index via Python service ONLY if non-sensitive
        if (isNonSensitive) {
            try {
                const indexRes = await pythonService_1.pythonService.indexReports([
                    {
                        id: report._id.toString(),
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
                        createdAt: report.createdAt ? report.createdAt.toISOString() : null,
                        updatedAt: report.updatedAt ? report.updatedAt.toISOString() : null,
                    },
                ]);
                if (indexRes && indexRes.success) {
                    report.indexingStatus = "indexed";
                    report.lastIndexedAt = new Date();
                    await report.save();
                }
                else {
                    report.indexingStatus = "failed";
                    report.indexingError = indexRes?.errors?.join("; ") || "Indexing failed";
                    await report.save();
                }
            }
            catch (idxErr) {
                console.warn("Real-time vector indexing exception:", idxErr.message);
                report.indexingStatus = "failed";
                report.indexingError = idxErr.message;
                await report.save();
            }
        }
        res.status(200).json({ success: true, message: "Report created successfully", report });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to submit report",
        });
    }
};
exports.reportManual = reportManual;
const getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;
        let targetReport = exports.runtimeDummyReports.find((r) => r._id === reportId);
        if (!targetReport) {
            const mongoR = await report_1.default.findById(reportId);
            if (mongoR) {
                targetReport = typeof mongoR.toObject === "function" ? mongoR.toObject() : mongoR;
            }
        }
        if (!targetReport) {
            return res.status(404).json({
                success: false,
                message: "Report not found",
            });
        }
        // Access control check for sensitive reports:
        const isSensitive = targetReport.sensitivity && targetReport.sensitivity.status === "sensitive";
        const isUnclassified = !targetReport.sensitivity || !targetReport.sensitivity.status;
        if (isSensitive || isUnclassified) {
            const sessionUserId = req.session?.userId || req.query.userId;
            const sessionDepartId = req.session?.departId;
            const isOwner = Boolean(sessionUserId &&
                (targetReport.createdBy === sessionUserId || targetReport.userId === sessionUserId));
            const isAuthorizedDept = Boolean(sessionDepartId && isDepartmentAuthorizedForReport(sessionDepartId, targetReport));
            if (!isOwner && !isAuthorizedDept) {
                return res.status(403).json({
                    success: false,
                    message: "Access restricted: This grievance contains sensitive information and is only visible to the owner and authorized department personnel.",
                });
            }
        }
        const rId = (targetReport._id || "").toString();
        const dummyCommentCount = exports.runtimeDummyComments.filter((c) => (c.reportId || "").toString() === rId).length;
        const mongoCommentCount = await comment_1.default.countDocuments({ reportId: rId });
        const commentCount = dummyCommentCount + mongoCommentCount;
        let creatorUser = null;
        const creatorId = targetReport.createdBy || targetReport.userId;
        if (creatorId) {
            const dummyU = exports.runtimeDummyUsers.find((u) => u.id === creatorId || u.username === creatorId);
            if (dummyU) {
                creatorUser = {
                    id: dummyU.id,
                    username: dummyU.username,
                    name: dummyU.name,
                    profilePhoto: dummyU.profilePhoto,
                };
            }
            else {
                const mongoU = await user_1.default.findById(creatorId).lean();
                if (mongoU) {
                    creatorUser = {
                        id: mongoU._id.toString(),
                        username: mongoU.username,
                        name: mongoU.name,
                        profilePhoto: mongoU.profilePhoto,
                    };
                }
            }
        }
        if (!creatorUser) {
            creatorUser = {
                id: "citizen_resident",
                username: "citizen_resident",
                name: "Citizen Resident",
                profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            };
        }
        const reportWithMeta = {
            ...targetReport,
            commentCount,
            creator: creatorUser,
        };
        return res.status(200).json({
            success: true,
            report: reportWithMeta,
        });
    }
    catch (error) {
        console.error("getReportById error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch report details",
        });
    }
};
exports.getReportById = getReportById;
const getReports = async (req, res) => {
    try {
        const sessionUserId = req.session?.userId || req.query.userId;
        const mongoReports = await report_1.default.find().sort({ createdAt: -1 });
        // Aggregate comment counts for MongoDB reports
        const mongoCommentCounts = {};
        const allMongoComments = await comment_1.default.find({}).lean();
        allMongoComments.forEach((c) => {
            const rid = c.reportId?.toString();
            if (rid) {
                mongoCommentCounts[rid] = (mongoCommentCounts[rid] || 0) + 1;
            }
        });
        const combinedReports = [...mongoReports, ...exports.runtimeDummyReports];
        // Authoritative visibility filter:
        // 1. Non-sensitive reports are eligible for the public community feed.
        // 2. Sensitive reports are restricted and visible ONLY to the citizen who filed them.
        // 3. Unclassified historical reports are not made publicly visible merely because sensitivity is absent.
        const visibleReports = combinedReports.filter((r) => {
            const status = r.sensitivity?.status;
            if (status === "non_sensitive") {
                return true;
            }
            if (sessionUserId) {
                const creatorId = r.createdBy || r.userId;
                if (creatorId && creatorId === sessionUserId) {
                    return true;
                }
            }
            return false;
        });
        // Calculate dynamic comment counts for each report without mutating JSON disk files
        const reports = visibleReports.map((r) => {
            const reportObj = typeof r.toObject === "function" ? r.toObject() : { ...r };
            const reportId = (reportObj._id || "").toString();
            const dummyCommentCount = exports.runtimeDummyComments.filter((c) => (c.reportId || "").toString() === reportId).length;
            const mongoCount = mongoCommentCounts[reportId] || 0;
            const commentCount = dummyCommentCount + mongoCount;
            return {
                ...reportObj,
                commentCount,
            };
        });
        res.status(200).json({
            success: true,
            reports,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch reports",
        });
    }
};
exports.getReports = getReports;
const getUsers = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            users: exports.runtimeDummyUsers,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};
exports.getUsers = getUsers;
const toggleSupport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const userId = req.session?.userId || req.body.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to continue.",
            });
        }
        // 1. Check runtime dummy reports
        const dummyReport = exports.runtimeDummyReports.find((r) => r._id === reportId);
        if (dummyReport) {
            if (dummyReport.sensitivity && dummyReport.sensitivity.status === "sensitive") {
                return res.status(403).json({
                    success: false,
                    message: "Sensitive grievances are restricted and not eligible for public community support.",
                });
            }
            // Eligibility check: Resolved or Rejected reports cannot receive community support
            const currentStatus = dummyReport.applicationStatus || "Reported";
            if (currentStatus === "Resolved" || currentStatus === "Rejected") {
                return res.status(400).json({
                    success: false,
                    message: "Resolved or closed grievances are no longer eligible for community support.",
                });
            }
            if (!Array.isArray(dummyReport.supportedBy)) {
                dummyReport.supportedBy = [];
            }
            const existingIndex = dummyReport.supportedBy.indexOf(userId);
            let supported = false;
            if (existingIndex !== -1) {
                dummyReport.supportedBy.splice(existingIndex, 1);
                supported = false;
            }
            else {
                dummyReport.supportedBy.push(userId);
                supported = true;
            }
            return res.status(200).json({
                success: true,
                supported,
                supportCount: dummyReport.supportedBy.length,
                supportedBy: dummyReport.supportedBy,
                message: supported ? "Thank you for supporting this community issue!" : "Support removed.",
            });
        }
        // 2. Authoritative check in MongoDB
        const mongoReport = await report_1.default.findById(reportId);
        if (!mongoReport) {
            return res.status(404).json({
                success: false,
                message: "Report not found",
            });
        }
        if (mongoReport.sensitivity && mongoReport.sensitivity.status === "sensitive") {
            return res.status(403).json({
                success: false,
                message: "Sensitive grievances are restricted and not eligible for public community support.",
            });
        }
        // Eligibility check
        const currentStatus = mongoReport.applicationStatus || "Reported";
        if (currentStatus === "Resolved" || currentStatus === "Rejected") {
            return res.status(400).json({
                success: false,
                message: "Resolved or closed grievances are no longer eligible for community support.",
            });
        }
        const currentSupportedBy = Array.isArray(mongoReport.supportedBy) ? mongoReport.supportedBy : [];
        const isAlreadySupported = currentSupportedBy.includes(userId);
        let supported = false;
        if (isAlreadySupported) {
            // Atomic removal
            await report_1.default.updateOne({ _id: mongoReport._id }, { $pull: { supportedBy: userId } });
            supported = false;
        }
        else {
            // Atomic addition preventing concurrent duplicate support
            await report_1.default.updateOne({ _id: mongoReport._id }, { $addToSet: { supportedBy: userId } });
            supported = true;
        }
        const updated = await report_1.default.findById(reportId).lean();
        const finalSupporters = updated?.supportedBy || [];
        return res.status(200).json({
            success: true,
            supported,
            supportCount: finalSupporters.length,
            supportedBy: finalSupporters,
            message: supported ? "Thank you for supporting this community issue!" : "Support removed.",
        });
    }
    catch (error) {
        console.error("toggleSupport error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to toggle report support",
        });
    }
};
exports.toggleSupport = toggleSupport;
const getComments = async (req, res) => {
    try {
        const { reportId } = req.params;
        const sort = typeof req.query.sort === "string" ? req.query.sort.toLowerCase() : "top";
        const currentUserId = req.session?.userId || req.query.userId || "";
        const isMongoConnected = mongoose_1.default.connection.readyState === 1;
        // Access control: comments on sensitive reports are restricted to report owner & assigned department
        let targetReport = exports.runtimeDummyReports.find((r) => r._id === reportId);
        if (!targetReport && isMongoConnected) {
            targetReport = await report_1.default.findById(reportId).lean();
        }
        if (targetReport && targetReport.sensitivity && targetReport.sensitivity.status === "sensitive") {
            const isOwner = Boolean(currentUserId &&
                (targetReport.createdBy === currentUserId || targetReport.userId === currentUserId));
            const sessionDepartId = req.session?.departId;
            const isAuthorizedDept = Boolean(sessionDepartId && isDepartmentAuthorizedForReport(sessionDepartId, targetReport));
            if (!isOwner && !isAuthorizedDept) {
                return res.status(403).json({
                    success: false,
                    message: "Access restricted: Comments on sensitive reports are not publicly accessible.",
                });
            }
        }
        const dummyComms = exports.runtimeDummyComments.filter((c) => c.reportId === reportId);
        const mongoComms = isMongoConnected ? await comment_1.default.find({ reportId }).lean() : [];
        const allComms = [...dummyComms, ...mongoComms];
        // Fetch MongoDB users for enrichment
        const mongoUsers = isMongoConnected ? await user_1.default.find({}).lean() : [];
        const mongoUserMap = {};
        mongoUsers.forEach((u) => {
            mongoUserMap[u._id.toString()] = u;
        });
        // Helper to extract author information
        const getAuthor = (userId) => {
            const dummyU = exports.runtimeDummyUsers.find((user) => user.id === userId || user.username === userId);
            const mongoU = mongoUserMap[userId];
            const u = dummyU || mongoU;
            return u
                ? {
                    id: u.id || u._id?.toString(),
                    name: u.name,
                    profilePhoto: u.profilePhoto,
                }
                : {
                    id: userId,
                    name: "Citizen Resident",
                    profilePhoto: null,
                };
        };
        // Enrich all comments with author details, upvotes, downvotes, net score, and user vote state
        const commentMap = new Map();
        const topLevelComments = [];
        // Pre-populate map
        allComms.forEach((c) => {
            const id = (c.id || c._id?.toString() || "").toString();
            const upvotes = Array.isArray(c.upvotes)
                ? c.upvotes
                : Array.isArray(c.likedBy)
                    ? [...c.likedBy]
                    : [];
            const downvotes = Array.isArray(c.downvotes) ? c.downvotes : [];
            const score = upvotes.length - downvotes.length;
            let userVote = null;
            if (currentUserId) {
                if (upvotes.includes(currentUserId)) {
                    userVote = "up";
                }
                else if (downvotes.includes(currentUserId)) {
                    userVote = "down";
                }
            }
            const commentText = c.comment || c.content || "";
            const enriched = {
                id,
                _id: id,
                reportId: c.reportId,
                userId: c.userId,
                comment: commentText,
                content: commentText,
                parentCommentId: c.parentCommentId || null,
                upvotes,
                downvotes,
                score,
                likes: upvotes.length,
                likedBy: upvotes,
                userVote,
                createdAt: c.createdAt || new Date().toISOString(),
                updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
                user: getAuthor(c.userId),
                replies: [],
                replyCount: 0,
            };
            commentMap.set(id, enriched);
        });
        // Assemble threaded hierarchy
        commentMap.forEach((comment) => {
            if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
                const parent = commentMap.get(comment.parentCommentId);
                parent.replies.push(comment);
            }
            else {
                topLevelComments.push(comment);
            }
        });
        // Sort replies within each parent comment by score descending, then oldest first
        commentMap.forEach((comment) => {
            if (comment.replies.length > 0) {
                comment.replies.sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                });
                comment.replyCount = comment.replies.length;
            }
        });
        // Sort top-level comments based on requested mode
        if (sort === "newest") {
            topLevelComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        else if (sort === "oldest") {
            topLevelComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        else {
            // "top" (default): highest net score first, secondary sort by newest
            topLevelComments.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }
        return res.status(200).json({
            success: true,
            comments: topLevelComments,
            totalComments: allComms.length,
            sort,
        });
    }
    catch (error) {
        console.error("getComments error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch comments",
        });
    }
};
exports.getComments = getComments;
const addComment = async (req, res) => {
    try {
        const { reportId } = req.params;
        const userId = req.session?.userId || req.body.userId;
        const rawComment = req.body.comment || req.body.content;
        const parentCommentId = req.body.parentCommentId ? String(req.body.parentCommentId).trim() : null;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to continue.",
            });
        }
        if (!rawComment || typeof rawComment !== "string" || !rawComment.trim()) {
            return res.status(400).json({
                success: false,
                message: "Comment text is required",
            });
        }
        const trimmedComment = rawComment.trim();
        if (trimmedComment.length > 3000) {
            return res.status(400).json({
                success: false,
                message: "Comment exceeds maximum limit of 3000 characters",
            });
        }
        // Access control: Sensitive reports do NOT accept community comments
        let targetRep = exports.runtimeDummyReports.find((r) => r._id === reportId);
        if (!targetRep && mongoose_1.default.connection.readyState === 1) {
            targetRep = await report_1.default.findById(reportId).lean();
        }
        if (targetRep && targetRep.sensitivity && targetRep.sensitivity.status === "sensitive") {
            return res.status(403).json({
                success: false,
                message: "Sensitive grievances are restricted and do not accept community comments.",
            });
        }
        // If this is a reply, verify parent comment exists and belongs to the same report
        if (parentCommentId) {
            const dummyParent = exports.runtimeDummyComments.find((c) => c.id === parentCommentId || c._id?.toString() === parentCommentId);
            let mongoParent = null;
            if (!dummyParent && parentCommentId.match(/^[0-9a-fA-F]{24}$/)) {
                mongoParent = await comment_1.default.findById(parentCommentId).lean();
            }
            const parent = dummyParent || mongoParent;
            if (!parent) {
                return res.status(404).json({
                    success: false,
                    message: "Parent comment not found",
                });
            }
            if (parent.reportId !== reportId) {
                return res.status(400).json({
                    success: false,
                    message: "Parent comment does not belong to this report",
                });
            }
        }
        const isDummyReport = exports.runtimeDummyReports.some((r) => r._id === reportId);
        let createdCommentId;
        let createdAtDate = new Date();
        if (isDummyReport) {
            createdCommentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const newCommentObj = {
                id: createdCommentId,
                _id: createdCommentId,
                reportId,
                userId,
                comment: trimmedComment,
                content: trimmedComment,
                parentCommentId: parentCommentId || null,
                upvotes: [],
                downvotes: [],
                score: 0,
                likes: 0,
                likedBy: [],
                createdAt: createdAtDate.toISOString(),
                updatedAt: createdAtDate.toISOString(),
            };
            exports.runtimeDummyComments.unshift(newCommentObj);
        }
        else {
            const mongoComment = new comment_1.default({
                reportId,
                userId,
                comment: trimmedComment,
                parentCommentId: parentCommentId || null,
                upvotes: [],
                downvotes: [],
                likes: 0,
                likedBy: [],
            });
            await mongoComment.save();
            createdCommentId = mongoComment._id.toString();
            createdAtDate = mongoComment.createdAt || createdAtDate;
        }
        // Hydrate author details
        const dummyU = exports.runtimeDummyUsers.find((user) => user.id === userId || user.username === userId);
        let mongoU = null;
        if (!dummyU && userId.match(/^[0-9a-fA-F]{24}$/)) {
            mongoU = await user_1.default.findById(userId).lean();
        }
        const u = dummyU || mongoU;
        const enrichedComment = {
            id: createdCommentId,
            _id: createdCommentId,
            reportId,
            userId,
            comment: trimmedComment,
            content: trimmedComment,
            parentCommentId: parentCommentId || null,
            upvotes: [],
            downvotes: [],
            score: 0,
            likes: 0,
            likedBy: [],
            userVote: null,
            createdAt: createdAtDate.toISOString(),
            updatedAt: createdAtDate.toISOString(),
            user: u
                ? {
                    id: u.id || u._id?.toString(),
                    name: u.name,
                    profilePhoto: u.profilePhoto,
                }
                : {
                    id: userId,
                    name: "Citizen Resident",
                    profilePhoto: null,
                },
            replies: [],
            replyCount: 0,
        };
        return res.status(200).json({
            success: true,
            comment: enrichedComment,
        });
    }
    catch (error) {
        console.error("addComment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to post comment",
        });
    }
};
exports.addComment = addComment;
const replyComment = async (req, res) => {
    req.body.parentCommentId = req.params.commentId;
    return (0, exports.addComment)(req, res);
};
exports.replyComment = replyComment;
const voteComment = async (req, res) => {
    try {
        const commentId = String(req.params.commentId || "");
        const userId = req.session?.userId || req.body.userId;
        const direction = req.body.direction; // "up" | "down"
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to continue.",
            });
        }
        if (direction !== "up" && direction !== "down") {
            return res.status(400).json({
                success: false,
                message: "Invalid vote direction. Must be 'up' or 'down'",
            });
        }
        // 1. Check runtime dummy comments
        const dummyComm = exports.runtimeDummyComments.find((c) => c.id === commentId || c._id?.toString() === commentId);
        if (dummyComm) {
            const dummyRep = exports.runtimeDummyReports.find((r) => r._id === dummyComm.reportId);
            if (dummyRep && dummyRep.sensitivity && dummyRep.sensitivity.status === "sensitive") {
                return res.status(403).json({
                    success: false,
                    message: "Voting on comments for sensitive grievances is restricted.",
                });
            }
            if (!Array.isArray(dummyComm.upvotes)) {
                dummyComm.upvotes = Array.isArray(dummyComm.likedBy) ? [...dummyComm.likedBy] : [];
            }
            if (!Array.isArray(dummyComm.downvotes)) {
                dummyComm.downvotes = [];
            }
            let userVote = null;
            const upIdx = dummyComm.upvotes.indexOf(userId);
            const downIdx = dummyComm.downvotes.indexOf(userId);
            if (direction === "up") {
                if (upIdx !== -1) {
                    // Toggle off
                    dummyComm.upvotes.splice(upIdx, 1);
                    userVote = null;
                }
                else {
                    // Switch from downvote or new upvote
                    if (downIdx !== -1) {
                        dummyComm.downvotes.splice(downIdx, 1);
                    }
                    dummyComm.upvotes.push(userId);
                    userVote = "up";
                }
            }
            else {
                // direction === "down"
                if (downIdx !== -1) {
                    // Toggle off
                    dummyComm.downvotes.splice(downIdx, 1);
                    userVote = null;
                }
                else {
                    // Switch from upvote or new downvote
                    if (upIdx !== -1) {
                        dummyComm.upvotes.splice(upIdx, 1);
                    }
                    dummyComm.downvotes.push(userId);
                    userVote = "down";
                }
            }
            const score = dummyComm.upvotes.length - dummyComm.downvotes.length;
            dummyComm.likes = dummyComm.upvotes.length;
            dummyComm.likedBy = [...dummyComm.upvotes];
            return res.status(200).json({
                success: true,
                commentId,
                score,
                upvotesCount: dummyComm.upvotes.length,
                downvotesCount: dummyComm.downvotes.length,
                userVote,
                upvotes: dummyComm.upvotes,
                downvotes: dummyComm.downvotes,
                liked: userVote === "up",
                likes: dummyComm.likes,
            });
        }
        // 2. Check MongoDB comment
        if (!commentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }
        const mongoComm = await comment_1.default.findById(commentId);
        if (!mongoComm) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }
        const mongoRep = await report_1.default.findById(mongoComm.reportId).lean();
        if (mongoRep && mongoRep.sensitivity && mongoRep.sensitivity.status === "sensitive") {
            return res.status(403).json({
                success: false,
                message: "Voting on comments for sensitive grievances is restricted.",
            });
        }
        const currentUpvotes = Array.isArray(mongoComm.upvotes)
            ? mongoComm.upvotes
            : Array.isArray(mongoComm.likedBy)
                ? [...mongoComm.likedBy]
                : [];
        const currentDownvotes = Array.isArray(mongoComm.downvotes) ? mongoComm.downvotes : [];
        const hasUpvoted = currentUpvotes.includes(userId);
        const hasDownvoted = currentDownvotes.includes(userId);
        let userVote = null;
        if (direction === "up") {
            if (hasUpvoted) {
                // Toggle off: remove user from upvotes and likedBy
                await comment_1.default.findByIdAndUpdate(commentId, {
                    $pull: { upvotes: userId, likedBy: userId },
                });
                userVote = null;
            }
            else {
                // Remove from downvotes if switching, add to upvotes
                await comment_1.default.findByIdAndUpdate(commentId, {
                    $pull: { downvotes: userId },
                    $addToSet: { upvotes: userId, likedBy: userId },
                });
                userVote = "up";
            }
        }
        else {
            // direction === "down"
            if (hasDownvoted) {
                // Toggle off: remove user from downvotes
                await comment_1.default.findByIdAndUpdate(commentId, {
                    $pull: { downvotes: userId },
                });
                userVote = null;
            }
            else {
                // Remove from upvotes/likedBy if switching, add to downvotes
                await comment_1.default.findByIdAndUpdate(commentId, {
                    $pull: { upvotes: userId, likedBy: userId },
                    $addToSet: { downvotes: userId },
                });
                userVote = "down";
            }
        }
        // Fetch updated document to ensure authoritative persisted state
        const updated = await comment_1.default.findById(commentId);
        const upvotesCount = updated?.upvotes?.length || 0;
        const downvotesCount = updated?.downvotes?.length || 0;
        const score = upvotesCount - downvotesCount;
        // Synchronize legacy likes count field
        await comment_1.default.findByIdAndUpdate(commentId, { $set: { likes: upvotesCount } });
        return res.status(200).json({
            success: true,
            commentId,
            score,
            upvotesCount,
            downvotesCount,
            userVote,
            upvotes: updated?.upvotes || [],
            downvotes: updated?.downvotes || [],
            liked: userVote === "up",
            likes: upvotesCount,
        });
    }
    catch (error) {
        console.error("voteComment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to vote comment",
        });
    }
};
exports.voteComment = voteComment;
// Legacy compatibility endpoint: redirects like to upvote toggle
const likeComment = async (req, res) => {
    req.body.direction = "up";
    return (0, exports.voteComment)(req, res);
};
exports.likeComment = likeComment;
//# sourceMappingURL=chating.controller.js.map