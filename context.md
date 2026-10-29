# JanSetu Architecture & Implementation Context

> **Note for AI Models & Developers**: This document serves as the persistent system context for the JanSetu project. Whenever updating models, controllers, datasets, or UI components, consult this context to ensure backward compatibility and preserve system architecture.

---

## 1. Project Overview & Architecture

**JanSetu** is an AI-powered public grievance redressal and civic assistance platform. It consists of three primary modules:

1. **Citizen Portal (`client/`)**: Citizen-facing web application for filing grievances, tracking status, upvoting community issues, and conversing with the JanSetu AI Assistant.
2. **Department Portal (`depart/`)**: Official government authority portal where department officials log in, inspect grievances assigned to their department/location, and update grievance statuses.
3. **Backend Server (`server/`)**: Express.js + TypeScript server handling REST APIs, session authentication, Groq AI LLM integration, MongoDB database persistence, and spatial report routing.

---

## 2. Core Models & Data Structures

### A. Report Model (`server/src/model/report.ts`)
MongoDB schema (`reportDetails`) representing citizen grievances:
- `category` *(String)*: Top-level category (e.g., `Public Infrastructure`, `Administrative Processes`, `Welfare Schemes`, `Education`, `Public Safety`).
- `subcategory` *(String)*: Specific subcategory defined in `reqInfo.json`.
- `problemDescription` *(String)*: Detailed citizen grievance text.
- `location` *(Object)*: `{ address: string, latitude: number, longitude: number }`.
- `issueType` *(String)*: Specific classification of defect/issue.
- `serviceOrScheme` *(String)*: Government department, scheme, or service involved.
- `relevantDateOrDuration` *(String)*: Timeline/duration of the issue.
- `applicationStatus` *(String)*: Official status (`Reported`, `Under Review`, `In Progress`, `Resolved`, `Rejected`).
- `evidence` *(Array)*: Uploaded photo/video evidence objects/URLs.
- `riskOrUrgency` *(String)*: Urgency level flagged by citizen or AI.
- `impact` *(String)*: Description of community impact.
- `desiredResolution` *(String)*: Resolution requested by citizen.
- `affectedPeople` *(String)*: Estimated count of affected individuals.
- `supportedBy` *(Array of Strings)*: Array of user IDs who upvoted the report.
- `createdBy` *(String)*: Creator citizen ID.
- `createdAt` / `updatedAt` *(Date Timestamps)*.

### B. Department Data (`server/src/data/departmentData.json`)
Authoritative registry of official government department accounts.

#### Category Configuration Rules:
1. **Public Infrastructure**: Location-specific system supporting **multiple department accounts**. Each department has explicit geographical coordinates (`latitude`, `longitude`) and a `radiusKm` (10 KM service radius).
2. **Other Categories** (`Administrative Processes`, `Welfare Schemes`, `Education`, `Public Safety`): Single department account per category responsible for all category reports across the jurisdiction.

---

## 3. Department Credentials & Service Radius Matrix

| Department ID | Category | Username | Password | Location / Zone | Lat, Lng | Radius |
|---|---|---|---|---|---|---|
| `dept_infra_kp2` | Public Infrastructure | `trijal` | `1234` | Knowledge Park II, Greater Noida | 28.4682, 77.5180 | 10 KM |
| `dept_infra_noida62` | Public Infrastructure | `pwd_noida` | `PwdPass@2026` | Sector 62, Noida | 28.6250, 77.3730 | 10 KM |
| `dept_infra_gnwest` | Public Infrastructure | `infra_gnwest` | `InfraPass@2026` | Gaur City, Greater Noida West | 28.5855, 77.4385 | 10 KM |
| `dept_admin_01` | Administrative Processes | `admin_kp2` | `AdminPass@2026` | Knowledge Park II, Greater Noida | 28.4615, 77.5132 | All |
| `dept_welfare_01` | Welfare Schemes | `welfare_kp2` | `WelfarePass@2026` | Knowledge Park II, Greater Noida | 28.4620, 77.5140 | All |
| `dept_edu_01` | Education | `edu_kp2` | `EduPass@2026` | Knowledge Park II, Greater Noida | 28.4635, 77.5090 | All |
| `dept_safety_01` | Public Safety | `safety_kp2` | `SafetyPass@2026` | Knowledge Park II, Greater Noida | 28.4650, 77.5120 | All |

---

## 4. Location-Based Report Visibility & Access Control Engine

