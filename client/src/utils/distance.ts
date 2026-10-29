/**
 * Distance Calculation Utilities using Haversine Formula
 * Designed for JanSetu Citizen Civic Grievance Portal
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Validates whether latitude and longitude are valid geographical coordinates.
 * Excludes (0, 0) as it represents an uninitialized coordinate rather than a valid civic location.
 * Checks bounds: latitude in [-90, 90], longitude in [-180, 180].
 */
export function isValidCoordinate(lat?: number | null, lon?: number | null): boolean {
  if (typeof lat !== "number" || typeof lon !== "number") {
    return false;
  }
  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return false;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return false;
  }
  // Exclude (0, 0) which represents uninitialized / default placeholder coordinates
  if (Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001) {
    return false;
  }
  return true;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula in kilometers.
 *
 * @param lat1 Latitude of point 1 (-90 to 90)
 * @param lon1 Longitude of point 1 (-180 to 180)
 * @param lat2 Latitude of point 2 (-90 to 90)
 * @param lon2 Longitude of point 2 (-180 to 180)
 * @returns Great-circle distance in kilometers as a floating-point number,
 *          or null if any coordinate is invalid.
 */
export function calculateHaversineDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return null;
  }

  // Safe to assert non-null after isValidCoordinate check
  const latitude1 = lat1 as number;
  const longitude1 = lon1 as number;
  const latitude2 = lat2 as number;
  const longitude2 = lon2 as number;

  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const EARTH_RADIUS_KM = 6371; // Earth's mean spherical radius

  const dLat = toRad(latitude2 - latitude1);
  const dLon = toRad(longitude2 - longitude1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latitude1)) *
      Math.cos(toRad(latitude2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
}

/**
 * Formats a distance in kilometers into a human-friendly string.
 *
 * Requirements:
 * - Less than 1 meter: display "< 1 m" only if calculated distance genuinely warrants it.
 * - Under 1 km: display meters with sensible rounding (e.g., "45 m", "850 m").
 * - At least 1 km: display kilometers with 1 decimal place (e.g., "1.2 km", "7.0 km").
 * - Never returns "0 m".
 * - Returns "Distance unavailable" for null or invalid inputs.
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (
    distanceKm === null ||
    distanceKm === undefined ||
    typeof distanceKm !== "number" ||
    isNaN(distanceKm) ||
    !isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    return "Distance unavailable";
  }

  const meters = distanceKm * 1000;

  // Under 1 meter
  if (meters < 1) {
    return "< 1 m";
  }

  // Under 1 km (1 m to 999 m)
  if (meters < 1000) {
    const roundedMeters = Math.round(meters);
    if (roundedMeters < 1) {
      return "< 1 m";
    }
    return `${roundedMeters} m`;
  }

  // At least 1 kilometer
  return `${distanceKm.toFixed(1)} km`;
}
