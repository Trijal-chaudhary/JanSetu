import { type ReportData } from "../components/Feed/ReportCard";
import { calculateHaversineDistance, isValidCoordinate } from "./distance";

export type CanonicalStatus =
  | "All Statuses"
  | "Reported"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Escalated";

export type SortOption =
  | "latest"
  | "oldest"
  | "supported"
  | "discussed"
  | "attention";

export type DistanceRadius = 1 | 3 | 5 | 10;

/**
 * Normalizes any raw status string into an authoritative canonical status.
 * Handles existing aliases, empty values, and terminal states.
 */
export function getCanonicalStatus(rawStatus: string | null | undefined): CanonicalStatus {
  if (!rawStatus || typeof rawStatus !== "string") {
    return "Reported";
  }

  const s = rawStatus.toLowerCase().trim();
  if (!s) return "Reported";

  if (s.includes("resolve") || s.includes("close")) {
    return "Resolved";
  }
  if (s.includes("reject") || s.includes("escalat")) {
    return "Escalated";
  }
  if (s.includes("review")) {
    return "Under Review";
  }
  if (s.includes("progress")) {
    return "In Progress";
  }
  return "Reported";
}

/**
 * Checks whether a report is currently in an active, unresolved state.
 * Resolved and Escalated/Rejected terminal states return false.
 */
export function isUnresolvedReport(report: ReportData): boolean {
  const status = getCanonicalStatus(report.applicationStatus);
  return status !== "Resolved" && status !== "Escalated";
}

export interface NeedsAttentionBreakdown {
  isUnresolved: boolean;
  ageDays: number;
  supporterCount: number;
  commentCount: number;
  urgencyBoost: number;
  totalScore: number;
}

/**
 * Transparent Needs Attention score calculation:
 * - Unresolved reports receive a base priority of 10,000 points, ensuring they rank strictly above resolved items.
 * - Inactivity weight: 10 points per day since the last update (or creation if updatedAt is missing).
 * - Community support: 20 points per distinct citizen supporter.
 * - Community discussion: 5 points per comment/reply.
 * - Severity/Urgency: 20-120 points if high/critical risk is documented in the report.
 * - Resolved reports are placed below unresolved reports.
 */
export function getNeedsAttentionScore(
  report: ReportData,
  referenceTimeMs: number = Date.now()
): NeedsAttentionBreakdown {
  const isUnresolved = isUnresolvedReport(report);

  // Fallback chain for timestamp: updatedAt -> createdAt -> 0
  const updatedMs = report.updatedAt ? new Date(report.updatedAt).getTime() : NaN;
  const createdMs = report.createdAt ? new Date(report.createdAt).getTime() : NaN;

  let activityTimeMs = !isNaN(updatedMs) && updatedMs > 0 ? updatedMs : 0;
  if (activityTimeMs === 0 && !isNaN(createdMs) && createdMs > 0) {
    activityTimeMs = createdMs;
  }

  const ageMs = activityTimeMs > 0 ? Math.max(0, referenceTimeMs - activityTimeMs) : 0;
  const ageDays = Math.round((ageMs / (1000 * 60 * 60 * 24)) * 10) / 10;

  const supporterCount = Array.isArray(report.supportedBy) ? report.supportedBy.length : 0;
  const commentCount = typeof report.commentCount === "number" && !isNaN(report.commentCount)
    ? report.commentCount
    : 0;

  // Inspect existing riskOrUrgency field if populated
  const urgencyRaw = (report.riskOrUrgency || "").toLowerCase();
  let urgencyBoost = 0;
  if (
    urgencyRaw.includes("fatal") ||
    urgencyRaw.includes("danger") ||
    urgencyRaw.includes("critical") ||
    urgencyRaw.includes("emergency")
  ) {
    urgencyBoost = 120;
  } else if (
    urgencyRaw.includes("high") ||
    urgencyRaw.includes("urgent") ||
    urgencyRaw.includes("severe")
  ) {
    urgencyBoost = 80;
  } else if (urgencyRaw.includes("medium") || urgencyRaw.includes("moderate")) {
    urgencyBoost = 40;
  } else if (urgencyRaw.trim().length > 0) {
    urgencyBoost = 20;
  }

  let totalScore = 0;
  if (isUnresolved) {
    totalScore = 10000 + ageDays * 10 + supporterCount * 20 + commentCount * 5 + urgencyBoost;
  } else {
    // Resolved items get smaller secondary weights to order them gracefully below unresolved
    totalScore = supporterCount * 2 + commentCount;
  }

  return {
    isUnresolved,
    ageDays,
    supporterCount,
    commentCount,
    urgencyBoost,
    totalScore,
  };
}