### A. Distance Calculation Algorithm (Haversine Formula)
Located in `server/src/controllers/depart.controller.ts`:
```ts
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### B. Server-Side Report Filtering (`GET /api/depart/reports`)
1. **Authentication**: Identifies the exact department account using `req.session.departId`.
2. **Category & Subcategory Matching**: Filters reports matching department category and authorized subcategories.
3. **Location Radius Enforcer**:
   - For **Public Infrastructure**: Calculates geographical distance between department `(latitude, longitude)` and report `(latitude, longitude)`.
   - Returns ONLY reports where `distanceKm <= 10 KM`. Reports outside this 10 KM radius are filtered out on the server side prior to returning response JSON.
   - For **Other Categories**: Returns all category reports without spatial distance restrictions.

### C. Server-Side Report Update Validation (`PUT /api/depart/reports/:reportId/status`)
1. **Authentication Verification**: Verifies active session department identity.
2. **Category Authorization**: Validates that target report belongs to department's authorized category.
3. **Spatial Authorization**: For Public Infrastructure, calculates report distance. If report distance > 10 KM from department location, server rejects request with HTTP 403 Forbidden: `"Unauthorized action: Report location exceeds your department's 10 KM service radius."`
4. **Persistence**: Saves updated `applicationStatus` to MongoDB (`reportDetails`) or runtime state (`runtimeDummyReports`).

---

## 5. Client Application & API Contracts Integrity

- **Citizen Application (`client/`)**: Preserved without breaking changes. Existing citizen report creation, category selection, location mapping, and upvoting workflows operate seamlessly.
- **Backward Compatibility**: API endpoints for citizens remain untouched. Department-specific endpoints (`/api/depart/*`) use session-based authentication and strict server-side validation.

---

## 6. Guidelines for Future System Enhancements

1. **Adding New Public Infrastructure Departments**: Add entry to `server/src/data/departmentData.json` with `category: "Public Infrastructure"`, unique `departmentId`, `username`, `password`, and `location` containing `latitude`, `longitude`, and `radiusKm: 10`. No code changes required in controllers.
2. **Modifying Report Schema**: Update `server/src/model/report.ts` cleanly. Ensure `applicationStatus` and `location` object remain present.
3. **Documentation Persistence**: Whenever modifying backend models or department logic, update `context.md` to reflect latest system state.

---

## 7. Phase 7: Historical Vectorization & Semantic Clustering

- **Python Semantic Service (`python-services/`)**: FastAPI + ChromaDB microservice handling document embeddings, spatial distance calculations, vector search, and candidate ranking. Accessible only internally via HTTP from Node.js with `X-Internal-API-Key`.
- **Strict Boundaries**: Node.js is the sole service accessing MongoDB. Python is the sole service accessing ChromaDB. React never contacts Python directly.
- **Real-Time Clustering**: Applied specifically to `Public Infrastructure`. Triggers during report submission to find eligible nearby grievances. Citizens can endorse/support an existing issue or proceed to report a distinct issue.
- **Historical Vectorization Script**: `npm run vectorize` in `server/` reads MongoDB and backend JSON datasets, deduplicates records, and batches them into ChromaDB idempotently.

---

## 8. Groq-Powered Sensitivity Classification & Submission Pipeline

- **Authoritative Classification**: Evaluates every grievance draft through a shared Groq service (`server/src/services/classificationService.ts`) powered by `openai/gpt-oss-120b`.
- **Classification Statuses**: Strict runtime contract enforcing exactly `sensitive` or `non_sensitive` (no `not_assessed` or `pending_review`).
- **Sequencing & citizen Confirmation**:
  1. AI Mode / Manual Mode collects grievance details into structured draft.
  2. Citizen is routed to the dedicated Review Page (`/sensitivity-review`).
  3. Groq performs sensitivity classification with clear loading states (`State A`).
  4. Citizen inspects the classification status, validated explanation, and visibility implications (`State B`).
  5. Citizen explicitly clicks **Submit Grievance**.
  6. Backend verifies draft integrity, content hash, and authoritative classification.
  7. Semantic clustering and duplicate detection are initiated ONLY after citizen confirmation.
  8. If eligible candidates are discovered, the citizen can endorse an existing issue or confirm submission of a new issue.
- **Access Control & Visibility Enforcement**:
  - `sensitive` reports are excluded from the public community feed (`GET /api/getReports`), semantic search suggestions, and public comments/support.
  - `sensitive` reports are accessible solely to the creating citizen (`req.session.userId`) and assigned, authorized department authorities (`req.session.departId`).
  - Sensitive reports are never synchronized to ChromaDB public vector index.
  - Legacy historical records without sensitivity classification are excluded from public community feed by default.

