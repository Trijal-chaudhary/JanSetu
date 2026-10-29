import React from "react";
import { ArrowLeft, Building2, MapPin, FileText, Map } from "lucide-react";
import styles from "./DepartDetailsPage.module.css";
import { useDepartAuth } from "../../context/DepartAuthContext";
import { DepartHeader } from "../../components/Header/DepartHeader";
import { DepartLocationMap } from "../../components/Map/DepartLocationMap";

interface Props {
  onNavigate: (view: "dashboard" | "details") => void;
}

export const DepartDetailsPage: React.FC<Props> = ({ onNavigate }) => {
  const { department } = useDepartAuth();

  if (!department) return null;

  const isPublicInfra = department.category.toLowerCase() === "public infrastructure";
  const radiusKm = department.location?.radiusKm || 10;

  return (
    <div className={styles.container}>
      <DepartHeader activeView="details" onNavigate={onNavigate} />

      <main className={styles.mainContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Department Profile & Authority Details</h1>
            <p className={styles.pageSubtitle}>
              Authenticated Operational Records, Jurisdiction Coordinates, and Authorized Categories
            </p>
          </div>
          <button className={styles.backBtn} onClick={() => onNavigate("dashboard")}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>

        {/* Info Cards Grid */}
        <div className={styles.cardsGrid}>
          {/* Card 1: Identity & Category */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Building2 size={20} />
              </div>
              <div className={styles.cardTitle}>Authority Overview</div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Department Name</span>
              <span className={styles.detailValue}>{department.departmentName}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Category</span>
              <span className={styles.detailValue} style={{ color: "#1d4ed8" }}>
                {department.category}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Authority ID</span>
              <span className={styles.detailValue} style={{ fontFamily: "monospace" }}>
                {department.departmentId}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Username</span>
              <span className={styles.detailValue}>{department.username || "N/A"}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Operational Status</span>
              <span className={styles.detailValue} style={{ color: "#166534" }}>
                ● Active Verified Authority
              </span>
            </div>
          </div>

          {/* Card 2: Jurisdiction & Service Area */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper} style={{ backgroundColor: "#f0fdf4", color: "#166534" }}>
                <MapPin size={20} />
              </div>
              <div className={styles.cardTitle}>Location & Jurisdiction</div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Area / Sector</span>
              <span className={styles.detailValue}>{department.location?.area || "N/A"}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>City / Town</span>
              <span className={styles.detailValue}>{department.location?.city || "N/A"}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>State</span>
              <span className={styles.detailValue}>{department.location?.state || "N/A"}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Latitude</span>
              <span className={styles.detailValue} style={{ fontFamily: "monospace" }}>
                {department.location?.latitude ?? "N/A"}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Longitude</span>
              <span className={styles.detailValue} style={{ fontFamily: "monospace" }}>
                {department.location?.longitude ?? "N/A"}
              </span>
            </div>

            {isPublicInfra && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Service Radius</span>
                <span className={styles.radiusPill} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} />
                  <span>{radiusKm} KM Operational Zone</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Authorized Subcategories Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ backgroundColor: "#faf5ff", color: "#6b21a8" }}>
              <FileText size={20} />
            </div>
            <div className={styles.cardTitle}>
              Authorized Grievance Subcategories ({department.subcategories.length})
            </div>
          </div>
          <div className={styles.subcatList}>
            {department.subcategories.map((sub, idx) => (
              <div key={idx} className={styles.subcatBadge}>
                {sub}
              </div>
            ))}
          </div>
        </div>

        {/* Interactive OpenStreetMap */}
        <div className={styles.mapCard}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper} style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
              <Map size={20} />
            </div>
            <div className={styles.cardTitle}>
              Official Jurisdiction Map (Leaflet + OpenStreetMap)
            </div>
          </div>
          <DepartLocationMap
            location={department.location}
            departmentName={department.departmentName}
            category={department.category}
          />
        </div>
      </main>
    </div>
  );
};
