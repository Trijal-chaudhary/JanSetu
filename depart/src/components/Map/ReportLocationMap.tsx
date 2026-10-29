import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import styles from "./ReportLocationMap.module.css";
import { ReportLocation } from "../../types/depart";

interface Props {
  location?: ReportLocation | null;
}

export const ReportLocationMap: React.FC<Props> = ({ location }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const lat = location?.latitude;
  const lng = location?.longitude;
  const address = location?.address;

  const hasValidCoords = typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    if (!hasValidCoords || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView([lat, lng], 15);
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

    L.marker([lat, lng], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(`<b>Report Location</b><br/>${address || `${lat}, ${lng}`}`)
      .openPopup();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, address, hasValidCoords]);

  return (
    <div>
      {address && (
        <div className={styles.addressNotice}>
          <MapPin size={16} />
          Location Address: <span className={styles.addressText}>{address}</span>
        </div>
      )}

      {hasValidCoords ? (
        <div className={styles.mapContainer}>
          <div ref={mapRef} className={styles.mapElement} />
        </div>
      ) : (
        <div className={styles.noCoords}>
          No exact GPS coordinates available for this report.
        </div>
      )}
    </div>
  );
};
