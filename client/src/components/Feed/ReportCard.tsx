import styles from "./Feed.module.css";
interface ReportData {
  _id: string;
  category: string | null;
  subcategory: string | null;
  problemDescription: string | null;

  location: {
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;

  issueType: string | null;
  serviceOrScheme: string | null;
  relevantDateOrDuration: string | null;
  applicationStatus: string | null;

  evidence:
    | {
        type: "image" | "video" | "document" | "other";
        url: string;
        description?: string | null;
      }[]
    | null;

  riskOrUrgency: string | null;
  impact: string | null;
  desiredResolution: string | null;
}

export default function ReportCard({ report }: { report: ReportData }) {
  return (
    <div className={styles.reportCard}>
      <div className={styles.reportHeader}>
        <div className={styles.categorySection}>
          <span className={styles.category}>{report.category}</span>

          <span className={styles.subcategory}>{report.subcategory}</span>
        </div>

        <span className={styles.status}>Reported</span>
      </div>

      <h2 className={styles.problemDescription}>{report.problemDescription}</h2>

      <p className={styles.location}>
        📍 {report.location?.address || "Location not available"}
      </p>

      {report.evidence?.length > 0 && (
        <div className={styles.evidenceContainer}>
          <img
            className={styles.evidenceImage}
            src={report.evidence[0].url}
            alt="Report evidence"
          />
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.actionButton}>👍 Support</button>

        <button className={styles.actionButton}>💬 Comment</button>
      </div>
    </div>
  );
}
