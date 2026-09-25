import React from "react";
import "./ReportProgress.css";

interface ReportProgressProps {
  reportDraft: Record<string, any>;
  requiredFields: string[];
}

const fields = [
  { key: "category", label: "Issue category" },
  { key: "subcategory", label: "Issue subcategory" },
  { key: "problemDescription", label: "Issue description" },
  { key: "location", label: "Exact location" },
  { key: "issueType", label: "Issue type" },
  { key: "serviceOrScheme", label: "Service or scheme" },
  { key: "relevantDateOrDuration", label: "Date or duration" },
  { key: "applicationStatus", label: "Application status" },
  { key: "evidence", label: "Photo / video evidence" },
  { key: "riskOrUrgency", label: "Risk or urgency" },
  { key: "impact", label: "Impact" },
  { key: "desiredResolution", label: "Desired resolution" },
];

const isFilled = (key: string, value: any) => {
  if (value === null || value === undefined) return false;

  if (key === "location") {
    return Boolean(
      value.address?.trim() ||
        (typeof value.latitude === "number" &&
          typeof value.longitude === "number")
    );
  }

  if (key === "evidence") {
    return Array.isArray(value) && value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return false;
};

const ReportProgress: React.FC<ReportProgressProps> = ({
  reportDraft,
  requiredFields,
}) => {
  const requiredCount = requiredFields.length;

  const completedCount = requiredFields.filter((key) =>
    isFilled(key, reportDraft[key])
  ).length;

  const percentage =
    requiredCount === 0
      ? 0
      : Math.round((completedCount / requiredCount) * 100);

  return (
    <div className="progress-card-7392">
      <div className="progress-header-7392">
        <div>
          <p className="progress-label-7392">REPORT PROGRESS</p>
          <h2>{percentage === 100 ? "Report complete" : "Almost there"}</h2>
        </div>

        <strong className="progress-percentage-7392">{percentage}%</strong>
      </div>

      <div className="progress-track-7392">
        <div
          className="progress-value-7392"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="progress-text-7392">
        {completedCount} of {requiredCount} required details collected
      </p>

      <div className="requirement-list-7392">
        {fields.map(({ key, label }) => {
          const required = requiredFields.includes(key);
          const completed = required && isFilled(key, reportDraft[key]);

          let detail = "Not collected";

          if (!required) {
            detail = "Not required";
          } else if (completed) {
            if (key === "evidence") {
              detail = `${reportDraft.evidence.length} file(s) uploaded`;
            } else if (key === "location") {
              detail =
                reportDraft.location.address ||
                `${reportDraft.location.latitude}, ${reportDraft.location.longitude}`;
            } else {
              detail = reportDraft[key];
            }
          }

          return (
            <div
              key={key}
              className={`requirement-item-7392 ${
                !required ? "not-required-7392" : ""
              }`}
            >
              <span
                className={`requirement-icon-7392 ${
                  !required
                    ? "not-required-icon-7392"
                    : completed
                    ? "completed-icon-7392"
                    : "pending-icon-7392"
                }`}
              >
                {!required ? "—" : completed ? "✓" : "○"}
              </span>

              <div className="requirement-content-7392">
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportProgress;
