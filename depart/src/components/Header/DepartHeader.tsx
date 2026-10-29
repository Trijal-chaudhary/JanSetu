import React from "react";
import { LayoutDashboard, Building2, MapPin, Layers, LogOut } from "lucide-react";
import styles from "./DepartHeader.module.css";
import { useDepartAuth } from "../../context/DepartAuthContext";

interface DepartHeaderProps {
  activeView?: "dashboard" | "details" | "report-detail";
  onNavigate?: (view: "dashboard" | "details") => void;
}

export const DepartHeader: React.FC<DepartHeaderProps> = ({ activeView = "dashboard", onNavigate }) => {
  const { department, logout } = useDepartAuth();

  if (!department) return null;

  const locText = department.location
    ? `${department.location.area || ""}${department.location.area && department.location.city ? ", " : ""}${department.location.city || ""}`
    : "Authority Portal";

  return (
    <header className={styles.header}>
      {/* Left Section: Brand Logo & Department Info */}
      <div className={styles.brandSection} onClick={() => onNavigate?.("dashboard")} style={{ cursor: "pointer" }}>
        <div className={styles.logoWrapper}>
          <img src="/logo.jpeg" alt="JanSetu Logo" className={styles.logoImg} />
        </div>
        <div className={styles.titleGroup}>
          <div className={styles.portalBadgeRow}>
            <span className={styles.govTag}>Department Portal</span>
          </div>
          <div className={styles.deptSubtitle} title={department.departmentName}>
            {department.departmentName}
          </div>
        </div>
      </div>

      {/* Center Section: Main Navigation */}
      <nav className={styles.navGroup}>
        <button
          className={`${styles.navBtn} ${activeView === "dashboard" || activeView === "report-detail" ? styles.navBtnActive : ""}`}
          onClick={() => onNavigate?.("dashboard")}
        >
          <LayoutDashboard size={15} />
          Reports / Dashboard
        </button>
        <button
          className={`${styles.navBtn} ${activeView === "details" ? styles.navBtnActive : ""}`}
          onClick={() => onNavigate?.("details")}
        >
          <Building2 size={15} />
          Department Details
        </button>
      </nav>

      {/* Right Section: Location, Category, User Profile & Logout */}
      <div className={styles.actions}>
        {department.location && (
          <div className={styles.locationBadge} title={`${locText}, ${department.location.state || ""}`}>
            <MapPin size={14} style={{ flexShrink: 0 }} />
            <span className={styles.locationText}>{locText}</span>
          </div>
        )}

        <div className={styles.categoryBadge}>
          <Layers size={14} style={{ flexShrink: 0 }} />
          {department.category}
        </div>

        <div className={styles.profileWrapper}>
          <div className={styles.avatar}>
            {department.departmentName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{department.username || department.departmentId}</span>
            <span className={styles.profileRole}>Authority User</span>
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={logout} title="Logout Department Session">
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Logout
        </button>
      </div>
    </header>
  );
};