export interface FilterSortOptions {
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: CanonicalStatus;
  activeTab: "all" | "nearby" | "recent";
  selectedRadiusKm: DistanceRadius;
  userLatitude: number | null;
  userLongitude: number | null;
  sortBy: SortOption;
}

/**
 * Predictable multi-stage pipeline:
 * 1. Text Search
 * 2. Category Filter
 * 3. Status Filter
 * 4. Distance / Location Scope Filter
 * 5. Sorting (Deterministic)
 */
export function filterAndSortReports(
  reports: ReportData[],
  options: FilterSortOptions
): {
  processedReports: ReportData[];
  distancesMap: Map<string, number | null>;
} {
  const {
    searchQuery,
    selectedCategory,
    selectedStatus,
    activeTab,
    selectedRadiusKm,
    userLatitude,
    userLongitude,
    sortBy,
  } = options;

  const hasValidUserLocation = isValidCoordinate(userLatitude, userLongitude);
  const distancesMap = new Map<string, number | null>();

  // Precompute distances for all reports with valid coordinates
  for (const report of reports) {
    if (
      hasValidUserLocation &&
      isValidCoordinate(report.location?.latitude, report.location?.longitude)
    ) {
      const dist = calculateHaversineDistance(
        userLatitude,
        userLongitude,
        report.location?.latitude,
        report.location?.longitude
      );
      distancesMap.set(report._id, dist);
    } else {
      distancesMap.set(report._id, null);
    }
  }

  // 1-4. Apply Filters
  const filtered = reports.filter((report) => {
    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchDesc = (report.problemDescription || "").toLowerCase().includes(q);
      const matchCat = (report.category || "").toLowerCase().includes(q);
      const matchSub = (report.subcategory || "").toLowerCase().includes(q);
      const matchLoc = (report.location?.address || "").toLowerCase().includes(q);
      const matchAuth = (report.serviceOrScheme || "").toLowerCase().includes(q);
      const matchType = (report.issueType || "").toLowerCase().includes(q);
      const matchRes = (report.desiredResolution || "").toLowerCase().includes(q);

      if (
        !matchDesc &&
        !matchCat &&
        !matchSub &&
        !matchLoc &&
        !matchAuth &&
        !matchType &&
        !matchRes
      ) {
        return false;
      }
    }

    // 2. Category Filter
    if (selectedCategory && selectedCategory !== "All Categories") {
      const cat = (report.category || "").toLowerCase();
      const sub = (report.subcategory || "").toLowerCase();
      const desc = (report.problemDescription || "").toLowerCase();
      const type = (report.issueType || "").toLowerCase();

      let isMatch = false;
      if (selectedCategory === "Roads & Pavements") {
        isMatch =
          cat.includes("road") ||
          sub.includes("road") ||
          desc.includes("pothole") ||
          desc.includes("road") ||
          desc.includes("pavement") ||
          type.includes("road");
      } else if (selectedCategory === "Drainage & Sewage") {
        isMatch =
          cat.includes("drain") ||
          sub.includes("drain") ||
          desc.includes("drain") ||
          desc.includes("sewage") ||
          desc.includes("waterlog") ||
          type.includes("drain");
      } else if (selectedCategory === "Streetlights & Power") {
        isMatch =
          cat.includes("light") ||
          sub.includes("light") ||
          desc.includes("light") ||
          desc.includes("power") ||
          desc.includes("electric") ||
          type.includes("light") ||
          type.includes("electric");
      } else if (selectedCategory === "Water Supply") {
        isMatch =
          cat.includes("water") ||
          sub.includes("water") ||
          desc.includes("tap") ||
          type.includes("water");
      } else if (selectedCategory === "Public Health") {
        isMatch =
          cat.includes("health") ||
          sub.includes("health") ||
          desc.includes("sanitation") ||
          desc.includes("garbage") ||
          type.includes("sanitation");
      } else {
        // Direct string inclusion fallback
        isMatch = cat.includes(selectedCategory.toLowerCase()) || sub.includes(selectedCategory.toLowerCase());
      }

      if (!isMatch) return false;
    }

    // 3. Status Filter
    if (selectedStatus && selectedStatus !== "All Statuses") {
      const canonical = getCanonicalStatus(report.applicationStatus);
      if (canonical !== selectedStatus) {
        return false;
      }
    }

    // 4. Location Scope & Distance Filter
    if (activeTab === "nearby") {
      // If user location is not available or report has no valid coordinates,
      // it cannot be established to be within radius
      if (!hasValidUserLocation) {
        return false;
      }
      const dist = distancesMap.get(report._id);
      if (dist === null || dist === undefined || dist > selectedRadiusKm) {
        return false;
      }
    } else if (activeTab === "recent") {
      // Recent filter: issues created within the past 30 days
      const createdMs = report.createdAt ? new Date(report.createdAt).getTime() : 0;
      if (createdMs > 0) {
        const daysDiff = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
          return false;
        }
      }
    }

    return true;
  });

  // 5. Apply Deterministic Sorting without mutating input array
  const sorted = [...filtered].sort((a, b) => {
    const aSupports = Array.isArray(a.supportedBy) ? a.supportedBy.length : 0;
    const bSupports = Array.isArray(b.supportedBy) ? b.supportedBy.length : 0;
    const aComments = typeof a.commentCount === "number" ? a.commentCount : 0;
    const bComments = typeof b.commentCount === "number" ? b.commentCount : 0;

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const safeACreated = isNaN(aCreated) ? 0 : aCreated;
    const safeBCreated = isNaN(bCreated) ? 0 : bCreated;

    if (sortBy === "oldest") {
      // Oldest first
      if (safeACreated !== safeBCreated) {
        return safeACreated - safeBCreated;
      }
      return (a._id || "").localeCompare(b._id || "");
    }

    if (sortBy === "supported") {
      // Most supported first
      if (bSupports !== aSupports) {
        return bSupports - aSupports;
      }
      // Tie breaker: newest first
      if (safeBCreated !== safeACreated) {
        return safeBCreated - safeACreated;
      }
      return (b._id || "").localeCompare(a._id || "");
    }

    if (sortBy === "discussed") {
      // Most discussed first
      if (bComments !== aComments) {
        return bComments - aComments;
      }
      // Tie breaker: newest first
      if (safeBCreated !== safeACreated) {
        return safeBCreated - safeACreated;
      }
      return (b._id || "").localeCompare(a._id || "");
    }

    if (sortBy === "attention") {
      // Needs Attention ranking
      const scoreA = getNeedsAttentionScore(a);
      const scoreB = getNeedsAttentionScore(b);

      // Unresolved issues strictly before resolved
      if (scoreA.isUnresolved !== scoreB.isUnresolved) {
        return scoreA.isUnresolved ? -1 : 1;
      }

      // Higher total score first
      if (scoreB.totalScore !== scoreA.totalScore) {
        return scoreB.totalScore - scoreA.totalScore;
      }

      // Tie breaker 1: older activity/creation first (waiting longer)
      if (safeACreated !== safeBCreated) {
        return safeACreated - safeBCreated;
      }

      return (b._id || "").localeCompare(a._id || "");
    }

    // Default "latest": newest reports first
    if (safeBCreated !== safeACreated) {
      return safeBCreated - safeACreated;
    }
    return (b._id || "").localeCompare(a._id || "");
  });

  return {
    processedReports: sorted,
    distancesMap,
  };
}

