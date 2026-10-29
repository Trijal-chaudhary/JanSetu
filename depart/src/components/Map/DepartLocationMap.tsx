import React, { useEffect, useRef } from "react";
import L from "leaflet";
import styles from "./DepartLocationMap.module.css";
import { DepartmentLocation } from "../../types/depart";

interface Props {
  location?: DepartmentLocation;
  departmentName: string;
  category: string;
}

export const DepartLocationMap: React.FC<Props> = ({ location, departmentName, category }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const lat = location?.latitude;
  const lng = location?.longitude;
  const isPublicInfra = category.toLowerCase() === "public infrastructure";
  const radiusKm = location?.radiusKm || 10;

  const hasValidCoords = typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    if (!hasValidCoords || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView([lat, lng], isPublicInfra ? 11 : 14);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    const popupContent = `
      <div style="font-family: Inter, sans-serif; font-size: 0.85rem;">
        <strong style="color: #0f172a;">${departmentName}</strong><br/>
        <span style="color: #475569;">${location?.area ? `${location.area}, ` : ""}${location?.city || ""}</span><br/>
        ${isPublicInfra ? `<span style="color: #1d4ed8; font-weight: 600; margin-top: 4px; display: inline-block;">${radiusKm} KM Location Service Radius Zone</span>` : ""}
      </div>
    `;

    L.marker([lat, lng], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(popupContent)
      .openPopup();

    if (isPublicInfra) {
      L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: "#1d4ed8",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, departmentName, category, isPublicInfra, radiusKm, hasValidCoords, location?.area, location?.city]);

  if (!hasValidCoords) {
    return (
      <div className={styles.noCoords}>
        Location coordinates not set for this department.
      </div>
    );
  }

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapRef} className={styles.mapElement} />
      <div className={styles.legendBar}>
        <div className={styles.legendItem}>
          <span className={styles.markerDot} />
          Department HQ: {location?.area}, {location?.city} ({lat?.toFixed(4)}, {lng?.toFixed(4)})
        </div>
        {isPublicInfra && (
          <div className={styles.legendItem}>
            <span className={styles.radiusZone} />
            Official {radiusKm} KM Service Radius Boundary
          </div>
        )}
      </div>
    </div>
  );
};
