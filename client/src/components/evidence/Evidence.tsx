import React, { useRef, useState } from "react";
import "./Evidence.css";

interface EvidenceProps {
  onEvidenceSubmit: (files: File[]) => void;
}

const Evidence = ({ onEvidenceSubmit }: EvidenceProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    setFiles((prev) => [...prev, ...selectedFiles]);

    // Allow selecting the same file again.
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onEvidenceSubmit(files);
  };

  return (
    <div className="evidence-card-5831">
      <h3 className="evidence-title-5831">Share supporting evidence</h3>

      <p className="evidence-description-5831">
        If available, upload photos, videos, or documents that help us
        understand the issue you reported.
      </p>

      <input
        ref={fileInputRef}
        className="evidence-file-input-5831"
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        multiple
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="evidence-upload-button-5831"
        onClick={() => fileInputRef.current?.click()}
      >
        Choose Files
      </button>

      {files.length > 0 && (
        <div className="evidence-file-list-5831">
          <p className="evidence-section-label-5831">
            Selected files ({files.length})
          </p>

          {files.map((file, index) => (
            <div
              className="evidence-file-item-5831"
              key={`${file.name}-${index}`}
            >
              <span className="evidence-file-name-5831">{file.name}</span>

              <button
                type="button"
                className="evidence-remove-button-5831"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="evidence-actions-5831">
        <button
          type="button"
          className="evidence-submit-button-5831"
          onClick={handleSubmit}
          disabled={files.length === 0}
        >
          Submit Evidence
        </button>
      </div>
    </div>
  );
};

export default Evidence;
