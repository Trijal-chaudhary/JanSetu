import math
from typing import Optional, Tuple

def calculate_haversine_distance_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float]
) -> Optional[float]:
    """
    Calculates geographic distance in kilometers between two GPS coordinates using the Haversine formula.
    Returns None if any coordinate is missing or invalid.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
        
    try:
        lat1_f = float(lat1)
        lon1_f = float(lon1)
        lat2_f = float(lat2)
        lon2_f = float(lon2)
    except (ValueError, TypeError):
        return None
        
    # Boundary checks for valid latitude and longitude
    if not (-90.0 <= lat1_f <= 90.0 and -180.0 <= lon1_f <= 180.0):
        return None
    if not (-90.0 <= lat2_f <= 90.0 and -180.0 <= lon2_f <= 180.0):
        return None
        
    R = 6371.0  # Earth radius in kilometers
    d_lat = math.radians(lat2_f - lat1_f)
    d_lon = math.radians(lon2_f - lon1_f)
    
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1_f))
        * math.cos(math.radians(lat2_f))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)

def compute_bounding_box(
    lat: float,
    lon: float,
    radius_km: float
) -> Tuple[float, float, float, float]:
    """
    Computes (min_lat, max_lat, min_lon, max_lon) for a given radius in kilometers.
    1 deg latitude ~ 111 km.
    1 deg longitude ~ 111 * cos(lat) km.
    """
    delta_lat = radius_km / 111.0
    rad_lat = math.radians(lat)
    cos_lat = math.cos(rad_lat)
    if abs(cos_lat) < 1e-6:
        delta_lon = 180.0
    else:
        delta_lon = radius_km / (111.0 * abs(cos_lat))
        
    min_lat = max(-90.0, lat - delta_lat)
    max_lat = min(90.0, lat + delta_lat)
    min_lon = max(-180.0, lon - delta_lon)
    max_lon = min(180.0, lon + delta_lon)
    
    return min_lat, max_lat, min_lon, max_lon

def calculate_geo_proximity_weight(distance_km: Optional[float], max_radius_km: float) -> float:
    """
    Computes a proximity weight between 0.0 and 1.0 based on physical distance.
    Distance <= 200m gets full weight 1.0.
    Distance up to max_radius_km scales linearly down to 0.0.
    """
    if distance_km is None or max_radius_km <= 0:
        return 0.0
    if distance_km <= 0.2:
        return 1.0
    if distance_km >= max_radius_km:
        return 0.0
    return max(0.0, 1.0 - (distance_km / max_radius_km))
