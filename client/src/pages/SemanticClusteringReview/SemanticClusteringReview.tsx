import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Lock,
  Info,
  ThumbsUp,
  Sparkles,
} from "lucide-react";
import NavBar from "../../components/Navbar/NavBar";
import {
  getDraft,
  checkDraftSimilarReports,
  submitFinalDraft,
  toggleSupportReport,
} from "../../services/fetching";
import { useAuth } from "../../context/AuthContext";
import styles from "./SemanticClusteringReview.module.css";

interface CandidateIssue {
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

export const SemanticClusteringReview: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryDraftId = searchParams.get("draftId");
  const draftSource = searchParams.get("source") || "ai";

  const [draftId] = useState<string | null>(
    queryDraftId || (location.state as any)?.draftId || sessionStorage.getItem("jansetu_active_draft_id") || null
  );

  const [draftData, setDraftData] = useState<Record<string, any> | null>(
    (location.state as any)?.draft || null
  );

  const [sensitivity, setSensitivity] = useState<any>(
    (location.state as any)?.classification || null
  );

  // Search & review states
  const [loadingDraft, setLoadingDraft] = useState<boolean>(!draftData);
  const [searching, setSearching] = useState<boolean>(true);
  const [searchCompleted, setSearchCompleted] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<CandidateIssue[]>([]);
  const [isSensitive, setIsSensitive] = useState<boolean>(false);
  const [ineligibleCategory, setIneligibleCategory] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Candidate support state
  const [supportingId, setSupportingId] = useState<string | null>(null);
  const [supportedMap, setSupportedMap] = useState<Record<string, boolean>>({});
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  // Final submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Perform semantic search check
  const runSemanticSearch = useCallback(async (targetDraftId: string) => {
    try {
      setSearching(true);
      setSearchError(null);

      const res = await checkDraftSimilarReports(targetDraftId);

      if (!res || !res.success) {
        throw new Error(res?.message || "Semantic similarity search failed.");
      }

      if (res.isSensitive) {
        setIsSensitive(true);
        setInfoMessage(
          res.message || "Public similarity checking is skipped to protect the privacy of this grievance."
        );
        setCandidates([]);
      } else if (res.ineligibleCategory) {
        setIneligibleCategory(true);
        setInfoMessage(
          res.message || "Similarity checking is not applicable for this category."
        );
        setCandidates([]);
      } else {
        const foundList: CandidateIssue[] = Array.isArray(res.candidates) ? res.candidates : [];
        setCandidates(foundList);
        // Initialize supported map
        const initialMap: Record<string, boolean> = {};
        foundList.forEach((c) => {
          if (c.isSupported) initialMap[c._id] = true;
        });
        setSupportedMap(initialMap);
      }

      setSearchCompleted(true);
    } catch (err: any) {
      console.error("Semantic search check error:", err);
      setSearchError(
        err?.message || "Unable to complete similarity check. Please retry or proceed to submission."
      );
    } finally {
      setSearching(false);
    }
  }, []);

  // Initial load: Fetch draft if not in memory, then run search
  useEffect(() => {
    let isMounted = true;

    async function initializeReview() {
      if (!draftId) {
        setLoadingDraft(false);
        setSearching(false);
        setSearchError("No active grievance draft found. Please start a grievance report.");
        return;
      }

      try {
        setLoadingDraft(true);
        let currentDraft = draftData;
        let currentSensitivity = sensitivity;

        // If draft not fully loaded in memory, fetch it
        if (!currentDraft || !currentSensitivity) {
          const res = await getDraft(draftId);
          if (!isMounted) return;

          if (res && res.success && res.draft) {
            currentDraft = res.draft;
            setDraftData(res.draft);
            if (res.sensitivity) {
              currentSensitivity = res.sensitivity;
              setSensitivity(res.sensitivity);
            }
          } else {
            throw new Error(res?.message || "Could not retrieve grievance draft.");
          }
        }

        // Fast-path: Check sensitivity status from draft
        if (currentSensitivity?.status === "sensitive") {
          setIsSensitive(true);
          setInfoMessage("Public similarity checking is skipped to protect the privacy of this grievance.");
          setSearching(false);
          setSearchCompleted(true);
          return;
        }

        // Fast-path: Check category eligibility
        if (currentDraft?.category && currentDraft.category !== "Public Infrastructure") {
          setIneligibleCategory(true);
          setInfoMessage("Similarity checking is not applicable for this category.");
          setSearching(false);
          setSearchCompleted(true);
          return;
        }

        // Run full ChromaDB search
        await runSemanticSearch(draftId);
      } catch (err: any) {
        if (!isMounted) return;
        setSearchError(err?.message || "Failed to initialize similarity review.");
      } finally {
        if (isMounted) setLoadingDraft(false);
      }
    }

    initializeReview();

    return () => {
      isMounted = false;
    };
  }, [draftId, draftData, sensitivity, runSemanticSearch]);

