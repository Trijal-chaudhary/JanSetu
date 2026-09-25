import React from "react";
import "./Classfication.css";
interface ClassficationProps {
  reportDraft: Record<string, any>;
}

const Classfication: React.FC<ClassficationProps> = ({ reportDraft }) => {
  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

  const isDisplayable = (value: any): boolean => {
    if (value === null || value === undefined) return false;

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      return normalized !== "" && !normalized.startsWith("notreq");
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "object") {
      return Object.values(value).some(isDisplayable);
    }

    return true;
  };

  const formatValue = (value: any): string => {
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const classifiedValues = Object.entries(reportDraft).filter(([, value]) =>
    isDisplayable(value)
  );

  return (
    <aside className="classification-sidebar">
      <div className="classification-header">
        <h3>AI Classification</h3>
        <span>{classifiedValues.length} fields</span>
      </div>

      <div className="classification-content">
        {classifiedValues.length === 0 ? (
          <p className="classification-empty">
            Classified information will appear here as you provide details.
          </p>
        ) : (
          classifiedValues.map(([key, value]) => (
            <div className="classification-item" key={key}>
              <p className="classification-key">{formatKey(key)}</p>
              <p className="classification-value">{formatValue(value)}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default Classfication;
