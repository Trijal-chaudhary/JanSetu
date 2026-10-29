import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, FileText, Check, X, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { uploadingEvidence } from "../../services/fetching";
import "./Evidence.css";

export interface UploadedEvidenceItem {
  url: string;
  type: "image" | "video" | "document" | "other";
  name?: string;
}

interface EvidenceProps {
  type?: "image" | "document" | "evidence";
  initialEvidence?: UploadedEvidenceItem[];
  isConfirmed?: boolean;
  onEvidenceSubmit?: (files: File[]) => void;
  onUploadedEvidence?: (evidenceItems: UploadedEvidenceItem[]) => void;
  onEdit?: () => void;
}

const Evidence: React.FC<EvidenceProps> = ({
  type = "evidence",
  initialEvidence = [],
  isConfirmed: initialIsConfirmed = false,
  onEvidenceSubmit,
  onUploadedEvidence,
  onEdit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ file: File; previewUrl: string | null }[]>([]);
  const [uploadedItems, setUploadedItems] = useState<UploadedEvidenceItem[]>(initialEvidence);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmed, setConfirmed] = useState(initialIsConfirmed || (initialEvidence && initialEvidence.length > 0));

  // Determine accepted file types & copy based on requested evidence type
  const isImageType = type === "image";
  const isDocumentType = type === "document";

  const acceptedMime = isImageType
    ? "image/*"
    : isDocumentType
    ? ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
    : "image/*,video/*,.pdf,.doc,.docx";

  const cardTitle = isImageType
    ? "Upload Photograph Evidence"
    : isDocumentType
    ? "Upload Supporting Document / Slip"
    : "Upload Supporting Evidence";

  const cardDescription = isImageType
    ? "Please upload clear photographs showing the defect, damage, or hazard."
    : isDocumentType
    ? "Upload receipts, identity slips, certificates, or correspondence relating to this issue."
    : "Upload photographs, videos, or documents that support your grievance.";

  // Handle files selected from input
  const processFiles = (filesList: File[]) => {
    if (!filesList || filesList.length === 0) return;

    setUploadError("");
    const newFiles = [...selectedFiles, ...filesList];
    setSelectedFiles(newFiles);

    // Generate local previews for images
    const newPreviews = filesList.map((f) => ({
      file: f,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    processFiles(files);
    event.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    processFiles(files);
  };

  // Remove pending file before upload
  const removeFile = (index: number) => {
    const toRemove = previews[index];
    if (toRemove?.previewUrl) {
      URL.revokeObjectURL(toRemove.previewUrl);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files to backend and confirm
  const handleUploadAndSubmit = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Please select at least one file to upload.");
      return;
    }

    // If caller provided legacy onEvidenceSubmit, call it
    if (onEvidenceSubmit) {
      onEvidenceSubmit(selectedFiles);
    }

    try {
      setIsUploading(true);
      setUploadError("");

      const response = await uploadingEvidence(selectedFiles);
      if (!response || !response.success || !Array.isArray(response.evidence)) {
        throw new Error(response?.message || "Failed to upload files to server.");
      }

      const uploaded: UploadedEvidenceItem[] = response.evidence.map(
        (item: { url: string; type: "image" | "video" | "document" | "other" }, idx: number) => ({
          url: item.url,
          type: item.type,
          name: selectedFiles[idx]?.name || `Attachment ${idx + 1}`,
        })
      );

      const combined = [...uploadedItems, ...uploaded];
      setUploadedItems(combined);
      setConfirmed(true);
      setSelectedFiles([]);
      setPreviews([]);

      if (onUploadedEvidence) {
        onUploadedEvidence(combined);
      }
    } catch (err: any) {
      console.error("Evidence upload error:", err);
      setUploadError(err.message || "Failed to upload files. Please check network and retry.");
    } finally {
      setIsUploading(false);
    }
  };

  // 1. Confirmed State view
  if (confirmed && uploadedItems.length > 0) {
    return (
      <div className="evidence-card-confirmed">
        <div className="evidence-confirmed-header">
          <div className="evidence-confirmed-badge">
            <Check size={14} className="evidence-badge-icon" />
            <span>
              {uploadedItems.length} {isImageType ? "Photo" : isDocumentType ? "Document" : "Evidence"} File(s) Attached
            </span>
          </div>
          <button
            type="button"
            className="evidence-edit-btn"
            onClick={() => {
              setConfirmed(false);
              if (onEdit) onEdit();
            }}
          >
            <span>+ Add More</span>
          </button>
        </div>

        <div className="evidence-confirmed-grid">
          {uploadedItems.map((item, index) => (
            <div className="evidence-confirmed-item" key={`${item.url}-${index}`}>
              {item.type === "image" ? (
                <div className="evidence-confirmed-thumb-wrapper">
                  <img src={item.url} alt="Attached evidence" className="evidence-confirmed-thumb" />
                </div>
              ) : (
                <div className="evidence-confirmed-doc-icon">
                  <FileText size={20} />
                </div>
              )}
              <div className="evidence-confirmed-item-info">
                <span className="evidence-confirmed-item-name">{item.name || `File ${index + 1}`}</span>
                <a href={item.url} target="_blank" rel="noreferrer" className="evidence-confirmed-view-link">
                  <span>View</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Interactive Upload Card
  return (
    <div className="evidence-card-5831">
      <div className="evidence-card-top">
        <div className="evidence-icon-wrapper">
          {isImageType ? <ImageIcon size={18} /> : <FileText size={18} />}
        </div>
        <div>
          <h3 className="evidence-title-5831">{cardTitle}</h3>
          <p className="evidence-description-5831">{cardDescription}</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        className="evidence-file-input-5831"
        type="file"
        accept={acceptedMime}
        multiple
        onChange={handleInputChange}
      />

      {/* Drag & Drop Zone */}
      <div
        className={`evidence-dropzone ${isDragging ? "evidence-dropzone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={28} className="evidence-dropzone-icon" />
        <p className="evidence-dropzone-prompt">
          <strong>Click to select files</strong> or drag and drop here
        </p>
        <span className="evidence-dropzone-hint">
          {isImageType ? "Supports JPG, PNG, WEBP" : isDocumentType ? "Supports PDF, DOC, DOCX, JPG" : "Images, Videos, PDFs"}
        </span>
      </div>

      {/* Pending Files List with Thumbnails */}
      {previews.length > 0 && (
        <div className="evidence-pending-list">
          <p className="evidence-section-label-5831">Selected Files ({previews.length})</p>
          <div className="evidence-preview-grid">
            {previews.map((item, index) => (
              <div className="evidence-preview-card" key={`${item.file.name}-${index}`}>
                {item.previewUrl ? (
                  <div className="evidence-thumb-container">
                    <img src={item.previewUrl} alt="Preview" className="evidence-thumb-img" />
                  </div>
                ) : (
                  <div className="evidence-doc-placeholder">
                    <FileText size={20} />
                  </div>
                )}
                <div className="evidence-file-info">
                  <span className="evidence-file-name-5831">{item.file.name}</span>
                  <span className="evidence-file-size">{(item.file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  className="evidence-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Error feedback */}
      {uploadError && (
        <div className="evidence-error-alert">
          <AlertCircle size={15} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="evidence-actions-5831">
        <button
          type="button"
          className="evidence-submit-button-5831"
          onClick={handleUploadAndSubmit}
          disabled={selectedFiles.length === 0 || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="evidence-spin" />
              <span>Uploading Evidence...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Confirm & Upload ({selectedFiles.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Evidence;
