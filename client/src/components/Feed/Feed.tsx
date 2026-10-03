import { useEffect, useState } from "react";
import { getReports } from "../../services/fetching";
import ReportCard from "./ReportCard";
import styles from "./Feed.module.css";

export interface Report {
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

  createdAt?: string;
  updatedAt?: string;
}

export default function Feed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await getReports();

        if (response.success) {
          setReports(response.reports);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div className={styles.feed}>
      <div className={styles.feedHeader}>
        <h1>Community Feed</h1>
        <p>See what citizens are reporting around you.</p>
      </div>

      <div className={styles.feedTabs}>
        <button>All</button>
        <button>Nearby</button>
        <button>Trending</button>
      </div>

      <div className={styles.reportList}>
        {reports.map((report) => (
          <ReportCard key={report._id} report={report} />
        ))}
      </div>
    </div>
  );
}
