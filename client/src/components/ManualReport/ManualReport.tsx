import { useMemo, useState } from "react";
interface SubcategoryData {
  requiredFields: string[];
}

interface CategoryData {
  subcategories: Record<string, SubcategoryData>;
}

interface RequiredInfo {
  questions: Record<string, string>;
  categories: Record<string, CategoryData>;
}
import styles from "./ManualReport.module.css";

import requiredInfoJson from "../../data/reqInfo.json";
import { manualReport, uploadingEvidence } from "../../services/fetching";
const requiredInfo = requiredInfoJson as RequiredInfo;

interface LocationDetails {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface EvidenceItem {
  type: "image" | "video" | "document" | "other";
  url: string;
}

interface ReportForm {
  category: string;
  subcategory: string;

  problemDescription: string;
  location: LocationDetails;

  issueType: string;
  serviceOrScheme: string;
  relevantDateOrDuration: string;
  applicationStatus: string;

  evidence: EvidenceItem[];

  riskOrUrgency: string;
  impact: string;
  desiredResolution: string;
}

const initialForm: ReportForm = {
  category: "",
  subcategory: "",

  problemDescription: "",

  location: {
    address: "",
    latitude: null,
    longitude: null,
  },

  issueType: "",
  serviceOrScheme: "",
  relevantDateOrDuration: "",
  applicationStatus: "",

  evidence: [],

  riskOrUrgency: "",
  impact: "",
  desiredResolution: "",
};

const fieldLabels: Record<string, string> = {
  problemDescription: "Problem Description",
  location: "Location",
  issueType: "Issue Type",
  serviceOrScheme: "Service / Scheme",
  relevantDateOrDuration: "Relevant Date / Duration",
  applicationStatus: "Application Status",
  evidence: "Evidence",
  riskOrUrgency: "Risk / Urgency",
  impact: "Impact",
  desiredResolution: "Desired Resolution",
};

export default function ManualReport() {
  const [form, setForm] = useState<ReportForm>(initialForm);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const categories = requiredInfo.categories;

  const subcategories = useMemo(() => {
    if (!form.category) return [];

    return Object.keys(
      categories[form.category as keyof typeof categories]?.subcategories || {}
    );
  }, [form.category]);

  const requiredFields = useMemo(() => {
    if (!form.category || !form.subcategory) return [];

    const categoryData = categories[form.category as keyof typeof categories];

    if (!categoryData) return [];

    const subcategoryData =
      categoryData.subcategories[
        form.subcategory as keyof typeof categoryData.subcategories
      ];

    return subcategoryData?.requiredFields || [];
  }, [form.category, form.subcategory]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;

    setForm({
      ...initialForm,
      category,
    });
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      subcategory: e.target.value,
    }));
  };

  const handleFieldChange = (field: keyof ReportForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (
    field: keyof LocationDetails,
    value: string | number | null
  ) => {
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    setSelectedFiles(files);
  };

  const handleUploadEvidence = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    try {
      setIsUploading(true);

      const response = await uploadingEvidence(selectedFiles);

      if (!response.success) {
        alert(response.message || "Evidence upload failed.");
        return;
      }

      const uploadedEvidence: EvidenceItem[] = response.evidence.map(
        (item: { url: string; type: EvidenceItem["type"] }) => ({
          url: item.url,
          type: item.type,
        })
      );

      // Store backend URLs and types in the report
      setForm((prev) => ({
        ...prev,
        evidence: [...prev.evidence, ...uploadedEvidence],
      }));

      // Clear selected files after successful upload
      setSelectedFiles([]);

      // Reset file input
      const fileInput = document.getElementById(
        "manual-evidence-input"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      alert("Evidence uploaded successfully.");
    } catch (error) {
      console.error("Evidence upload error:", error);
      alert("Evidence upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Manual Report:", form);

    /*
      Later:

      1. Upload evidence
      2. Get uploaded URLs
      3. Send final report to backend
      4. Show confirmation
    */
    await manualReport(form);
  };

  const getQuestion = (field: string) => {
    return (
      requiredInfo.questions[field as keyof typeof requiredInfo.questions] ||
      fieldLabels[field] ||
      field
    );
  };

  const renderField = (field: string) => {
    switch (field) {
      case "problemDescription":
        return (
          <div className={styles.manualReportField}>
            <label>{fieldLabels[field]}</label>

            <textarea
              value={form.problemDescription}
              onChange={(e) =>
                handleFieldChange("problemDescription", e.target.value)
              }
              placeholder={getQuestion(field)}
              rows={5}
            />
          </div>
        );

      case "location":
        return (
          <div className={styles.manualReportLocation}>
            <label>Location</label>

            <input
              type="text"
              value={form.location.address}
              onChange={(e) => handleLocationChange("address", e.target.value)}
              placeholder="Enter complete address"
            />

            <div className={styles.manualReportLocationRow}>
              <input
                type="number"
                step="any"
                value={form.location.latitude ?? ""}
                onChange={(e) =>
                  handleLocationChange(
                    "latitude",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Latitude"
              />

              <input
                type="number"
                step="any"
                value={form.location.longitude ?? ""}
                onChange={(e) =>
                  handleLocationChange(
                    "longitude",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Longitude"
              />
            </div>

            <button
              type="button"
              className={styles.manualReportLocationButton}
              onClick={() => {
                if (!navigator.geolocation) {
                  alert("Geolocation is not supported.");
                  return;
                }

                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    handleLocationChange("latitude", position.coords.latitude);

                    handleLocationChange(
                      "longitude",
                      position.coords.longitude
                    );
                  },
                  () => {
                    alert("Unable to access your current location.");
                  }
                );
              }}
            >
              Use My Current Location
            </button>
          </div>
        );

      case "evidence":
        return (
          <div className={styles.manualReportField}>
            <label>Evidence</label>

            <input
              id="manual-evidence-input"
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />

            {selectedFiles.length > 0 && (
              <>
                <div className={styles.manualReportFileList}>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className={styles.manualReportFile}
                    >
                      <span>{file.name}</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.manualReportLocationButton}
                  onClick={handleUploadEvidence}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload Evidence"}
                </button>
              </>
            )}

            {form.evidence.length > 0 && (
              <div className={styles.manualReportFileList}>
                <p>Uploaded Evidence:</p>

                {form.evidence.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className={styles.manualReportFile}
                  >
                    <span>{item.type.toUpperCase()}</span>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Evidence
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className={styles.manualReportField}>
            <label>{fieldLabels[field] || field}</label>

            <input
              type="text"
              value={(form as unknown as Record<string, string>)[field] || ""}
              onChange={(e) =>
                handleFieldChange(field as keyof ReportForm, e.target.value)
              }
              placeholder={getQuestion(field)}
            />
          </div>
        );
    }
  };

  return (
    <div className={styles.manualReportPage}>
      <div className={styles.manualReportContainer}>
        <div className={styles.manualReportHeader}>
          <span className={styles.manualReportBadge}>Manual Mode</span>

          <h1>Report an Issue</h1>

          <p>
            Provide the required information to submit your grievance manually.
          </p>
        </div>

        <form className={styles.manualReportForm} onSubmit={handleSubmit}>
          {/* CATEGORY */}

          <div className={styles.manualReportField}>
            <label>
              Category <span>*</span>
            </label>

            <select
              value={form.category}
              onChange={handleCategoryChange}
              required
            >
              <option value="">Select a category</option>

              {Object.keys(categories).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* SUBCATEGORY */}

          {form.category && (
            <div className={styles.manualReportField}>
              <label>
                Subcategory <span>*</span>
              </label>

              <select
                value={form.subcategory}
                onChange={handleSubcategoryChange}
                required
              >
                <option value="">Select a subcategory</option>

                {subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DYNAMIC REQUIRED FIELDS */}

          {form.category && form.subcategory && requiredFields.length > 0 && (
            <div className={styles.manualReportFieldsSection}>
              <div className={styles.manualReportSectionHeader}>
                <h2>Report Details</h2>

                <p>Please provide the following required information.</p>
              </div>

              {requiredFields.map((field: string) => (
                <div key={field}>{renderField(field)}</div>
              ))}
            </div>
          )}

          {/* SUBMIT */}

          {form.category && form.subcategory && requiredFields.length > 0 && (
            <button type="submit" className={styles.manualReportSubmit}>
              Submit Report
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
