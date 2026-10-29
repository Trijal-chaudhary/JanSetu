import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Camera,
  Building2,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toggleSupportReport } from "../../services/fetching";
import styles from "./Feed.module.css";
import DiscussionSection from "../Comments/DiscussionSection";

export interface UserData {
  id: string;
  username: string;
  name: string;
  profilePhoto?: string | null;
  location?: {
    area?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface CommentData {
  id: string;
  _id?: string;
  reportId: string;
  userId: string;
  comment: string;
  content?: string;
  parentCommentId?: string | null;
  score?: number;
  likes?: number;
  likedBy?: string[];
  upvotes?: string[];
  downvotes?: string[];
  userVote?: "up" | "down" | null;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    profilePhoto: string | null;
  };
  replies?: CommentData[];
  replyCount?: number;
}

export interface ReportData {
  _id: string;
  category: string | null;
  subcategory: string | null;
  problemDescription: string | null;

  location: {
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;

  issueType: string | null;
  serviceOrScheme: string | null;
  relevantDateOrDuration: string | null;
  applicationStatus: string | null;

  evidence:
    | {
        type: "image" | "video" | "document" | "other";
        url: string;
        description?: string | null;
      }[]
    | null;

  riskOrUrgency: string | null;
  impact: string | null;
  desiredResolution: string | null;
  affectedPeople?: string | null;
  supportedBy?: string[];
  commentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

import { formatDistance } from "../../utils/distance";

interface ReportCardProps {
  report: ReportData;
  index?: number;
  userDistance?: number | null;
}

export default function ReportCard({
  report,
  userDistance,
}: ReportCardProps) {
  const { user: authUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const currentUserId = authUser?.id || "";

  // Support interactive state
  const [supportedBy, setSupportedBy] = useState<string[]>(
    report.supportedBy || []
  );
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(report.commentCount || 0);

  const isSupported = currentUserId ? supportedBy.includes(currentUserId) : false;
  const supportCount = supportedBy.length;
  const displayCommentCount = commentCount;

  const requireAuthCheck = (): boolean => {
    if (!isAuthenticated || !currentUserId) {
      alert("Please login to continue.");
      navigate("/login");
      return false;
    }
    return true;
  };

  const handleToggleSupport = async () => {
    if (!requireAuthCheck()) return;
    if (isSubmittingSupport) return;
    setIsSubmittingSupport(true);

    // Optimistic update
    const previousSupportedBy = [...supportedBy];
    const updated = isSupported
      ? supportedBy.filter((id) => id !== currentUserId)
      : [...supportedBy, currentUserId];

    setSupportedBy(updated);

    try {
      const res = await toggleSupportReport(report._id);
      if (res && res.success && Array.isArray(res.supportedBy)) {
        setSupportedBy(res.supportedBy);
      } else if (res && res.message && res.message.includes("login")) {
        alert(res.message);
        navigate("/login");
      }
    } catch (err) {
      console.error("Failed to toggle support:", err);
      setSupportedBy(previousSupportedBy);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleToggleComments = () => {
    setShowComments((prev) => !prev);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string | null) => {
    const s = (status || "Reported").toLowerCase();

    if (s.includes("resolve") || s.includes("close")) {
      return (
        <div className={`${styles.statusBadge} ${styles.statusBadgeResolved}`}>
          <span
            className={`${styles.statusDot} ${styles.statusDotResolved}`}
          ></span>
          <span>Resolved</span>
        </div>
      );
    }

    if (s.includes("review")) {
      return (
        <div className={`${styles.statusBadge} ${styles.statusBadgeReview}`}>
          <span
            className={`${styles.statusDot} ${styles.statusDotReview}`}
          ></span>
          <span>Under Review</span>
        </div>
      );
    }

    if (s.includes("progress")) {
      return (
        <div className={`${styles.statusBadge} ${styles.statusBadgeProgress}`}>
          <span
            className={`${styles.statusDot} ${styles.statusDotProgress}`}
          ></span>
          <span>In Progress</span>
        </div>
      );
    }

    if (s.includes("reject") || s.includes("escalat")) {
      return (
        <div className={`${styles.statusBadge} ${styles.statusBadgeRejected}`}>
          <span
            className={`${styles.statusDot} ${styles.statusDotRejected}`}
          ></span>
          <span>Escalated</span>
        </div>
      );
    }

    return (
      <div className={`${styles.statusBadge} ${styles.statusBadgeReported}`}>
        <span
          className={`${styles.statusDot} ${styles.statusDotReported}`}
        ></span>
        <span>Reported</span>
      </div>
    );
  };

  // Status Note Helper for footer
  const getStatusNote = (status: string | null) => {
    const s = (status || "Reported").toLowerCase();
    if (s.includes("resolve")) return "Verified Resolved by Citizens";
    if (s.includes("review")) return "Field Engineer Assigned (ETA: 48 hrs)";
    if (s.includes("progress")) return "Repair Work Scheduled";
    return "Awaiting Field Inspection";
  };

  // Time formatting helper
  const getTimeString = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } catch {
      return "Recently";
    }
  };

  // Evidence image check
  const evidenceUrl =
    report.evidence && report.evidence.length > 0 && report.evidence[0]?.url
      ? report.evidence[0].url
      : null;

  const categoryText = (
    report.category || "PUBLIC INFRASTRUCTURE"
  ).toUpperCase();
  const subcategoryText =
    report.subcategory || report.issueType || "General Civic Defect";
  const addressText = report.location?.address || "Greater Noida, Uttar Pradesh";
  const authorityText =
    report.serviceOrScheme ||
    `${report.category || "Greater Noida Authority"} - Sanitation & Public Works Dept.`;

  return (
    <article className={styles.reportCard}>
      {/* Top Header & Status */}
      <div className={styles.cardHeader}>
        <div className={styles.categoryGroup}>
          <span className={styles.categoryTag}>{categoryText}</span>
          <span className={styles.categoryDivider}>•</span>
          <span className={styles.subcategoryTag}>{subcategoryText}</span>
        </div>

        {getStatusBadge(report.applicationStatus)}
      </div>

      {/* Issue Title */}
      <h3
        className={styles.problemDescription}
        style={{ cursor: "pointer" }}
        onClick={() => navigate(`/report/${report._id}`)}
      >
        {report.problemDescription || "Civic issue reported in local neighborhood"}
      </h3>

      {/* Location & Metadata */}
      <div className={styles.cardMeta}>
        <MapPin className={styles.metaIcon} size={16} />
        {typeof userDistance === "number" && !isNaN(userDistance) && (
          <>
            <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
              {formatDistance(userDistance)} away
            </span>
            <span className={styles.metaDot}>•</span>
          </>
        )}
        <span>{addressText}</span>
        <span className={styles.metaDot}>•</span>
        <span>
          {getTimeString(report.createdAt)} by{" "}
          <strong className={styles.metaAuthor}>Citizen Resident</strong>
        </span>
      </div>

      {/* Evidence Image (Gracefully rendered when available) */}
      {evidenceUrl && !imageError && (
        <div className={styles.evidenceContainer} onClick={() => navigate(`/report/${report._id}`)}>
          <img
            className={styles.evidenceImage}
            src={evidenceUrl}
            alt="Verified issue evidence"
            onError={() => setImageError(true)}
          />
          <div className={styles.verifiedBadge}>
            <Camera className={styles.verifiedIcon} size={16} />
            <span>Verified Citizen Photo</span>
          </div>
        </div>
      )}

      {/* Authority Allocation Box */}
      <div className={styles.authorityBox}>
        <Building2 className={styles.authorityIcon} size={16} />
        <span>
          Assigned to:{" "}
          <strong className={styles.authorityName}>{authorityText}</strong>
        </span>
      </div>

      {/* Card Footer Actions */}
      <div className={styles.cardFooter}>
        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={`${styles.actionBtn} ${
              isSupported ? styles.actionBtnSupported : ""
            }`}
            onClick={handleToggleSupport}
            disabled={isSubmittingSupport}
          >
            <ThumbsUp className={styles.actionIcon} size={16} />
            <span>
              {isSupported ? "Supported" : "Support"} ({supportCount})
            </span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleToggleComments}
          >
            <MessageSquare size={16} />
            <span>
              Comment {displayCommentCount > 0 ? `(${displayCommentCount})` : ""}
            </span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => navigate(`/report/${report._id}`)}
          >
            <ExternalLink size={16} />
            <span>Details</span>
          </button>
        </div>

        <div className={styles.footerNote}>
          <span className={styles.footerNoteDot}></span>
          <span>{getStatusNote(report.applicationStatus)}</span>
        </div>
      </div>

      {/* Comments Section Accordion */}
      {showComments && (
        <div className={styles.commentsSection}>
          <DiscussionSection
            reportId={report._id}
            onCommentCountChange={(count) => setCommentCount(count)}
          />
        </div>
      )}
    </article>
  );
}