  // Handle supporting an existing matching report
  const handleSupportCandidate = async (reportId: string) => {
    if (supportedMap[reportId] || supportingId) return;

    try {
      setSupportingId(reportId);
      setSubmitError(null);

      const res = await toggleSupportReport(reportId, user?.id);
      if (res && res.success) {
        setSupportedMap((prev) => ({ ...prev, [reportId]: true }));
        setSupportMessage("Thank you! Your endorsement for this existing grievance has been registered.");
        sessionStorage.removeItem("jansetu_active_draft_id");
        sessionStorage.removeItem("jansetu_active_draft");

        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        setSubmitError(res?.message || "Failed to register support for this report.");
      }
    } catch (err: any) {
      console.error("Support error:", err);
      setSubmitError(err?.message || "Failed to endorse this report.");
    } finally {
      setSupportingId(null);
    }
  };

  // Final submit handler — submits draft with skipSimilarityCheck=true
  const handleFinalSubmit = async () => {
    if (!draftId) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await submitFinalDraft(draftId, true);

      if (res && res.success) {
        sessionStorage.removeItem("jansetu_active_draft_id");
        sessionStorage.removeItem("jansetu_active_draft");
        setSubmitSuccess(true);

        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        setSubmitError(res?.message || "Failed to finalize grievance. Please try again.");
      }
    } catch (err: any) {
      console.error("Final submission error:", err);
      setSubmitError(err?.message || "An unexpected error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSensitivityReview = () => {
    navigate(`/sensitivity-review?draftId=${draftId}&source=${draftSource}`, {
      state: { draftId, draft: draftData, classification: sensitivity },
    });
  };

  const isSensitiveDraft = sensitivity?.status === "sensitive" || isSensitive;

  return (
    <div className={styles.pageContainer}>
      <NavBar />

      <main className={styles.mainContent}>
        {/* Breadcrumb Navigation */}
        <div className={styles.breadcrumbBar}>
          <button
            type="button"
            className={styles.backLinkBtn}
            onClick={handleBackToSensitivityReview}
            title="Return to Sensitivity Review"
          >
            <ArrowLeft size={16} />
            <span>Back to Sensitivity Review</span>
          </button>
          <span>/</span>
          <span>Similar Grievances</span>
        </div>

        <section className={styles.reviewCard}>
          {/* Card Header */}
          <header className={styles.cardHeader}>
            <span className={styles.stepPill}>Step 2 of 2: Community Verification</span>
            <h1>Checking for Similar Grievances</h1>
            <p className={styles.cardSubtitle}>
              JanSetu checks for previously reported issues that may match your grievance, helping
              citizens discover existing cases and avoid unnecessary duplicate reports.
            </p>
          </header>

          <div className={styles.cardBody}>
            {/* Submit Success Banner */}
            {submitSuccess && (
              <div className={styles.successBanner} role="status">
                <CheckCircle2 size={48} className={styles.successIcon} />
                <h2 className={styles.successTitle}>Grievance Submitted Successfully!</h2>
                <p className={styles.successMessage}>
                  {isSensitiveDraft
                    ? "Your report has been securely registered with restricted sensitivity and assigned to the relevant department authorities."
                    : "Your report has been submitted and is now registered in JanSetu. Redirecting to your profile..."}
                </p>
              </div>
            )}

            {/* Support Success Message */}
            {supportMessage && (
              <div className={styles.successBanner} role="status">
                <CheckCircle2 size={48} className={styles.successIcon} />
                <h2 className={styles.successTitle}>Endorsement Registered!</h2>
                <p className={styles.successMessage}>{supportMessage}</p>
              </div>
            )}

            {!submitSuccess && !supportMessage && (
              <>
                {/* Grievance Summary Box */}
                {draftData && (
                  <div className={styles.draftSummary}>
                    <h3 className={styles.summaryHeading}>Your Grievance Summary</h3>
                    <div className={styles.tagRow}>
                      {draftData.category && (
                        <span className={styles.tag}>Category: {draftData.category}</span>
                      )}
                      {draftData.subcategory && (
                        <span className={styles.tag}>Subcategory: {draftData.subcategory}</span>
                      )}
                      {draftData.issueType && (
                        <span className={styles.tag}>Type: {draftData.issueType}</span>
                      )}
                    </div>

                    {draftData.problemDescription && (
                      <p className={styles.problemPreview}>
                        <strong>Description:</strong> {draftData.problemDescription}
                      </p>
                    )}

                    {draftData.location?.address && (
                      <p className={styles.locationPreview}>
                        <MapPin size={14} />
                        <span>{draftData.location.address}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* State C: Loading Search */}
                {(loadingDraft || searching) && (
                  <div
                    className={styles.loadingContainer}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <div className={styles.spinnerRing} aria-hidden="true" />
                    <h2 className={styles.loadingHeading}>Searching for similar grievances…</h2>
                    <p className={styles.loadingDescription}>
                      Checking JanSetu's semantic clustering and geographic index for matching
                      public reports nearby to prevent duplicate grievances.
                    </p>
                    <div className={styles.loadingPulseBar} aria-hidden="true" />
                  </div>
                )}

                {/* State F: Search Error */}
                {searchError && !searching && (
                  <div className={styles.errorBox} role="alert">
                    <h3 className={styles.errorTitle}>
                      <AlertTriangle size={18} />
                      <span>Similarity Search Unavailable</span>
                    </h3>
                    <p className={styles.errorMessage}>{searchError}</p>
                    <div className={styles.errorActionsRow}>
                      {draftId && (
                        <button
                          type="button"
                          className={styles.retryBtn}
                          onClick={() => runSemanticSearch(draftId)}
                        >
                          <RotateCcw size={14} />
                          <span>Retry Search</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.proceedAnywayBtn}
                        onClick={handleFinalSubmit}
                        disabled={submitting}
                      >
                        <Send size={14} />
                        <span>Proceed to Submit Grievance</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Submission Error Banner */}
                {submitError && (
                  <div className={styles.errorBox} role="alert">
                    <h3 className={styles.errorTitle}>
                      <AlertTriangle size={18} />
                      <span>Submission Error</span>
                    </h3>
                    <p className={styles.errorMessage}>{submitError}</p>
                  </div>
                )}

                {/* State G1: Sensitive Grievance (Privacy Safeguarded) */}
                {!loadingDraft && !searching && isSensitiveDraft && (
                  <div className={`${styles.infoNoticeBox} ${styles.infoNoticeSensitive}`} role="region">
                    <div className={`${styles.infoIconWrapper} ${styles.infoIconSensitive}`}>
                      <Lock size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <h3 className={styles.infoTitle}>Privacy Safeguarded</h3>
                      <p className={styles.infoMessage}>
                        {infoMessage ||
                          "Public similarity checking is skipped to protect the privacy of this grievance."}
                      </p>
                    </div>
                  </div>
                )}

                {/* State G2: Ineligible Category (Non-Infrastructure) */}
                {!loadingDraft && !searching && !isSensitiveDraft && ineligibleCategory && (
                  <div className={`${styles.infoNoticeBox} ${styles.infoNoticeIneligible}`} role="region">
                    <div className={`${styles.infoIconWrapper} ${styles.infoIconIneligible}`}>
                      <Info size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <h3 className={styles.infoTitle}>Similarity Check Not Applicable</h3>
                      <p className={styles.infoMessage}>
                        {infoMessage || "Similarity checking is not applicable for this category."}
                      </p>
                    </div>
                  </div>
                )}

                {/* State E: Explicit Empty State (No Similar Grievances Found) */}
                {!loadingDraft &&
                  !searching &&
                  searchCompleted &&
                  !isSensitiveDraft &&
                  !ineligibleCategory &&
                  candidates.length === 0 && (
                    <div
                      className={styles.emptyStateContainer}
                      role="region"
                      aria-label="No Similar Grievances Found"
                    >
                      <div className={styles.emptyStateIconWrapper}>
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className={styles.emptyStateHeading}>No Similar Grievances Found</h3>
                      <p className={styles.emptyStateDescription}>
                        We couldn't find any sufficiently similar public reports for your grievance.
                        You can proceed with submitting it as a new report.
                      </p>
                    </div>
                  )}

                {/* State D: Similar Grievances Found */}
                {!loadingDraft &&
                  !searching &&
                  searchCompleted &&
                  !isSensitiveDraft &&
                  candidates.length > 0 && (
                    <section className={styles.candidatesSection}>
                      <div className={styles.candidatesHeader}>
                        <div className={styles.candidatesHeaderLeft}>
                          <Sparkles size={16} />
                          <span>
                            Found {candidates.length} similar existing grievance
                            {candidates.length > 1 ? "s" : ""} nearby
                          </span>
                        </div>
                      </div>

                      {candidates.map((c) => {
                        const isSupported = Boolean(supportedMap[c._id]);
                        const isSupporting = supportingId === c._id;

                        return (
                          <article key={c._id} className={styles.candidateCard}>
                            <div className={styles.candidateTopRow}>
                              <div className={styles.badgeGroup}>
                                {c.subcategory && (
                                  <span className={styles.candidateCategoryBadge}>
                                    {c.subcategory}
                                  </span>
                                )}
                                {c.issueType && (
                                  <span className={styles.candidateCategoryBadge}>{c.issueType}</span>
                                )}
                              </div>
                              <span className={styles.statusBadge}>
                                {c.applicationStatus || "Reported"}
                              </span>
                            </div>

                            <p className={styles.candidateDesc}>{c.problemDescription}</p>

                            <div className={styles.candidateMetaRow}>
                              {c.location?.address && (
                                <div className={styles.candidateLocation}>
                                  <MapPin size={13} />
                                  <span>
                                    {c.location.address}
                                    {typeof c.distanceKm === "number" && (
                                      <span> ({c.distanceKm.toFixed(1)} km away)</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className={styles.supportCountPill}>
                                <ThumbsUp size={13} />
                                <span>{c.supportCount || 0} supporters</span>
                              </div>
                            </div>

                            <div className={styles.candidateCardActions}>
                              {isSupported ? (
                                <span className={styles.supportedPill}>
                                  <CheckCircle2 size={14} />
                                  <span>Supported</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.supportBtn}
                                  onClick={() => handleSupportCandidate(c._id)}
                                  disabled={Boolean(supportingId)}
                                >
                                  {isSupporting ? (
                                    <>
                                      <div className={styles.submittingSpinner} aria-hidden="true" />
                                      <span>Recording...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsUp size={14} />
                                      <span>Support This Grievance Instead</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })}

                      {/* Option to submit as distinct report */}
                      <div className={styles.distinctBox}>
                        <div className={styles.distinctBoxText}>
                          <h4>Your grievance is distinct?</h4>
                          <p>
                            If none of the above reports match your exact issue, you can still submit
                            your report as a new distinct grievance.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.submitBtn}
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <div className={styles.submittingSpinner} aria-hidden="true" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Send size={15} />
                              <span>Submit Distinct Grievance</span>
                            </>
                          )}
                        </button>
                      </div>
                    </section>
                  )}

                {/* Final Action Bar (for Empty State, Sensitive, Ineligible, or Error Fallback) */}
                {!loadingDraft &&
                  !searching &&
                  (candidates.length === 0 || isSensitiveDraft || ineligibleCategory) && (
                    <footer className={styles.actionFooter}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={handleBackToSensitivityReview}
                        disabled={submitting}
                      >
                        <ArrowLeft size={16} />
                        <span>Back to Sensitivity Review</span>
                      </button>

                      <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={handleFinalSubmit}
                        disabled={submitting}
                        title="Confirm and submit finalized grievance"
                      >
                        {submitting ? (
                          <>
                            <div className={styles.submittingSpinner} aria-hidden="true" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Submit Grievance</span>
                          </>
                        )}
                      </button>
                    </footer>
                  )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SemanticClusteringReview;