export interface NearbyIssueItem {
  report: ReportData;
  distanceKm: number;
}

/**
 * Filters and sorts issues for the Nearby Issues sidebar panel:
 * - Requires a valid user location.
 * - Only includes reports with valid coordinates.
 * - Excludes issues beyond selectedRadiusKm.
 * - Sorts strictly by ascending geographic distance (closest first).
 * - Deterministic tie-breaking: newer creation date, then stable _id.
 * - Limits to maxCount (default 5).
 */
export function getEligibleNearbyIssues(
  reports: ReportData[],
  userLatitude: number | null,
  userLongitude: number | null,
  selectedRadiusKm: number,
  maxCount: number = 5
): NearbyIssueItem[] {
  if (
    !isValidCoordinate(userLatitude, userLongitude) ||
    !Array.isArray(reports) ||
    !reports.length
  ) {
    return [];
  }

  const eligible: NearbyIssueItem[] = [];

  for (const report of reports) {
    if (isValidCoordinate(report.location?.latitude, report.location?.longitude)) {
      const distance = calculateHaversineDistance(
        userLatitude,
        userLongitude,
        report.location?.latitude,
        report.location?.longitude
      );

      if (distance !== null && distance <= selectedRadiusKm) {
        eligible.push({ report, distanceKm: distance });
      }
    }
  }

  // Sort by ascending geographic distance (closest first)
  eligible.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    // Tie breaker 1: newer creation time first
    const aCreated = a.report.createdAt ? new Date(a.report.createdAt).getTime() : 0;
    const bCreated = b.report.createdAt ? new Date(b.report.createdAt).getTime() : 0;
    if (bCreated !== aCreated) {
      return bCreated - aCreated;
    }
    // Tie breaker 2: stable _id
    return (a.report._id || "").localeCompare(b.report._id || "");
  });

  return eligible.slice(0, maxCount);
}

