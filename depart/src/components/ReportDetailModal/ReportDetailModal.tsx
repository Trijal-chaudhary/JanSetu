import React, { useState } from "react";
import styles from "./ReportDetailModal.module.css";
import { ReportItem, StatusType } from "../../types/depart";
import { ReportLocationMap } from "../Map/ReportLocationMap";

interface Props {
  report: ReportItem | null;
  onClose: () => void;
  onStatusUpdated: (updatedReport: ReportItem) => void;
}

export const ReportDetailModal: React.FC<Props> = ({ report, onClose, onStatusUpdated }) => {
  if (!report) return null;

  const [selectedStatus, setSelectedStatus] = useState<StatusType>(
    (report.applicationStatus as StatusType) || "Reported"
  );
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<string>("");

  const reportId = report._id || report.id || "N/A";

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      setUpdateMessage("");
      const res = await fetch(`/api/depart/reports/${reportId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationStatus: selectedStatus }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setUpdateMessage("Status updated successfully!");
        onStatusUpdated(data.report);
      } else {
        setUpdateMessage(data.message || "Failed to update status");
      }
    } catch (err: any) {
      setUpdateMessage(err.message || "Error updating status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "Under Review":
        return styles.badgeUnderReview;
      case "In Progress":
        return styles.badgeInProgress;
      case "Resolved":
        return styles.badgeResolved;
      case "Rejected":
        return styles.badgeRejected;
      default:
        return styles.badgeReported;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            Grievance / Report Details
            <span className={styles.reportIdTag}>#{reportId.slice(-8)}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {/* Department Action Box */}
          <div className={styles.statusUpdateBox}>
            <div className={styles.statusHeader}>
              <div className={styles.sectionTitle} style={{ color: "#93c5fd" }}>
                Authority Action & Official Status Update
              </div>
              <span className={`${styles.badge} ${getStatusBadgeClass(report.applicationStatus)}`}>
                Current: {report.applicationStatus || "Reported"}
              </span>
            </div>
            <div className={styles.statusControls}>
              <select
                className={styles.statusSelect}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StatusType)}
              >
                <option value="Reported">Reported</option>
                <option value="Under Review">Under Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                className={styles.updateBtn}
                onClick={handleUpdateStatus}
                disabled={updating || selectedStatus === report.applicationStatus}
              >
                {updating ? "Updating..." : "Save New Status"}
              </button>
              {updateMessage && (
                <span style={{ fontSize: "0.85rem", color: updateMessage.includes("success") ? "#34d399" : "#f87171" }}>
                  {updateMessage}
                </span>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Problem Description</div>
            <div className={styles.descriptionBox}>
              {report.problemDescription || "No detailed description provided."}
            </div>
          </div>

          {/* Key Metadata Grid */}
          <div className={styles.grid}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Category</span>
              <span className={styles.infoValue}>{report.category}</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Subcategory</span>
              <span className={styles.infoValue}>{report.subcategory}</span>
            </div>
            {report.issueType && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Specific Issue Type</span>
                <span className={styles.infoValue}>{report.issueType}</span>
              </div>
            )}
            {report.serviceOrScheme && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Service / Scheme</span>
                <span className={styles.infoValue}>{report.serviceOrScheme}</span>
              </div>
            )}
            {report.relevantDateOrDuration && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Date / Duration</span>
                <span className={styles.infoValue}>{report.relevantDateOrDuration}</span>
              </div>
            )}
            {report.riskOrUrgency && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Urgency / Risk</span>
                <span className={`${styles.badge} ${styles.urgencyHigh}`}>
                  {report.riskOrUrgency}
                </span>
              </div>
            )}
            {report.affectedPeople && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Affected People</span>
                <span className={styles.infoValue}>{report.affectedPeople}</span>
              </div>
            )}
            {report.supportedBy && (
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>Citizen Support</span>
                <span className={styles.infoValue}>{report.supportedBy.length} Community Upvotes</span>
              </div>
            )}
          </div>

          {/* Impact & Desired Resolution */}
          {(report.impact || report.desiredResolution) && (
            <div className={styles.grid}>
              {report.impact && (
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Citizen Impact</span>
                  <span className={styles.infoValue}>{report.impact}</span>
                </div>
              )}
              {report.desiredResolution && (
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Desired Resolution</span>
                  <span className={styles.infoValue}>{report.desiredResolution}</span>
                </div>
              )}
            </div>
          )}

          {/* Location Map View */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Grievance Location & OpenStreetMap Marker</div>
            <ReportLocationMap location={report.location} />
          </div>

          {/* Supporting Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Uploaded Evidence Files</div>
              <div className={styles.evidenceGallery}>
                {report.evidence.map((item, index) => {
                  const url = typeof item === "string" ? item : item?.url || "";
                  if (!url) return null;
                  return (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Evidence ${index + 1}`} className={styles.evidenceThumb} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.updateBtn} onClick={onClose} style={{ background: "#334155" }}>
            Close Detail Window
          </button>
        </div>
      </div>
    </div>
  );
};
