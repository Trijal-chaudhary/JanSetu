import React from "react";
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
}

interface ReportDetailsProps {
  reportDraft: ReportDraft;
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

const ReportDetails: React.FC<ReportDetailsProps> = ({ reportDraft }) => {
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
              <strong>Latitude:</strong> {location.latitude}
              <br />
              <strong>Longitude:</strong> {location.longitude}
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
                View file {index + 1}
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
        <div>
          <span className="report-details-eyebrow">CITIZEN REPORT</span>
          <h1>Report Details</h1>
          <p>Review all information collected for this grievance.</p>
        </div>
      </header>

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
      </section>
    </main>
  );
};

export default ReportDetails;
