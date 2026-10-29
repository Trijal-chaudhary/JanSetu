import React, { useState } from "react";
import { Send, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { manualReport, toggleSupportReport } from "../../services/fetching";
import { useAuth } from "../../context/AuthContext";
import SimilarIssuesModal, { type CandidateIssue } from "../../components/SimilarIssues/SimilarIssuesModal";
import "./ReportDetails.css";

interface LocationDetails {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface EvidenceItem {
  type: "image" | "video" | "document" | "other";
  url: string;
  description?: string | null;
}

interface ReportDraft {
  category: string | null;
  subcategory: string | null;
  problemDescription: string | null;
  location: LocationDetails | null;
  issueType: string | null;
  serviceOrScheme: string | null;
  relevantDateOrDuration: string | null;
  applicationStatus: string | null;
  evidence: EvidenceItem[] | null;
  riskOrUrgency: string | null;
  impact: string | null;
  desiredResolution: string | null;
  affectedPeople?: string | null;
  createdBy?: string | null;
  userId?: string | null;
}

interface ReportDetailsProps {
  reportDraft: ReportDraft;
  onBack?: () => void;
}

const fields: { key: keyof ReportDraft; label: string }[] = [
  { key: "category", label: "Issue Category" },
  { key: "subcategory", label: "Issue Subcategory" },
  { key: "problemDescription", label: "Problem Description" },
  { key: "location", label: "Exact Location" },
  { key: "issueType", label: "Issue Type" },
  { key: "serviceOrScheme", label: "Service or Scheme" },
  { key: "relevantDateOrDuration", label: "Date or Duration" },
  { key: "applicationStatus", label: "Application Status" },
  { key: "evidence", label: "Photo / Video Evidence" },
  { key: "riskOrUrgency", label: "Risk or Urgency" },
  { key: "impact", label: "Impact" },
  { key: "desiredResolution", label: "Desired Resolution" },
];

const isNotRequired = (value: unknown) =>
  typeof value === "string" && value.trim().toLowerCase() === "notrequired";

const ReportDetails: React.FC<ReportDetailsProps> = ({ reportDraft, onBack }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [similarCandidates, setSimilarCandidates] = useState<CandidateIssue[]>([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const getSanitizedPayload = () => {
    const sanitizedDraft: any = {};
    for (const [key, value] of Object.entries(reportDraft)) {
      if (typeof value === "string" && value.trim().toLowerCase() === "notrequired") {
        sanitizedDraft[key] = null;
      } else {
        sanitizedDraft[key] = value;
      }
    }

    return {
      ...sanitizedDraft,
      createdBy: user?.id || user?.username || sanitizedDraft.createdBy || null,
      userId: user?.id || null,
    };
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = getSanitizedPayload();

      const res = await manualReport(payload);
      if (res && res.success && res.similarFound && Array.isArray(res.candidates) && res.candidates.length > 0) {
        setSimilarCandidates(res.candidates);
        return;
      }

      if (res && res.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          window.location.href = "/profile";
        }, 1200);
      } else {
        setErrorMsg(res?.message || "Failed to submit grievance. Please try again.");
      }
    } catch (e: any) {
      console.error("Grievance submission error:", e);
      setErrorMsg(e?.message || "An unexpected error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportSimilar = async (reportId: string): Promise<boolean> => {
    try {
      const res = await toggleSupportReport(reportId, user?.id);
      return Boolean(res && res.success);
    } catch (err) {
      console.error("Support error:", err);
      return false;
    }
  };

  const handleConfirmSubmitNew = async () => {
    setIsSubmittingNew(true);
    try {
      const payload = {
        ...getSanitizedPayload(),
        skipSimilarityCheck: true,
      };
      const res = await manualReport(payload);
      if (res && res.success) {
        setSimilarCandidates([]);
        setSubmitSuccess(true);
        setTimeout(() => {
          window.location.href = "/profile";
        }, 1200);
      } else {
        setErrorMsg(res?.message || "Failed to submit grievance. Please try again.");
      }
    } catch (err: any) {
      console.error("Grievance submission error:", err);
      setErrorMsg(err?.message || "An unexpected error occurred while submitting.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const renderValue = (key: keyof ReportDraft, value: unknown) => {
    if (isNotRequired(value)) {
      return (
        <span className="report-detail-status not-required">Not required</span>
      );
    }

    if (value === null || value === undefined || value === "") {
      return (
        <span className="report-detail-status not-collected">
          Not collected
        </span>
      );
    }

    if (key === "location") {
      const location = value as LocationDetails | null;

      if (!location) {
        return (
          <span className="report-detail-status not-collected">
            Not collected
          </span>
        );
      }

      const hasAddress = Boolean(location.address?.trim());
      const hasCoordinates =
        typeof location.latitude === "number" &&
        typeof location.longitude === "number";

      if (!hasAddress && !hasCoordinates) {
        return (
          <span className="report-detail-status not-collected">
            Not collected
          </span>
        );
      }

      return (
        <div className="report-detail-location">
          {hasAddress && (
            <p>
              <strong>Address:</strong> {location.address}
            </p>
          )}

          {hasCoordinates && (
            <p>
              <strong>Coordinates:</strong> {location.latitude}, {location.longitude}
            </p>
          )}
        </div>
      );
    }

    if (key === "evidence") {
      const evidence = value as EvidenceItem[] | null;

      if (!Array.isArray(evidence) || evidence.length === 0) {
        return (
          <span className="report-detail-status not-collected">
            Not collected
          </span>
        );
      }

      return (
        <div className="report-detail-evidence">
          {evidence.map((item, index) => (
            <div className="report-detail-file" key={`${item.url}-${index}`}>
              <span className="report-detail-file-type">{item.type}</span>

              <a href={item.url} target="_blank" rel="noreferrer">
                View attachment {index + 1}
              </a>

              {item.description && <p>{item.description}</p>}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "string") {
      return <p className="report-detail-value">{value}</p>;
    }

    return <p className="report-detail-value">{String(value)}</p>;
  };

  return (
    <main className="report-details-page">
      <header className="report-details-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Chat</span>
            </button>
          )}
          <div>
            <span className="report-details-eyebrow">CITIZEN GRIEVANCE REVIEW</span>
            <h1>Review Your Report</h1>
            <p>Verify all details before submitting to official government authorities.</p>
          </div>
        </div>
      </header>

      {submitSuccess && (
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto 20px",
            padding: "16px 20px",
            background: "#dcfce7",
            border: "1.5px solid #86efac",
            borderRadius: "12px",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={20} />
          <span>Grievance successfully submitted to JanSetu! Redirecting to feed...</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto 20px",
            padding: "14px 18px",
            background: "#fee2e2",
            border: "1.5px solid #fca5a5",
            borderRadius: "12px",
            color: "#991b1b",
            fontSize: "13.5px",
          }}
        >
          {errorMsg}
        </div>
      )}

      <section className="report-details-card">
        <div className="report-details-card-heading">
          <h2>Classified Information</h2>
          <span>{fields.length} fields</span>
        </div>

        <div className="report-details-list">
          {fields.map(({ key, label }) => (
            <article className="report-detail-row" key={key}>
              <h3>{label}</h3>
              <div className="report-detail-content">
                {renderValue(key, reportDraft[key])}
              </div>
            </article>
          ))}
        </div>

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: "transparent",
                border: "1px solid #cbd5e1",
                color: "#475569",
                padding: "0.875rem 1.5rem",
                borderRadius: "10px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ← Edit in Chat
            </button>
          )}

          <button
            type="button"
            className="report-submit-btn"
            disabled={submitting || submitSuccess}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              padding: "0.875rem 2rem",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: submitting ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="location-spin" />
                <span>Submitting to JanSetu...</span>
              </>
            ) : (
              <>
                <span>Submit Grievance to JanSetu</span>
                <Send size={18} />
              </>
            )}
          </button>
        </div>
      </section>

      {similarCandidates.length > 0 && (
        <SimilarIssuesModal
          candidates={similarCandidates}
          onSupport={handleSupportSimilar}
          onContinueSubmit={handleConfirmSubmitNew}
          onClose={() => setSimilarCandidates([])}
          isSubmittingOriginal={isSubmittingNew}
        />
      )}
    </main>
  );
};

export default ReportDetails;

