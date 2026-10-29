import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Check,
  HelpCircle,
  AlertTriangle,
  History,
  Info,
  MapPin,
  Image,
  Video,
  FileText,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getReportById,
  toggleSupportReport,
  confirmReportResolution,
  reopenReport,
  getProfileImageUrl,
  DEFAULT_AVATAR,
} from "../../services/fetching";
import NavBar from "../Navbar/NavBar";
import LocationMap from "../Map/LocationMap";
import { type ReportData } from "../Feed/ReportCard";
import DiscussionSection from "../Comments/DiscussionSection";
import styles from "./ReportDetailPage.module.css";

interface CreatorUser {
  id: string;
  username: string;
  name: string;
  profilePhoto?: string | null;
}

interface ActivityEntry {
  action: string;
  previousStatus?: string | null;
  newStatus: string;
  remark?: string | null;
  performedBy?: string | null;
  performedByType?: string;
  createdAt: string;
}

interface FullReportData extends ReportData {
  _id: string;
  id?: string;
  createdBy?: string;
  userId?: string;
  creator?: CreatorUser;
  resolutionRemark?: string | null;
  resolutionEvidence?: (string | { url?: string; type?: string })[] | null;
  resolutionDate?: string | null;
  activityHistory?: ActivityEntry[];
}

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || "";

  const [report, setReport] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Support State
  const [supportedBy, setSupportedBy] = useState<string[]>([]);
  const [isSupporting, setIsSupporting] = useState(false);

  // Resolution & Reopen Feedback State
  const [showReopenBox, setShowReopenBox] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [feedbackProcessing, setFeedbackProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Lightbox modal state for images
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchReportData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getReportById(id);
      if (res && res.success && res.report) {
        setReport(res.report);
        setSupportedBy(res.report.supportedBy || []);
      } else {
        setError("Report not found.");
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      setError("Unable to load grievance details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();

    if (id) {
      const socket = io("http://localhost:3007");
      socket.on("report_updated", (updated: FullReportData) => {
        const idA = (updated._id || updated.id || "").toString();
        if (idA === id) {
          setReport(updated);
          if (Array.isArray(updated.supportedBy)) {
            setSupportedBy(updated.supportedBy);
          }
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [id]);

  const isSupported = currentUserId ? supportedBy.includes(currentUserId) : false;

  const handleToggleSupport = async () => {
    if (!id || isSupporting) return;
    setIsSupporting(true);

    const prevSupported = [...supportedBy];
    const updated = isSupported
      ? supportedBy.filter((uid) => uid !== currentUserId)
      : [...supportedBy, currentUserId];

    setSupportedBy(updated);

    try {
      const res = await toggleSupportReport(id);
      if (res && res.success && Array.isArray(res.supportedBy)) {
        setSupportedBy(res.supportedBy);
      }
    } catch (err) {
      console.error("Failed to toggle support:", err);
      setSupportedBy(prevSupported);
    } finally {
      setIsSupporting(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!id || feedbackProcessing) return;
    setFeedbackProcessing(true);
    setFeedbackMsg("");
    try {
      const res = await confirmReportResolution(id);
      if (res && res.success && res.report) {
        setReport(res.report);
        setFeedbackMsg("Thank you! Your grievance resolution is confirmed and closed.");
      } else {
        setFeedbackMsg(res.message || "Failed to confirm resolution.");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Error confirming resolution.");
    } finally {
      setFeedbackProcessing(false);
    }
  };

  const handleReopenReport = async () => {
    if (!id || feedbackProcessing) return;
    setFeedbackProcessing(true);
    setFeedbackMsg("");
    try {
      const res = await reopenReport(id, reopenReason.trim());
      if (res && res.success && res.report) {
        setReport(res.report);
        setShowReopenBox(false);
        setFeedbackMsg("Grievance reopened. The authority department has been notified for further action.");
      } else {
        setFeedbackMsg(res.message || "Failed to reopen grievance.");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Error reopening grievance.");
    } finally {
      setFeedbackProcessing(false);
    }
  };

  const isValidValue = (val: any) => {
    if (val === null || val === undefined || val === "") return false;
    if (typeof val === "string" && val.trim().toLowerCase() === "notrequired") return false;
    return true;
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
    } catch (e) {
      return "Date unavailable";
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <NavBar />
        <div className={styles.container} style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div style={{ fontSize: "1.125rem", color: "#64748b" }}>Loading Report Details...</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={styles.page}>
        <NavBar />
        <div className={styles.container} style={{ textAlign: "center", paddingTop: "4rem" }}>
          <h2>Report Not Found</h2>
          <p style={{ color: "#64748b", margin: "1rem 0" }}>{error || "The requested grievance does not exist."}</p>
          <button type="button" onClick={() => navigate("/feed")} className={styles.backBtn}>
            ← Return to Feed
          </button>
        </div>
      </div>
    );
  }

  const creator = report.creator || {
    id: "citizen",
    username: "citizen_resident",
    name: "Citizen Resident",
    profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  };

  const status = report.applicationStatus || "Reported";
  const isOwner = (report.createdBy || report.userId) === currentUserId || !report.createdBy;

  // Tracker stages
  const trackerStages = [
    { label: "Reported", key: "Reported" },
    { label: "Under Review", key: "Under Review" },
    { label: "In Progress", key: "In Progress" },
    { label: "Resolved", key: "Resolved" },
    { label: status === "Reopened" ? "Reopened" : "Closed", key: status === "Reopened" ? "Reopened" : "Closed" },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case "Under Review":
        return 1;
      case "In Progress":
        return 2;
      case "Resolved":
        return 3;
      case "Closed":
      case "Reopened":
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(status);

  return (
    <div className={styles.page}>
      <NavBar />

      <main className={styles.container}>
        {/* Back Button */}
        <button type="button" onClick={() => navigate("/feed")} className={styles.backBtn}>
          <ArrowLeft size={20} />
          <span>Back to Feed</span>
        </button>

        {/* Report Header Card */}
        <section className={styles.headerCard}>
          <div className={styles.categoryRow}>
            <div className={styles.categoryBadges}>
              <span className={styles.categoryBadge}>{report.category || "General Issue"}</span>
              {report.subcategory && (
                <span className={styles.subcategoryBadge}>{report.subcategory}</span>
              )}
            </div>

            <div className={`${styles.statusBadge} ${status === "Resolved" || status === "Closed" ? styles.statusResolved : styles.statusPending}`}>
              {status === "Resolved" || status === "Closed" ? <CheckCircle size={16} /> : <Clock size={16} />}
              <span>{status}</span>
            </div>
          </div>

          <h1 className={styles.problemTitle}>{report.problemDescription || "Public Grievance Report"}</h1>

          <div className={styles.metaRow}>
            <div>Submitted on {formatDate(report.createdAt)}</div>
            <div>•</div>
            <div>Ref ID: #{report._id.substring(0, 8)}</div>
          </div>
        </section>

        {/* Phase 5 Visual Status Progress Tracker */}
        <section className={styles.trackerCard}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            Grievance Lifecycle Progress Tracker
          </div>
          <div className={styles.trackerSteps}>
            {trackerStages.map((stage, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isActive = idx === currentStepIdx;
              const isReopened = status === "Reopened" && idx === 4;

              let nodeClass = styles.stepNode;
              if (isReopened) nodeClass += ` ${styles.stepNodeReopened}`;
              else if (isCompleted) nodeClass += ` ${styles.stepNodeCompleted}`;
              else if (isActive) nodeClass += ` ${styles.stepNodeActive}`;

              return (
                <div key={stage.key} className={nodeClass}>
                  <div className={styles.stepDot}>
                    {isReopened ? "!" : isCompleted ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={styles.stepLabel}>{stage.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Phase 5 Citizen Feedback Confirmation Box (When Status is Resolved) */}
        {status === "Resolved" && isOwner && (
          <section className={styles.feedbackCard}>
            <div className={styles.feedbackTitle}>
              <HelpCircle size={20} />
              <span>Was your grievance resolved to your satisfaction?</span>
            </div>
            <div className={styles.feedbackSubtitle}>
              The authority department has marked this issue as resolved. Please confirm if the resolution is complete.
            </div>

            <div className={styles.feedbackActions}>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleConfirmResolution}
                disabled={feedbackProcessing}
              >
                <CheckCircle size={18} />
                <span>Yes, Issue Resolved</span>
              </button>

              <button
                type="button"
                className={styles.reopenBtn}
                onClick={() => setShowReopenBox((prev) => !prev)}
                disabled={feedbackProcessing}
              >
                <AlertTriangle size={18} />
                <span>No, Issue Still Exists</span>
              </button>
            </div>

            {showReopenBox && (
              <div className={styles.reopenBox}>
                <input
                  type="text"
                  placeholder="Explain why the issue still exists..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className={styles.reopenInput}
                />
                <button
                  type="button"
                  className={styles.reopenBtn}
                  onClick={handleReopenReport}
                  disabled={feedbackProcessing}
                  style={{ width: "fit-content" }}
                >
                  Submit & Reopen Grievance
                </button>
              </div>
            )}

            {feedbackMsg && (
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#15803d", marginTop: "0.5rem" }}>
                {feedbackMsg}
              </div>
            )}
          </section>
        )}

        {/* Authority Resolution Remark Box (if present) */}
        {report.resolutionRemark && (
          <section className={styles.cardSection} style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <h2 className={styles.sectionHeading} style={{ color: "#166534" }}>
              <CheckCircle size={20} color="#16a34a" />
              <span>Authority Resolution Information</span>
            </h2>
            <div style={{ fontSize: "0.9375rem", color: "#15803d", lineHeight: 1.6 }}>
              <strong>Official Remark:</strong> {report.resolutionRemark}
            </div>
            {report.resolutionDate && (
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "6px" }}>
                Resolved on: {formatDate(report.resolutionDate)}
              </div>
            )}
          </section>
        )}

        {/* Phase 5 Grievance Activity History Timeline */}
        {Array.isArray(report.activityHistory) && report.activityHistory.length > 0 && (
          <section className={styles.cardSection}>
            <h2 className={styles.sectionHeading}>
              <History size={20} color="#2563eb" />
              <span>Grievance Activity History & Timeline</span>
            </h2>

            <div className={styles.timeline}>
              {report.activityHistory.map((item, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineTitle}>{item.action}</span>
                    <span className={styles.timelineSub}>
                      {formatDate(item.createdAt)} • By {item.performedBy || "System"} ({item.performedByType || "system"})
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
          </section>
        )}

        {/* Report Creator Info */}
        <section className={styles.creatorCard}>
          <div className={styles.creatorLeft}>
            <img
              src={getProfileImageUrl(creator.profilePhoto)}
              alt={creator.name}
              className={styles.creatorAvatar}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Reported By
              </div>
              <div className={styles.creatorName}>{creator.name}</div>
              <div className={styles.creatorHandle}>@{creator.username}</div>
            </div>
          </div>
        </section>

        {/* Report Details Grid */}
        <section className={styles.cardSection}>
          <h2 className={styles.sectionHeading}>
            <Info size={20} color="#2563eb" />
            <span>Grievance Details</span>
          </h2>

          <div className={styles.detailsGrid}>
            {isValidValue(report.issueType) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Issue Type</div>
                <div className={styles.detailValue}>{report.issueType}</div>
              </div>
            )}

            {isValidValue(report.serviceOrScheme) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Service / Scheme</div>
                <div className={styles.detailValue}>{report.serviceOrScheme}</div>
              </div>
            )}

            {isValidValue(report.relevantDateOrDuration) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Date / Duration</div>
                <div className={styles.detailValue}>{report.relevantDateOrDuration}</div>
              </div>
            )}

            {isValidValue(report.applicationStatus) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Application Status</div>
                <div className={styles.detailValue}>{report.applicationStatus}</div>
              </div>
            )}

            {isValidValue(report.riskOrUrgency) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Risk / Urgency</div>
                <div className={styles.detailValue}>{report.riskOrUrgency}</div>
              </div>
            )}

            {isValidValue(report.impact) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Community Impact</div>
                <div className={styles.detailValue}>{report.impact}</div>
              </div>
            )}

            {isValidValue(report.desiredResolution) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Desired Resolution</div>
                <div className={styles.detailValue}>{report.desiredResolution}</div>
              </div>
            )}

            {isValidValue(report.affectedPeople) && (
              <div className={styles.detailBox}>
                <div className={styles.detailLabel}>Affected Citizens</div>
                <div className={styles.detailValue}>{report.affectedPeople}</div>
              </div>
            )}
          </div>
        </section>

        {/* Report Location & OpenStreetMap */}
        <section className={styles.cardSection}>
          <h2 className={styles.sectionHeading}>
            <MapPin size={20} color="#dc2626" />
            <span>Report Location</span>
          </h2>

          <p style={{ fontSize: "0.9375rem", color: "#334155", fontWeight: 600, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={18} color="#dc2626" />
            <span>{report.location?.address || "Location Address Not Specified"}</span>
          </p>

          {typeof report.location?.latitude === "number" &&
            typeof report.location?.longitude === "number" && (
              <LocationMap
                latitude={report.location.latitude}
                longitude={report.location.longitude}
                address={report.location.address}
                height="320px"
              />
            )}
        </section>

        {/* Evidence Section */}
        {Array.isArray(report.evidence) && report.evidence.length > 0 && (
          <section className={styles.cardSection}>
            <h2 className={styles.sectionHeading}>
              <Image size={20} color="#16a34a" />
              <span>Evidence Attachments</span>
            </h2>

            <div className={styles.evidenceGrid}>
              {report.evidence.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className={styles.evidenceItem}
                  onClick={() => item.type === "image" && setSelectedImage(item.url)}
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt={`Evidence ${index + 1}`} className={styles.evidenceImg} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "1rem" }}>
                      {item.type === "video" ? <Video size={32} color="#2563eb" /> : <FileText size={32} color="#2563eb" />}
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#2563eb", marginTop: "4px" }}>
                        View {item.type}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Support Interaction Bar */}
        <section className={styles.supportBar}>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a" }}>
              {supportedBy.length} Citizens Supported
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              Upvoting helps highlight the scale and impact of this issue to authorities.
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSupport}
            disabled={isSupporting}
            className={`${styles.supportBtn} ${isSupported ? styles.supportBtnActive : ""}`}
          >
            <ThumbsUp size={18} />
            <span>{isSupported ? "Supported" : "Support Issue"}</span>
          </button>
        </section>

        {/* Reddit-Style Community Discussion Section */}
        <section className={styles.cardSection}>
          <DiscussionSection reportId={id || ""} />
        </section>
      </main>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <img
            src={selectedImage}
            alt="Evidence Full View"
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
          />
        </div>
      )}
    </div>
  );
};

export default ReportDetailPage;
