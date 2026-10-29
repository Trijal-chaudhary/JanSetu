import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  Edit3,
  Check,
  FileText,
  CheckCircle2,
  History,
  Info,
  AlertTriangle,
  ThumbsUp,
  MapPin,
  Image,
} from "lucide-react";
import styles from "./ReportDetailPage.module.css";
import { ReportItem, StatusType } from "../../types/depart";
import { DepartHeader } from "../../components/Header/DepartHeader";
import { ReportLocationMap } from "../../components/Map/ReportLocationMap";

interface Props {
  report: ReportItem | null;
  onNavigate: (view: "dashboard" | "details") => void;
  onBack: () => void;
  onStatusUpdated?: (updated: ReportItem) => void;
}

export const ReportDetailPage: React.FC<Props> = ({ report: initialReport, onNavigate, onBack, onStatusUpdated }) => {
  const [report, setReport] = useState<ReportItem | null>(initialReport);

  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);

  const [selectedStatus, setSelectedStatus] = useState<StatusType>(
    (initialReport?.applicationStatus as StatusType) || "Reported"
  );
  const [resolutionRemark, setResolutionRemark] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<string>("");

  const reportId = report?._id || report?.id || "N/A";

  useEffect(() => {
    if (reportId !== "N/A") {
      const socket = io("http://localhost:3007");
      socket.on("report_updated", (updatedReport: ReportItem) => {
        const idA = (updatedReport._id || updatedReport.id || "").toString();
        if (idA === reportId) {
          setReport(updatedReport);
          setSelectedStatus((updatedReport.applicationStatus as StatusType) || "Reported");
          if (onStatusUpdated) {
            onStatusUpdated(updatedReport);
          }
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [reportId, onStatusUpdated]);

  if (!report) {
    return (
      <div className={styles.container}>
        <DepartHeader activeView="report-detail" onNavigate={onNavigate} />
        <main className={styles.mainContent}>
          <div className={styles.topBar}>
            <h2>Report details not available.</h2>
            <button className={styles.backBtn} onClick={onBack}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    try {
      if (selectedStatus === "Resolved" && (!resolutionRemark || !resolutionRemark.trim())) {
        setUpdateMessage("Please provide a resolution remark before marking this report as resolved.");
        return;
      }

      setUpdating(true);
      setUpdateMessage("");

      const res = await fetch(`/api/depart/reports/${reportId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationStatus: selectedStatus,
          resolutionRemark: selectedStatus === "Resolved" ? resolutionRemark.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setUpdateMessage("Status updated successfully!");
        setReport(data.report);
        if (onStatusUpdated) {
          onStatusUpdated(data.report);
        }
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
      case "Closed":
        return styles.badgeClosed;
      case "Reopened":
        return styles.badgeReopened;
      case "Rejected":
        return styles.badgeRejected;
      default:
        return styles.badgeReported;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Date unavailable";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Date unavailable";
    }
  };

  return (
    <div className={styles.container}>
      <DepartHeader activeView="report-detail" onNavigate={onNavigate} />

      <main className={styles.mainContent}>
        {/* Top Header Bar matching Dashboard theme */}
        <div className={styles.topBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              Grievance Record Inspection
              <span className={styles.reportIdPill}>#{reportId}</span>
            </h1>
          </div>
          <button className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Reports Dashboard
          </button>
        </div>

        {/* Light Card Status Update Box matching Dashboard Cards */}
        <div className={styles.actionCard}>
          <div className={styles.actionHeader}>
            <div className={styles.actionTitle}>
              <Edit3 size={18} color="#1d4ed8" />
              Authority Grievance Dispatch & Status Update
            </div>
            <span className={`${styles.statusBadge} ${getStatusBadgeClass(report.applicationStatus)}`}>
              Current Status: {report.applicationStatus || "Reported"}
            </span>
          </div>

          {report.applicationStatus !== "Closed" ? (
            <div className={styles.actionControls}>
              <div className={styles.controlsRow}>
                <div className={styles.selectGroup}>
                  <label className={styles.inputLabel}>New Status</label>
                  <select
                    className={styles.statusSelect}
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value as StatusType);
                      if (updateMessage) setUpdateMessage("");
                    }}
                  >
                    <option value="Reported">Reported</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {selectedStatus === "Resolved" && (
                <div className={styles.remarkContainer}>
                  <label className={styles.remarkLabel}>
                    Resolution Remark <span className={styles.requiredStar}>*</span>
                  </label>
                  <textarea
                    className={styles.remarkInput}
                    placeholder="Describe what action was taken to resolve this grievance..."
                    value={resolutionRemark}
                    onChange={(e) => {
                      setResolutionRemark(e.target.value);
                      if (updateMessage) setUpdateMessage("");
                    }}
                    rows={3}
                  />
                </div>
              )}

              <div className={styles.buttonRow}>
                <button
                  className={styles.saveBtn}
                  onClick={handleUpdateStatus}
                  disabled={
                    updating ||
                    (selectedStatus === report.applicationStatus && !resolutionRemark)
                  }
                >
                  {updating ? "Saving Status..." : "Save Status Update"}
                </button>

                {updateMessage && (
                  <span
                    className={styles.updateMsg}
                    style={{
                      color: updateMessage.toLowerCase().includes("success") ? "#166534" : "#dc2626",
                    }}
                  >
                    {updateMessage}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.875rem", color: "#64748b", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px" }}>
              <Check size={16} color="#166534" />
              <span>Report confirmed resolved and closed by citizen. No further authority status changes required.</span>
            </div>
          )}
        </div>

        {/* Full Problem Description Card */}
        <div className={styles.contentCard}>
          <div className={styles.sectionHeader}>
            <FileText size={18} color="#1d4ed8" />
            Complete Problem Statement & Citizen Description
          </div>
          <div className={styles.descBox}>
            {report.problemDescription || "No detailed text description provided."}
          </div>
        </div>

        {/* Resolution Information Card (if present) */}
        {report.resolutionRemark && (
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <CheckCircle2 size={18} color="#16a34a" />
              Authority Resolution Remark & Resolution Details
            </div>
            <div className={styles.descBox} style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <div style={{ fontWeight: 700, color: "#166534", marginBottom: "4px" }}>
                Official Resolution Remark:
              </div>
              <p style={{ margin: 0 }}>{report.resolutionRemark}</p>
              {report.resolutionDate && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "8px" }}>
                  Resolution Date: {formatDate(report.resolutionDate)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Timeline Card */}
        {Array.isArray(report.activityHistory) && report.activityHistory.length > 0 && (
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <History size={18} color="#1d4ed8" />
              Grievance Activity History & Audit Log ({report.activityHistory.length})
            </div>
            <div className={styles.timeline}>
              {report.activityHistory.map((item, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>{item.action}</span>
                    <span className={styles.timelineSub}>
                      {formatDate(item.createdAt)} • Performed by: {item.performedBy || "System"} ({item.performedByType || "system"})
                    </span>
                    {item.remark && (
                      <div className={styles.timelineRemark}>
                        "{item.remark}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grievance Metadata Grid Card */}
        <div className={styles.contentCard}>
          <div className={styles.sectionHeader}>
            <Info size={18} color="#1d4ed8" />
            Grievance Metadata & Service Attributes
          </div>

          <div className={styles.grid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Internal Database ID</span>
              <span className={styles.infoVal} style={{ fontFamily: "monospace" }}>{reportId}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Category</span>
              <span className={styles.infoVal}>{report.category}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Subcategory</span>
              <span className={styles.infoVal} style={{ color: "#1d4ed8" }}>{report.subcategory}</span>
            </div>

            {report.issueType && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Specific Issue Type</span>
                <span className={styles.infoVal}>{report.issueType}</span>
              </div>
            )}

            {report.serviceOrScheme && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Service / Scheme</span>
                <span className={styles.infoVal}>{report.serviceOrScheme}</span>
              </div>
            )}

            {report.relevantDateOrDuration && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Date / Duration</span>
                <span className={styles.infoVal}>{report.relevantDateOrDuration}</span>
              </div>
            )}

            {report.riskOrUrgency && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Urgency / Safety Risk</span>
                <span className={styles.infoVal} style={{ color: "#991b1b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <AlertTriangle size={14} />
                  <span>{report.riskOrUrgency}</span>
                </span>
              </div>
            )}

            {report.impact && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Public Impact</span>
                <span className={styles.infoVal}>{report.impact}</span>
              </div>
            )}

            {report.desiredResolution && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Desired Resolution</span>
                <span className={styles.infoVal}>{report.desiredResolution}</span>
              </div>
            )}

            {report.affectedPeople && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Affected Population</span>
                <span className={styles.infoVal}>{report.affectedPeople}</span>
              </div>
            )}

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Citizen Support</span>
              <span className={styles.infoVal} style={{ color: "#1d4ed8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <ThumbsUp size={14} />
                <span>{report.supportedBy?.length || 0} Community Upvotes</span>
              </span>
            </div>

            {(report.userName || report.userEmail || report.userPhone) && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Report Creator Info</span>
                <span className={styles.infoVal}>
                  {report.userName || "Citizen User"}
                  {report.userEmail && ` (${report.userEmail})`}
                  {report.userPhone && ` • ${report.userPhone}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Location & OpenStreetMap Map Card */}
        <div className={styles.contentCard}>
          <div className={styles.sectionHeader}>
            <MapPin size={18} color="#1d4ed8" />
            Grievance Geographic Location (Leaflet + OpenStreetMap)
          </div>
          <ReportLocationMap location={report.location} />
        </div>

        {/* Supporting Evidence Card */}
        {report.evidence && report.evidence.length > 0 && (
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <Image size={18} color="#1d4ed8" />
              Uploaded Evidence & Media Files
            </div>
            <div className={styles.evidenceGrid}>
              {report.evidence.map((item, index) => {
                const url = typeof item === "string" ? item : item?.url || "";
                if (!url) return null;
                return (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Evidence File ${index + 1}`} className={styles.evidenceThumb} />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
