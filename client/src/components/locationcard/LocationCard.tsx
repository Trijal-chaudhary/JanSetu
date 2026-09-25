import { useState } from "react";
import "./LocationCard.css";

interface LocationCardProps {
  onLocationFetch: (location: {
    address: string | null;
    latitude: number;
    longitude: number;
  }) => void;
}

const LocationCard = ({ onLocationFetch }: LocationCardProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");

  const fetchLocation = () => {
    setError("");
    setAddress("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        let fetchedAddress: string | null = null;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch address");
          }

          const result = await response.json();
          fetchedAddress = result.display_name ?? null;

          setAddress(fetchedAddress ?? "Address could not be identified.");
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setAddress("Address could not be identified.");
        }

        // Send coordinates even if address lookup fails.
        onLocationFetch({
          address: fetchedAddress,
          latitude,
          longitude,
        });

        setLoading(false);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);

        setError(
          "Unable to access your location. Please allow location permission and try again."
        );

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="location-card-4827">
      <h3 className="location-title-4827">Share your live location</h3>

      <p className="location-description-4827">
        Please share your live location so we can accurately identify where this
        issue occurred.
      </p>

      <button
        className="location-button-4827"
        onClick={fetchLocation}
        disabled={loading}
      >
        {loading ? "Fetching location and address..." : "Share Live Location"}
      </button>

      {loading && (
        <p className="location-description-4827">
          Getting your coordinates and finding the address...
        </p>
      )}

      {address && !loading && (
        <p className="location-description-4827">
          <strong>Detected address:</strong> {address}
        </p>
      )}

      {error && <p className="location-error-4827">{error}</p>}
    </div>
  );
};

export default LocationCard;
