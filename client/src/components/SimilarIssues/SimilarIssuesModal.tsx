import React, { useState } from "react";
import {
  MapPin,
  Users,
  CheckCircle2,
  ThumbsUp,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import styles from "./SimilarIssuesModal.module.css";

export interface CandidateIssue {
  _id: string;
  category?: string;
  subcategory?: string;
  issueType?: string;
  problemDescription: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  applicationStatus?: string;
  supportCount: number;
  isSupported?: boolean;
  distanceKm?: number | null;
  similarityScore?: number;
  combinedScore?: number;
}

interface SimilarIssuesModalProps {
  candidates: CandidateIssue[];
  onSupport: (reportId: string) => Promise<boolean>;
  onContinueSubmit: () => void;
  onClose: () => void;
  isSubmittingOriginal?: boolean;
}

export const SimilarIssuesModal: React.FC<SimilarIssuesModalProps> = ({
  candidates,
  onSupport,
  onContinueSubmit,
  onClose,
  isSubmittingOriginal = false,
}) => {
  const [supportingId, setSupportingId] = useState<string | null>(null);
  const [supportedMap, setSupportedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    candidates.forEach((c) => {
      if (c.isSupported) initial[c._id] = true;
    });
    return initial;
  });
  const [countsMap, setCountsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    candidates.forEach((c) => {
      initial[c._id] = c.supportCount || 0;
    });
    return initial;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSupportClick = async (reportId: string) => {
    if (supportedMap[reportId] || supportingId) return;

    setSupportingId(reportId);
    try {
      const ok = await onSupport(reportId);
      if (ok) {
        setSupportedMap((prev) => ({ ...prev, [reportId]: true }));
        setCountsMap((prev) => ({
          ...prev,
          [reportId]: (prev[reportId] || 0) + 1,
        }));
        setSuccessMessage("Thank you! Your endorsement for this issue has been recorded.");
        setTimeout(() => {
          window.location.href = "/feed";
        }, 1600);
      }
    } catch (err) {
      console.error("Support failed:", err);
    } finally {
      setSupportingId(null);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerIconRow}>
              <div className={styles.iconBadge}>
                <Sparkles size={20} />
              </div>
              <h2 className={styles.title}>Similar issues reported nearby</h2>
            </div>
            <p className={styles.subtitle}>
              JanSetu AI found existing reports near your location matching this problem.
              Supporting an existing report unites community voice and alerts local authorities faster!
            </p>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Notice if supported */}
        {successMessage && (
          <div style={{ padding: "0 28px", marginTop: "16px" }}>
            <div className={styles.successNotice}>
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className={styles.candidatesList}>
          {candidates.map((cand) => {
            const isSupported = Boolean(supportedMap[cand._id]);
            const count = countsMap[cand._id] ?? cand.supportCount ?? 0;
            const distanceStr =
              cand.distanceKm !== null && cand.distanceKm !== undefined
                ? cand.distanceKm < 1
                  ? `${Math.round(cand.distanceKm * 1000)}m away`
                  : `${cand.distanceKm.toFixed(1)} km away`
                : "Nearby";

            return (
              <div key={cand._id} className={styles.candidateCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.badgeGroup}>
                    {cand.subcategory && (
                      <span className={styles.subcatBadge}>{cand.subcategory}</span>
                    )}
                    <span className={styles.distanceBadge}>
                      <MapPin size={12} />
                      {distanceStr}
                    </span>
                    <span className={styles.statusBadge}>
                      {cand.applicationStatus || "Reported"}
                    </span>
                  </div>
                </div>

                <p className={styles.description}>{cand.problemDescription}</p>

                <div className={styles.metaRow}>
                  <div className={styles.locationText} title={cand.location?.address || "Location on record"}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span>{cand.location?.address || "Location on record"}</span>
                  </div>

                  <div className={styles.supporterCount}>
                    <Users size={14} />
                    <span>
                      {count} {count === 1 ? "supporter" : "supporters"}
                    </span>
                  </div>
                </div>

                <div className={styles.actionRow}>
                  {isSupported ? (
                    <button className={styles.supportedBtn} disabled>
                      <CheckCircle2 size={16} />
                      Supported by you
                    </button>
                  ) : (
                    <button
                      className={styles.supportBtn}
                      onClick={() => handleSupportClick(cand._id)}
                      disabled={supportingId !== null}
                    >
                      {supportingId === cand._id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Supporting...
                        </>
                      ) : (
                        <>
                          <ThumbsUp size={16} />
                          Support this issue
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isSubmittingOriginal}>
            Review my report
          </button>

          <button
            className={styles.reportDifferentBtn}
            onClick={onContinueSubmit}
            disabled={isSubmittingOriginal || supportingId !== null}
          >
            {isSubmittingOriginal ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Report a different issue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimilarIssuesModal;
