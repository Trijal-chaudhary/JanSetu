import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./LocationMap.module.css";

// Fix standard Leaflet default marker icon path issue in bundled environments
const customIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address?: string | null;
  height?: string;
  zoom?: number;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  address,
  height = "260px",
  zoom = 15,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map if re-rendering
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (
      typeof latitude !== "number" ||
      isNaN(latitude) ||
      typeof longitude !== "number" ||
      isNaN(longitude)
    ) {
      return;
    }

    const map = L.map(mapContainerRef.current).setView([latitude, longitude], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

    if (address) {
      marker.bindPopup(`<b>Location</b><br />${address}`).openPopup();
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, address, zoom]);

  if (
    typeof latitude !== "number" ||
    isNaN(latitude) ||
    typeof longitude !== "number" ||
    isNaN(longitude)
  ) {
    return null;
  }

  return (
    <div className={styles.mapWrapper} style={{ height }}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
    </div>
  );
};

export default LocationMap;
