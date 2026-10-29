import React, { useState } from "react";
import { MapPin, Navigation, Search, Check, Edit2, AlertCircle, Loader2 } from "lucide-react";
import LocationMap from "../Map/LocationMap";
import "./LocationCard.css";

export interface LocationData {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface LocationCardProps {
  initialLocation?: LocationData | null;
  isConfirmed?: boolean;
  onLocationFetch?: (location: {
    address: string | null;
    latitude: number;
    longitude: number;
  }) => void;
  onLocationConfirm?: (location: LocationData) => void;
  onEdit?: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  initialLocation,
  isConfirmed: initialIsConfirmed = false,
  onLocationFetch,
  onLocationConfirm,
  onEdit,
}) => {
  const [address, setAddress] = useState(initialLocation?.address || "");
  const [latitude, setLatitude] = useState<number | null>(initialLocation?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialLocation?.longitude ?? null);

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(initialIsConfirmed);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // 1. Fetch live device location
  const handleFetchCurrentLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter the address manually below.");
      return;
    }

    setLoadingGeo(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        let fetchedAddr: string | null = null;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          if (response.ok) {
            const result = await response.json();
            fetchedAddr = result.display_name ?? null;
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        }

        const resolvedAddress = fetchedAddr || address || `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(resolvedAddress);
        setLoadingGeo(false);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        let msg = "Unable to access your device location. Please allow location access or type your address manually below.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = "Location permission was denied. You can still type the address or landmark manually.";
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = "Location request timed out. Please enter your location manually.";
        }
        setError(msg);
        setLoadingGeo(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // 2. Search address using OpenStreetMap Nominatim
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address.trim()) {
      setError("Please enter an address or locality name to search.");
      return;
    }

    setError("");
    setSearching(true);
    try {
      const query = encodeURIComponent(address.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
      );
      if (!response.ok) throw new Error("Search service failed");
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        setLatitude(parseFloat(item.lat));
        setLongitude(parseFloat(item.lon));
        setAddress(item.display_name || address);
      } else {
        setError("Location not found on map. You can still confirm your typed address.");
      }
    } catch (err) {
      console.error("Address search error:", err);
      setError("Unable to search address. You can still confirm your typed address.");
    } finally {
      setSearching(false);
    }
  };

  // 3. Confirm and save location
  const handleConfirm = () => {
    if (!address.trim() && (latitude === null || longitude === null)) {
      setError("Please provide an address or use your current location.");
      return;
    }

    const locationPayload = {
      address: address.trim() || null,
      latitude,
      longitude,
    };

    setConfirmed(true);

    if (onLocationConfirm) {
      onLocationConfirm(locationPayload);
    }

    // Call legacy onLocationFetch if provided and coordinates exist
    if (onLocationFetch && latitude !== null && longitude !== null) {
      onLocationFetch({
        address: address.trim() || null,
        latitude,
        longitude,
      });
    }
  };

  // 4. Render confirmed state (clean, compact, trustworthy)
  if (confirmed) {
    return (
      <div className="location-card-confirmed">
        <div className="location-confirmed-header">
          <div className="location-confirmed-badge">
            <Check size={14} className="location-badge-icon" />
            <span>Incident Location Confirmed</span>
          </div>
          <button
            type="button"
            className="location-edit-btn"
            onClick={() => {
              setConfirmed(false);
              if (onEdit) onEdit();
            }}
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </button>
        </div>

        <div className="location-confirmed-body">
          <MapPin size={18} className="location-pin-icon" />
          <div className="location-confirmed-details">
            <p className="location-confirmed-address">{address || "Location set via GPS"}</p>
            {latitude !== null && longitude !== null && (
              <span className="location-confirmed-coords">
                Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        {latitude !== null && longitude !== null && (
          <div className="location-confirmed-map">
            <LocationMap latitude={latitude} longitude={longitude} address={address} height="130px" zoom={14} />
          </div>
        )}
      </div>
    );
  }

  // 5. Render interactive selector card
  return (
    <div className="location-card-4827">
      <div className="location-card-top">
        <div className="location-icon-wrapper">
          <MapPin size={18} />
        </div>
        <div>
          <h3 className="location-title-4827">Specify Incident Location</h3>
          <p className="location-description-4827">
            Identify where the issue occurred using GPS or by typing the address.
          </p>
        </div>
      </div>

      {/* Geolocation Button */}
      <button
        type="button"
        className="location-device-btn"
        onClick={handleFetchCurrentLocation}
        disabled={loadingGeo || searching}
      >
        {loadingGeo ? (
          <>
            <Loader2 size={16} className="location-spin" />
            <span>Detecting your coordinates...</span>
          </>
        ) : (
          <>
            <Navigation size={16} />
            <span>Use My Current Device Location</span>
          </>
        )}
      </button>

      <div className="location-divider">
        <span>or specify manually</span>
      </div>

      {/* Manual Search Input */}
      <div className="location-search-row">
        <div className="location-input-wrapper">
          <MapPin size={16} className="location-input-icon" />
          <input
            type="text"
            className="location-search-input"
            placeholder="Type address, street, landmark, or city..."
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchAddress();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="location-search-btn"
          onClick={() => handleSearchAddress()}
          disabled={searching || !address.trim()}
          title="Locate on map"
        >
          {searching ? <Loader2 size={15} className="location-spin" /> : <Search size={15} />}
          <span>Locate</span>
        </button>
      </div>

      {/* Coordinates Toggle */}
      <div className="location-coords-toggle-row">
        <button
          type="button"
          className="location-coords-toggle-btn"
          onClick={() => setShowManualCoords(!showManualCoords)}
        >
          {showManualCoords ? "- Hide GPS Coordinates" : "+ Enter / View GPS Coordinates"}
        </button>
      </div>

      {showManualCoords && (
        <div className="location-coords-inputs">
          <div className="location-coord-field">
            <label>Latitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 28.4682"
              value={latitude ?? ""}
              onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div className="location-coord-field">
            <label>Longitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 77.5180"
              value={longitude ?? ""}
              onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="location-error-4827">
          <AlertCircle size={15} className="location-error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Map Preview when coordinates are present */}
      {latitude !== null && longitude !== null && (
        <div className="location-map-preview">
          <LocationMap latitude={latitude} longitude={longitude} address={address} height="150px" zoom={15} />
        </div>
      )}

      {/* Confirmation Action */}
      <div className="location-confirm-action">
        <button
          type="button"
          className="location-confirm-btn"
          onClick={handleConfirm}
          disabled={!address.trim() && (latitude === null || longitude === null)}
        >
          <Check size={16} />
          <span>Confirm This Location</span>
        </button>
      </div>
    </div>
  );
};

export default LocationCard;
