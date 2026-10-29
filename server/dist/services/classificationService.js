"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASSIFICATION_MODEL = exports.CLASSIFICATION_VERSION = void 0;
exports.computeDraftContentHash = computeDraftContentHash;
exports.validateClassificationOutput = validateClassificationOutput;
exports.classifyGrievance = classifyGrievance;
const crypto_1 = __importDefault(require("crypto"));
const groq_config_1 = __importDefault(require("../config/groq.config"));
exports.CLASSIFICATION_VERSION = "1.0.0";
exports.CLASSIFICATION_MODEL = "openai/gpt-oss-120b";
const toCleanStr = (val) => {
    if (typeof val === "string")
        return val.trim().toLowerCase();
    if (val !== null && val !== undefined)
        return String(val).trim().toLowerCase();
    return "";
};
/**
 * Computes a deterministic SHA-256 hash of the grievance content fields.
 * If any of these fields change after classification, the previous classification is invalidated.
 */
function computeDraftContentHash(data) {
    if (!data || typeof data !== "object")
        return "";
    const normalizedPayload = {
        category: toCleanStr(data.category),
        subcategory: toCleanStr(data.subcategory),
        problemDescription: toCleanStr(data.problemDescription),
        issueType: toCleanStr(data.issueType),
        serviceOrScheme: toCleanStr(data.serviceOrScheme),
        relevantDateOrDuration: toCleanStr(data.relevantDateOrDuration),
        impact: toCleanStr(data.impact),
        riskOrUrgency: toCleanStr(data.riskOrUrgency),
        desiredResolution: toCleanStr(data.desiredResolution),
        affectedPeople: toCleanStr(data.affectedPeople),
        locationAddress: toCleanStr(data.location?.address),
        evidenceCount: Array.isArray(data.evidence) ? data.evidence.length : 0,
    };
    return crypto_1.default
        .createHash("sha256")
        .update(JSON.stringify(normalizedPayload))
        .digest("hex");
}
function extractJsonFromLlmResponse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
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
            throw new Error("Unable to parse Groq AI response as JSON");
        }
    }
}
/**
 * Validates raw Groq output against the strict classification schema.
 * Rejects any unknown status, missing reason, or malformed payload.
 */
function validateClassificationOutput(output) {
    if (!output || typeof output !== "object") {
        throw new Error("Invalid classification output: response must be a JSON object.");
    }
    let { status, reason } = output;
    if (typeof status === "string") {
        const normalized = status.trim().toLowerCase().replace("-", "_");
        if (normalized === "sensitive" || normalized === "non_sensitive") {
            status = normalized;
        }
    }
    if (status !== "sensitive" && status !== "non_sensitive") {
        throw new Error(`Invalid classification status: "${status}". Must be exactly "sensitive" or "non_sensitive".`);
    }
    if (typeof reason !== "string" || !reason.trim()) {
        throw new Error("Invalid classification reason: reason must be a non-empty string.");
    }
    return {
        status,
        reason: reason.trim(),
    };
}
/**
 * Reusable backend classification service invoking Groq LLM.
 * Classifies any grievance from AI Mode or Manual Mode.
 */
async function classifyGrievance(draft) {
    const contentToAssess = {
        category: draft.category || "Unspecified",
        subcategory: draft.subcategory || "Unspecified",
        problemDescription: draft.problemDescription || "No description provided",
        issueType: draft.issueType || "Unspecified",
        serviceOrScheme: draft.serviceOrScheme || "Unspecified",
        relevantDateOrDuration: draft.relevantDateOrDuration || "Unspecified",
        impact: draft.impact || "Unspecified",
        riskOrUrgency: draft.riskOrUrgency || "Unspecified",
        desiredResolution: draft.desiredResolution || "Unspecified",
        evidenceCount: Array.isArray(draft.evidence) ? draft.evidence.length : 0,
        locationAddress: draft.location?.address || "Unspecified",
    };
    const systemPrompt = `You are the JanSetu Civic Grievance Privacy & Sensitivity Classification Engine.
Your task is to classify whether a citizen grievance is "sensitive" or "non_sensitive" for community visibility.

CLASSIFICATION RULES:

1. SENSITIVE:
Assign "status": "sensitive" if the grievance involves ANY of the following:
- Allegations of bribery, corruption, extortion, kickbacks, or illicit monetary demands involving an identifiable government employee, official, or contractor.
- Allegations of harassment, sexual misconduct, physical threats, verbal abuse, discrimination, or serious personal misconduct involving an identifiable individual.
- Complaints containing confidential medical history, financial account numbers, Aadhaar/PAN/passport numbers, passwords, or personal identity documents.
- Reports exposing victims, whistleblowers, witnesses, or complainants to a meaningful risk of retaliation, violence, or intimidation.
- Sensitive grievances containing private allegations that should be restricted to the citizen and authorized department personnel.

2. NON-SENSITIVE:
Assign "status": "non_sensitive" if the grievance involves public-interest civic or municipal matters, including:
- Damaged roads, potholes, broken sidewalks, and paving defects.
- Broken streetlights, dark public alleys, and power line maintenance.
- Blocked drainage systems, sewage overflow, and open manholes.
- Irregular, low-pressure, or contaminated municipal water supply.
- Missing or damaged public infrastructure (parks, public transit stops, garbage bins).
- General administrative delays (e.g. routine certificate processing delays) without allegations of bribery or personal misconduct against specific identifiable persons.
- General civic service shortages suitable for community discussion and public support.

GUIDELINES FOR REASON:
- Assess the actual content and context, not just the category name.
- Distinguish general systemic failures from direct allegations against identifiable individuals.
- Provide a clear, objective, professional explanation (1 to 2 sentences) describing WHY it was classified as sensitive or non-sensitive.
- DO NOT reveal or repeat specific private allegations, phone numbers, or individual names in the public-facing explanation.

OUTPUT CONTRACT:
Return ONLY a valid JSON object matching this schema:
{
  "status": "sensitive" | "non_sensitive",
  "reason": "Clear, professional explanation of the sensitivity determination."
}`;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is missing from environment. Please verify server/.env.");
    }
    const completion = await groq_config_1.default.chat.completions.create({
        model: exports.CLASSIFICATION_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(contentToAssess) },
        ],
        temperature: 0.1,
        max_completion_tokens: 350,
        response_format: { type: "json_object" },
    });
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
        throw new Error("Groq returned an empty response during sensitivity classification.");
    }
    const parsed = extractJsonFromLlmResponse(rawContent);
    const validated = validateClassificationOutput(parsed);
    return {
        status: validated.status,
        reason: validated.reason,
        classifiedAt: new Date(),
        classificationVersion: exports.CLASSIFICATION_VERSION,
    };
}
//# sourceMappingURL=classificationService.js.map