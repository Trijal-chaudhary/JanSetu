import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Lock,
  Globe,
} from "lucide-react";
import NavBar from "../../components/Navbar/NavBar";
import {
  getDraft,
  saveDraft,
  classifyDraft as apiClassifyDraft,
} from "../../services/fetching";
import styles from "./SensitivityReview.module.css";

interface SensitivityData {
  status: "sensitive" | "non_sensitive";
  reason: string;
  classifiedAt?: string;
  classificationVersion?: string;
}

export const SensitivityReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryDraftId = searchParams.get("draftId");
  const draftSource = searchParams.get("source") || "ai";

  const [draftId, setDraftId] = useState<string | null>(
    queryDraftId || (location.state as any)?.draftId || null
  );

  const [draftData, setDraftData] = useState<Record<string, any> | null>(
    (location.state as any)?.draft || null
  );

  const [loadingDraft, setLoadingDraft] = useState<boolean>(!draftData);
  const [classifying, setClassifying] = useState<boolean>(false);
  const [classification, setClassification] = useState<SensitivityData | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(null);

  // Helper to run classification
  const triggerClassification = useCallback(async (targetDraftId: string, force = false) => {
    try {
      setClassifying(true);
      setClassificationError(null);
      const res = await apiClassifyDraft(targetDraftId, force);

      if (res && res.success && res.sensitivity) {
        setClassification(res.sensitivity);
      } else {
        const errorMsg =
          res?.message ||
          res?.error ||
          "Unable to complete AI sensitivity classification. Your draft is preserved. Please click retry.";
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Classification error:", err);
      setClassificationError(
        err?.message ||
          "Unable to complete AI sensitivity classification. Your draft is preserved. Please click retry."
      );
    } finally {
      setClassifying(false);
    }
  }, []);

  // Fetch draft details on load
  useEffect(() => {
    let isMounted = true;

    async function loadDraftAndClassify() {
      let activeDraftId = draftId || sessionStorage.getItem("jansetu_active_draft_id");
      let activeDraftData = draftData || (location.state as any)?.draft;

      if (!activeDraftData) {
        const cached = sessionStorage.getItem("jansetu_active_draft");
        if (cached) {
          try {
            activeDraftData = JSON.parse(cached);
          } catch {
            // ignore
          }
        }
      }

      if (!activeDraftId && !activeDraftData) {
        setLoadingDraft(false);
        setClassificationError("No active grievance draft found. Please start a grievance report.");
        return;
      }

      try {
        setLoadingDraft(true);
        setClassificationError(null);

        let res = activeDraftId ? await getDraft(activeDraftId) : null;

        // If not found in database or activeDraftId wasn't set, try saving activeDraftData
        if ((!res || !res.success || !res.draft) && activeDraftData) {
          const saveRes = await saveDraft(activeDraftData, activeDraftId || undefined);
          if (saveRes && saveRes.success && saveRes.draftId) {
            const confirmedId: string = saveRes.draftId;
            activeDraftId = confirmedId;
            setDraftId(confirmedId);
            sessionStorage.setItem("jansetu_active_draft_id", confirmedId);
            res = saveRes;
          }
        }

        if (!isMounted) return;

        if (res && res.success) {
          const loadedDraft = res.draft || activeDraftData;
          setDraftData(loadedDraft);
          if (activeDraftId) {
            setDraftId(activeDraftId);
            sessionStorage.setItem("jansetu_active_draft_id", activeDraftId);
          }

          if (res.sensitivity && res.sensitivity.status && res.sensitivity.reason) {
            setClassification(res.sensitivity);
          } else if (activeDraftId) {
            // Await Groq classification properly
            await triggerClassification(activeDraftId);
          }
        } else {
          throw new Error(res?.message || "Could not retrieve or persist grievance draft.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setClassificationError(err?.message || "Failed to load grievance draft.");
      } finally {
        if (isMounted) setLoadingDraft(false);
      }
    }

    loadDraftAndClassify();

    return () => {
      isMounted = false;
    };
  }, [draftId, triggerClassification]);

  // Navigation to the dedicated Semantic Clustering Review page
  const handleContinueToSemanticReview = () => {
    if (!draftId) return;

    if (!classification) {
      setClassificationError("Grievance must have a completed sensitivity classification before continuing.");
      return;
    }

    navigate(`/semantic-review?draftId=${draftId}&source=${draftSource}`, {
      state: {
        draftId,
        draft: draftData,
        classification,
      },
    });
  };

  const handleGoBackToEdit = () => {
    if (draftSource === "manual") {
      navigate("/report_manual", { state: { draft: draftData, draftId } });
    } else {
      navigate("/report", { state: { draft: draftData, draftId } });
    }
  };

  const isSensitive = classification?.status === "sensitive";

  return (
    <div className={styles.pageContainer}>
      <NavBar />

      <main className={styles.mainContent}>
        <div className={styles.breadcrumbBar}>
          <button
            type="button"
            className={styles.backLinkBtn}
            onClick={handleGoBackToEdit}
            title="Return to editing grievance"
          >
            <ArrowLeft size={16} />
            <span>Back to {draftSource === "manual" ? "Form" : "MargDarshak"}</span>
          </button>
          <span>/</span>
          <span>Sensitivity Review</span>
        </div>

        <section className={styles.reviewCard}>
          <header className={styles.cardHeader}>
            <h1>Step 1: Privacy & Sensitivity Review</h1>
            <p className={styles.cardSubtitle}>
              JanSetu is assessing how your grievance should be handled and whether it is suitable
              for public community visibility before checking for similar grievances.
            </p>
          </header>

          <div className={styles.cardBody}>
            {/* State A: AI Classification in Progress */}
            {(loadingDraft || classifying) && (
              <div
                className={styles.loadingContainer}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className={styles.spinnerRing} aria-hidden="true" />
                <h2 className={styles.loadingHeading}>Assessing privacy & visibility rules...</h2>
                <p className={styles.loadingDescription}>
                  MargDarshak AI is evaluating your report content to ensure sensitive personal
                  information, allegations, or privacy risks are handled with appropriate
                  safeguards.
                </p>
                <div className={styles.loadingPulseBar} aria-hidden="true" />
              </div>
            )}

                {/* Error Banner with Retry Mechanism */}
                {classificationError && !classifying && (
                  <div className={styles.errorBox} role="alert">
                    <h3 className={styles.errorTitle}>
                      <AlertTriangle size={18} />
                      <span>Sensitivity Assessment Incomplete</span>
                    </h3>
                    <p className={styles.errorMessage}>{classificationError}</p>
                    {draftId && (
                      <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={() => triggerClassification(draftId, true)}
                      >
                        <RotateCcw size={15} />
                        <span>Retry Classification</span>
                      </button>
                    )}
                  </div>
                )}

                {/* State B: Classification Result */}
                {!loadingDraft && !classifying && classification && (
                  <>
                    <div
                      className={`${styles.resultBanner} ${
                        isSensitive ? styles.resultBannerSensitive : styles.resultBannerNonSensitive
                      }`}
                      role="region"
                      aria-label="AI Sensitivity Classification Result"
                    >
                      <div className={styles.bannerTop}>
                        <div
                          className={`${styles.badgeIconWrapper} ${
                            isSensitive ? styles.iconSensitive : styles.iconNonSensitive
                          }`}
                        >
                          {isSensitive ? <Lock size={22} /> : <Globe size={22} />}
                        </div>
                        <div className={styles.badgeInfo}>
                          <h2
                            className={
                              isSensitive ? styles.labelSensitive : styles.labelNonSensitive
                            }
                          >
                            Classification: {isSensitive ? "Sensitive" : "Non-sensitive"}
                          </h2>
                          <span
                            className={`${styles.statusPill} ${
                              isSensitive ? styles.pillSensitive : styles.pillNonSensitive
                            }`}
                          >
                            {isSensitive ? "Restricted Handling" : "Community Eligible"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.reasonBox}>
                        <p className={styles.reasonLabel}>Reason for Classification</p>
                        <p className={styles.reasonText}>{classification.reason}</p>
                      </div>

                      <div className={styles.visibilityBox}>
                        <p className={styles.visibilityLabel}>What happens next:</p>
                        <p className={styles.visibilityText}>
                          {isSensitive
                            ? "Your grievance will not be published in the public community feed. It will be available to you and authorized personnel responsible for handling it."
                            : "After submission, your grievance will be eligible for community visibility and the existing community support and discussion features."}
                        </p>
                      </div>
                    </div>

                    {/* Grievance Summary Box */}
                    {draftData && (
                      <div className={styles.draftSummary}>
                        <h3 className={styles.summaryHeading}>Grievance Summary</h3>
                        <div className={styles.tagRow}>
                          {draftData.category && (
                            <span className={styles.tag}>Category: {draftData.category}</span>
                          )}
                          {draftData.subcategory && (
                            <span className={styles.tag}>
                              Subcategory: {draftData.subcategory}
                            </span>
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

                    {/* Final Action Bar */}
                    <footer className={styles.actionFooter}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={handleGoBackToEdit}
                        disabled={loadingDraft || classifying}
                      >
                        <ArrowLeft size={16} />
                        <span>Edit Grievance</span>
                      </button>

                      <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={handleContinueToSemanticReview}
                        disabled={loadingDraft || classifying || !classification}
                        title="Continue to similarity review"
                      >
                        <span>Continue</span>
                        <ArrowRight size={16} />
                      </button>
                    </footer>
                  </>
                )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SensitivityReview;
