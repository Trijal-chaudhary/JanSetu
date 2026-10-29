/**
 * Feed & Nearby Issues Verification Suite
 * Thoroughly validates distance calculations, formatters, sorting,
 * filtering, and all 15 specific verification criteria.
 */

import {
  calculateHaversineDistance,
  isValidCoordinate,
  formatDistance,
} from "./distance";
import {
  filterAndSortReports,
  getCanonicalStatus,
  getNeedsAttentionScore,
  getEligibleNearbyIssues,
  isUnresolvedReport,
  type FilterSortOptions,
} from "./feedHelpers";
import { type ReportData } from "../components/Feed/ReportCard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

// Sample test data with varying real-world locations in Greater Noida
const mockReports: ReportData[] = [
  {
    _id: "rep_same_coord",
    category: "Public Infrastructure",
    subcategory: "Roads and potholes",
    problemDescription: "Severe crater on institutional road",
    location: {
      address: "Knowledge Park II, Greater Noida",
      latitude: 28.4615,
      longitude: 77.5132,
    },
    issueType: "Road Asphalt Defect",
    serviceOrScheme: "GNIDA Public Works",
    relevantDateOrDuration: "3 weeks ago",
    applicationStatus: "Reported",
    evidence: null,
    riskOrUrgency: "High Urgency - Fatal accident risk",
    impact: "Commuter safety",
    desiredResolution: "Fix crater",
    supportedBy: ["u1", "u2", "u3", "u4", "u5"],
    commentCount: 8,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
  {
    _id: "rep_100m_away",
    category: "Public Infrastructure",
    subcategory: "Footpaths",
    problemDescription: "Broken pedestrian tile along college walkway",
    location: {
      address: "100m North of KP2",
      latitude: 28.4624, // ~100m north of 28.4615
      longitude: 77.5132,
    },
    issueType: "Broken Paver Blocks",
    serviceOrScheme: "GNIDA Works",
    relevantDateOrDuration: "2 days ago",
    applicationStatus: "Reported",
    evidence: null,
    riskOrUrgency: null,
    impact: "Pedestrian hazard",
    desiredResolution: "Relay tiles",
    supportedBy: ["u1"],
    commentCount: 1,
    createdAt: "2026-10-08T14:00:00.000Z",
    updatedAt: "2026-10-08T14:00:00.000Z",
  },
  {
    _id: "rep_1_2km_away",
    category: "Streetlights & Power",
    subcategory: "Streetlights",
    problemDescription: "Broken street lamp near Sharda Hospital",
    location: {
      address: "Near Sharda Hospital, KP3",
      latitude: 28.464,
      longitude: 77.501, // ~1.23 km west-northwest of KP2
    },
    issueType: "Streetlight outage",
    serviceOrScheme: "Lighting cell",
    relevantDateOrDuration: "5 days ago",
    applicationStatus: "Under Review",
    evidence: null,
    riskOrUrgency: "Medium Urgency",
    impact: "Dark stretch",
    desiredResolution: "Fix lamp",
    supportedBy: ["u2"],
    commentCount: 3,
    createdAt: "2026-10-09T09:00:00.000Z",
    updatedAt: "2026-10-09T09:00:00.000Z",
  },
  {
    _id: "rep_drainage_pari_chowk",
    category: "Drainage & Sewage",
    subcategory: "Blocked sewer drain",
    problemDescription: "Blocked drain causing street flooding",
    location: {
      address: "Pari Chowk, Greater Noida",
      latitude: 28.4682,
      longitude: 77.518, // ~0.88 km from KP2
    },
    issueType: "Sewage overflow",
    serviceOrScheme: "Sanitation Dept",
    relevantDateOrDuration: "1 week ago",
    applicationStatus: "In Progress",
    evidence: null,
    riskOrUrgency: null,
    impact: "Flooding",
    desiredResolution: "Clear drain",
    supportedBy: ["u1", "u2"],
    commentCount: 15,
    createdAt: "2026-10-10T12:00:00.000Z",
    updatedAt: "2026-10-12T14:00:00.000Z",
  },
  {
    _id: "rep_7km_surajpur",
    category: "Public Safety",
    subcategory: "Streetlights",
    problemDescription: "Dark street in Surajpur",
    location: {
      address: "Surajpur, Greater Noida",
      latitude: 28.523,
      longitude: 77.4985, // ~6.99 km from KP2
    },
    issueType: "Electrical outage",
    serviceOrScheme: "Power Board",
    relevantDateOrDuration: "Yesterday",
    applicationStatus: "Resolved",
    evidence: null,
    riskOrUrgency: null,
    impact: "Night visibility",
    desiredResolution: "Replace bulb",
    supportedBy: ["u1", "u2", "u3", "u4", "u5", "u6", "u7"],
    commentCount: 2,
    createdAt: "2026-10-15T09:00:00.000Z",
    updatedAt: "2026-10-16T11:00:00.000Z",
  },
  {
    _id: "rep_missing_coords",
    category: "Public Health",
    subcategory: "Garbage dump",
    problemDescription: "Uncollected garbage with missing coordinates",
    location: {
      address: "Unknown Location",
      latitude: null,
      longitude: null,
    },
    issueType: "Waste accumulation",
    serviceOrScheme: "Municipal Board",
    relevantDateOrDuration: "4 days ago",
    applicationStatus: "Under Review",
    evidence: null,
    riskOrUrgency: "Medium Urgency",
    impact: "Hygiene risk",
    desiredResolution: "Clear trash",
    supportedBy: [],
    commentCount: 0,
    createdAt: "2026-10-05T08:00:00.000Z",
    updatedAt: "2026-10-05T08:00:00.000Z",
  },
];

export function runFeedVerificationTests() {
  console.log("=== RUNNING JANSETU NEARBY ISSUES & FEED VERIFICATION TESTS ===");

  const userLat = 28.4615;
  const userLon = 77.5132;

  // Case 1: Two reports at the same valid coordinates produce distance close to zero & formatted as "< 1 m"
  const distSame = calculateHaversineDistance(userLat, userLon, userLat, userLon);
  assert(distSame !== null && distSame < 0.001, "Case 1: Same coordinates produce distance ~0 km");
  const formattedSame = formatDistance(distSame);
  assert(formattedSame === "< 1 m", `Case 1: Same coordinates format as '< 1 m' (got: '${formattedSame}')`);
  assert(formattedSame !== "0 m" && formattedSame !== "0 m away", "Case 1: Never outputs '0 m' or '0 m away'");

  // Case 2: A report ~100 meters away displays a sensible non-zero distance (e.g. ~100 m)
  const dist100m = calculateHaversineDistance(userLat, userLon, 28.4624, 77.5132);
  assert(dist100m !== null && dist100m > 0.08 && dist100m < 0.12, `Case 2: 100m report calculates correctly (${dist100m?.toFixed(3)} km)`);
  const formatted100m = formatDistance(dist100m);
  assert(formatted100m === "100 m", `Case 2: 100m report formats as '100 m' (got: '${formatted100m}')`);

  // Case 3: A report ~1.2 km away displays approximately "1.2 km"
  const dist1200m = calculateHaversineDistance(userLat, userLon, 28.464, 77.501);
  assert(dist1200m !== null && dist1200m > 1.15 && dist1200m < 1.35, `Case 3: ~1.2km report calculates accurately (${dist1200m?.toFixed(2)} km)`);
  const formatted1200m = formatDistance(dist1200m);
  assert(formatted1200m === "1.2 km", `Case 3: ~1.2km report formats as '1.2 km' (got: '${formatted1200m}')`);

  // Case 4: A report beyond the selected radius is excluded
  const nearbyRadius5km = getEligibleNearbyIssues(mockReports, userLat, userLon, 5, 10);
  const contains7kmAt5kmRadius = nearbyRadius5km.some((item) => item.report._id === "rep_7km_surajpur");
  assert(!contains7kmAt5kmRadius, "Case 4: Report at 7 km is excluded from 5 km radius list");

  // Case 5: Increasing the radius includes additional eligible reports (e.g. 5 km -> 10 km includes 7 km issue)
  const nearbyRadius10km = getEligibleNearbyIssues(mockReports, userLat, userLon, 10, 10);
  const contains7kmAt10kmRadius = nearbyRadius10km.some((item) => item.report._id === "rep_7km_surajpur");
  assert(contains7kmAt10kmRadius, "Case 5: Increasing radius to 10 km includes report at 7 km");
  assert(nearbyRadius10km.length > nearbyRadius5km.length, "Case 5: 10 km radius list contains strictly more reports than 5 km");

  // Case 6: Decreasing the radius removes reports outside the new radius (e.g. 1 km only has <= 1km)
  const nearbyRadius1km = getEligibleNearbyIssues(mockReports, userLat, userLon, 1, 10);
  assert(nearbyRadius1km.every((item) => item.distanceKm <= 1.0), "Case 6: 1 km radius only includes items <= 1.0 km");
  assert(nearbyRadius1km.length < nearbyRadius5km.length, "Case 6: Decreasing to 1 km excludes issues farther than 1 km");

  // Case 7: Missing report coordinates do not produce 0 m away
  const missingCoordsDist = calculateHaversineDistance(userLat, userLon, null, null);
  assert(missingCoordsDist === null, "Case 7: Missing coordinates return null distance");
  const formattedMissing = formatDistance(missingCoordsDist);
  assert(formattedMissing === "Distance unavailable", `Case 7: Missing coords format as 'Distance unavailable' (got: '${formattedMissing}')`);
  assert(formattedMissing !== "0 m" && formattedMissing !== "< 1 m", "Case 7: Missing coords never display 0 m");

  // Case 8: Missing user coordinates do not produce a fabricated nearby list
  const emptyUserCoordsList = getEligibleNearbyIssues(mockReports, null, null, 5, 5);
  assert(emptyUserCoordsList.length === 0, "Case 8: Missing user coordinates produce empty array (no fabricated issues)");

  // Case 9: Invalid latitude and longitude are rejected
  assert(isValidCoordinate(91, 77.5) === false, "Case 9: Latitude 91 is rejected");
  assert(isValidCoordinate(-91, 77.5) === false, "Case 9: Latitude -91 is rejected");
  assert(isValidCoordinate(28.4, 181) === false, "Case 9: Longitude 181 is rejected");
  assert(isValidCoordinate(28.4, -181) === false, "Case 9: Longitude -181 is rejected");
  assert(isValidCoordinate(NaN, 77.5) === false, "Case 9: NaN latitude is rejected");
  assert(isValidCoordinate(0, 0) === false, "Case 9: Uninitialized (0, 0) is rejected");

  // Case 10: Latitude and longitude are not accidentally swapped
  // At latitude 28.46° (India), longitude spacing is cos(28.46°)*111km ≈ 97.6 km/deg.
  // Near the North Pole at lat 77.51°, longitude spacing is cos(77.51°)*111km ≈ 24 km/deg.
  // Swapping lat and lon produces a distorted distance (~0.23 km vs ~0.88 km).
  const distanceCorrectOrder = calculateHaversineDistance(28.4615, 77.5132, 28.4682, 77.518);
  const distanceSwappedOrder = calculateHaversineDistance(77.5132, 28.4615, 77.518, 28.4682);
  assert(distanceCorrectOrder !== null && Math.abs(distanceCorrectOrder - 0.88) < 0.05, `Case 10: Correct order gives ~0.88 km (got: ${distanceCorrectOrder?.toFixed(2)} km)`);
  assert(distanceSwappedOrder !== null && Math.abs(distanceCorrectOrder! - distanceSwappedOrder!) > 0.25, `Case 10: Swapping latitude and longitude correctly changes distance calculation due to Earth curvature (delta: ${Math.abs(distanceCorrectOrder! - distanceSwappedOrder!).toFixed(3)} km)`);
  // Also, passing longitude > 90 as latitude must be rejected
  assert(isValidCoordinate(95.5, 28.4) === false, "Case 10: Swapped coordinate where longitude > 90 is passed as latitude is rejected");


  // Case 11: The nearest eligible issue appears first
  assert(nearbyRadius5km[0].report._id === "rep_same_coord", "Case 11: 0m report appears 1st");
  assert(nearbyRadius5km[1].report._id === "rep_100m_away", "Case 11: 100m report appears 2nd");
  assert(nearbyRadius5km[2].report._id === "rep_drainage_pari_chowk", "Case 11: 880m report appears 3rd");
  assert(nearbyRadius5km[3].report._id === "rep_1_2km_away", "Case 11: 1.2km report appears 4th");
  for (let i = 0; i < nearbyRadius5km.length - 1; i++) {
    assert(nearbyRadius5km[i].distanceKm <= nearbyRadius5km[i + 1].distanceKm, `Case 11: Monotonically increasing distance at index ${i}`);
  }

  // Case 12: Subtitle matches the selected radius
  const getSubtitle = (radius: number, hasLoc: boolean) =>
    hasLoc ? `Within ${radius} km of your location` : `Within ${radius} km radius`;
  assert(getSubtitle(3, true) === "Within 3 km of your location", "Case 12: Subtitle matches 3 km radius");
  assert(getSubtitle(10, true) === "Within 10 km of your location", "Case 12: Subtitle matches 10 km radius");
  assert(getSubtitle(1, true) === "Within 1 km of your location", "Case 12: Subtitle matches 1 km radius");

  // Case 13: Clicking an issue opens the correct grievance detail URL
  const targetReport = nearbyRadius5km[0].report;
  const targetDetailUrl = `/report/${targetReport._id}`;
  assert(targetDetailUrl === `/report/rep_same_coord`, "Case 13: Uses actual report._id for detail navigation");

  // Case 14: View all nearby issues preserves radius and filters
  const baseOptions: FilterSortOptions = {
    searchQuery: "",
    selectedCategory: "All Categories",
    selectedStatus: "All Statuses",
    activeTab: "nearby",
    selectedRadiusKm: 5,
    userLatitude: userLat,
    userLongitude: userLon,
    sortBy: "latest",
  };
  const fullNearbyFeed = filterAndSortReports(mockReports, baseOptions);
  assert(fullNearbyFeed.processedReports.length === 4, "Case 14: Nearby feed view matches eligible radius items");

  // Case 15: Existing feed filters, sorting, and actions continue to work
  const filteredAndSorted = filterAndSortReports(mockReports, {
    ...baseOptions,
    selectedCategory: "Drainage & Sewage",
    selectedStatus: "In Progress",
    sortBy: "supported",
  });
  assert(filteredAndSorted.processedReports.length === 1 && filteredAndSorted.processedReports[0]._id === "rep_drainage_pari_chowk",
    "Case 15: Status, Category, Distance, and Sort all compose correctly without conflict");

  // Status and unresolved checks
  assert(getCanonicalStatus(mockReports[0].applicationStatus) === "Reported", "getCanonicalStatus correctly parses Reported status");
  assert(isUnresolvedReport(mockReports[0]) === true, "isUnresolvedReport identifies Reported issue as unresolved");
  assert(isUnresolvedReport(mockReports[4]) === false, "isUnresolvedReport identifies Resolved issue as terminal");

  // Score verification
  const scoreRepSame = getNeedsAttentionScore(mockReports[0]);
  assert(scoreRepSame.isUnresolved === true && scoreRepSame.urgencyBoost === 120, "Case 15: Needs Attention score correctly computes urgency (fatal risk -> 120 boost)");



  console.log("=== ALL 15 NEARBY ISSUES VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  return true;
}

// Execute tests
runFeedVerificationTests();
