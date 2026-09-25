import React, { useMemo, useState } from "react";
import "./Home.css";

type ReportStatus = "Pending" | "In Progress" | "Resolved";
type Severity = "Low" | "Medium" | "High";

interface Report {
  id: number;
  category: string;
  title: string;
  location: string;
  status: ReportStatus;
  upvotes: number;
  corroborations: number;
  comments: number;
  timestamp: string;
  similarReports: number;
  severity: Severity;
}

const categories: string[] = [
  "All",
  "Civic",
  "Consumer",
  "Workplace",
  "Education",
  "Authority / Officer",
];

const reports: Report[] = [
  {
    id: 1,
    category: "Civic",
    title: "Large pothole near Gate 2",
    location: "Sector 12, Noida",
    status: "In Progress",
    upvotes: 31,
    corroborations: 18,
    comments: 7,
    timestamp: "24 min ago",
    similarReports: 12,
    severity: "High",
  },
  {
    id: 2,
    category: "Authority / Officer",
    title: "Application repeatedly rejected without explanation",
    location: "District Office, Lucknow",
    status: "Pending",
    upvotes: 17,
    corroborations: 9,
    comments: 11,
    timestamp: "1 hr ago",
    similarReports: 5,
    severity: "Medium",
  },
  {
    id: 3,
    category: "Education",
    title: "Scholarship applications unresolved for over 30 days",
    location: "Central University Area",
    status: "Resolved",
    upvotes: 44,
    corroborations: 27,
    comments: 16,
    timestamp: "3 hrs ago",
    similarReports: 23,
    severity: "High",
  },
  {
    id: 4,
    category: "Consumer",
    title: "Water supply interrupted for several days",
    location: "Sector 15, Noida",
    status: "Pending",
    upvotes: 22,
    corroborations: 14,
    comments: 6,
    timestamp: "5 hrs ago",
    similarReports: 8,
    severity: "Medium",
  },
];

const getStatusClass = (status: ReportStatus): string => {
  switch (status) {
    case "In Progress":
      return "status-progress";

    case "Pending":
      return "status-pending";

    case "Resolved":
      return "status-resolved";

    default:
      return "";
  }
};

const getSeverityClass = (severity: Severity): string => {
  switch (severity) {
    case "High":
      return "severity-high";

    case "Medium":
      return "severity-medium";

    case "Low":
      return "severity-low";

    default:
      return "";
  }
};

const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
};

interface ReportCardProps {
  report: Report;
}

const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  return (
    <article className="report-card">
      <div className="report-card-top">
        <div className="report-main-info">
          <div className="report-icon">
            <span>📍</span>
          </div>

          <div className="report-heading">
            <div className="report-meta">
              <span className="report-category">{report.category}</span>

              {report.severity === "High" && (
                <span
                  className={`severity-badge ${getSeverityClass(
                    report.severity
                  )}`}
                >
                  High priority
                </span>
              )}
            </div>

            <h3>{report.title}</h3>

            <div className="report-location">
              <span className="location-icon">⌖</span>
              <span>{report.location}</span>
            </div>
          </div>
        </div>

        <StatusBadge status={report.status} />
      </div>

      <div className="report-actions">
        <button className="report-action-btn">
          <span>👍</span>
          <span>{report.upvotes}</span>
        </button>

        <button className="report-action-btn corroboration-btn">
          <span>👥</span>
          <span>I faced this too · {report.corroborations}</span>
        </button>

        <button className="report-action-btn">
          <span>💬</span>
          <span>{report.comments}</span>
        </button>

        <span className="report-time">{report.timestamp}</span>
      </div>

      {report.similarReports > 0 && (
        <button className="cluster-box">
          <div className="cluster-left">
            <span className="cluster-icon">👥</span>

            <span>
              <strong>{report.similarReports} similar reports</strong> may
              belong to this incident
            </span>
          </div>

          <span className="cluster-arrow">›</span>
        </button>
      )}
    </article>
  );
};

const Home: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredReports = useMemo(() => {
    if (activeCategory === "All") {
      return reports;
    }

    return reports.filter((report) => report.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="janvoice-page">
      {/* ================= HEADER ================= */}
      <header className="top-header">
        <div className="header-inner">
          {/* Logo */}
          <div className="brand">
            <div className="brand-logo">J</div>

            <span className="brand-name">JanVoice</span>
          </div>

          {/* Search */}
          <div className="search-wrapper">
            <span className="search-icon">⌕</span>

            <input
              type="text"
              className="search-input"
              placeholder="Search reports, locations or issues..."
            />
          </div>

          {/* Header Actions */}
          <div className="header-actions">
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <span>🔔</span>
              <span className="notification-dot" />
            </button>

            <button className="profile-button">
              <span className="profile-avatar">TC</span>
            </button>

            <button className="new-report-button">
              <span className="plus-icon">+</span>
              <span>New Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="main-container">
        {/* Intro */}
        <section className="page-intro">
          <div>
            <p className="intro-label">CITIZEN VOICE</p>

            <h1>What's happening around you?</h1>

            <p className="intro-description">
              Discover issues reported by citizens, understand what's affecting
              your community, and raise your voice when something needs
              attention.
            </p>
          </div>

          <button className="map-link">
            Explore Map
            <span>›</span>
          </button>
        </section>

        {/* ================= PERSONAL SNAPSHOT ================= */}
        <section className="snapshot-card">
          <div className="snapshot-item">
            <span className="snapshot-label">Your reports</span>

            <span className="snapshot-value">
              3 <small>active</small>
            </span>
          </div>

          <div className="snapshot-divider" />

          <div className="snapshot-item">
            <span className="snapshot-label">Resolved</span>

            <span className="snapshot-value snapshot-success">1</span>
          </div>

          <div className="snapshot-divider" />

          <div className="snapshot-item">
            <span className="snapshot-label">Following</span>

            <span className="snapshot-value">
              8 <small>issues</small>
            </span>
          </div>

          <div className="snapshot-status">
            <span className="online-dot" />
            Your community activity is up to date
          </div>
        </section>

        {/* ================= CONTENT GRID ================= */}
        <div className="content-layout">
          {/* ================= MAIN FEED ================= */}
          <section className="feed-section">
            {/* Category filters */}
            <div className="category-wrapper">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-chip ${
                    activeCategory === category ? "category-chip-active" : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Feed heading */}
            <div className="feed-heading">
              <div>
                <h2>Community reports</h2>

                <p>Issues and experiences reported by people around you</p>
              </div>

              <button className="sort-button">
                Latest
                <span>⌄</span>
              </button>
            </div>

            {/* Report Cards */}
            <div className="reports-list">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>

                  <h3>No reports found</h3>

                  <p>There are no reports in this category yet.</p>
                </div>
              )}
            </div>
          </section>

          {/* ================= SIDEBAR ================= */}
          <aside className="sidebar">
            {/* Trending */}
            <div className="sidebar-card">
              <div className="sidebar-title-row">
                <div className="sidebar-title-group">
                  <span className="sidebar-title-icon">🔥</span>

                  <h3>Trending areas</h3>
                </div>
              </div>

              <div className="trending-list">
                {[
                  {
                    rank: "01",
                    area: "Sector 12",
                    reports: "28 reports",
                  },
                  {
                    rank: "02",
                    area: "Old City",
                    reports: "21 reports",
                  },
                  {
                    rank: "03",
                    area: "University Road",
                    reports: "16 reports",
                  },
                ].map((item) => (
                  <div key={item.area} className="trending-item">
                    <div className="trending-left">
                      <span className="trending-rank">{item.rank}</span>

                      <span className="trending-area">{item.area}</span>
                    </div>

                    <span className="trending-count">{item.reports}</span>
                  </div>
                ))}
              </div>

              <button className="sidebar-button">
                View Map
                <span>›</span>
              </button>
            </div>

            {/* Nearby */}
            <div className="sidebar-card">
              <h3 className="sidebar-heading">Nearby issues</h3>

              <p className="sidebar-subheading">Based on your selected area</p>

              <div className="nearby-list">
                <div className="nearby-item">
                  <div className="nearby-title">Streetlight not working</div>

                  <div className="nearby-location">
                    <span>⌖</span>
                    0.6 km away
                  </div>
                </div>

                <div className="nearby-item">
                  <div className="nearby-title">Garbage collection delayed</div>

                  <div className="nearby-location">
                    <span>⌖</span>
                    1.1 km away
                  </div>
                </div>
              </div>
            </div>

            {/* Assistant */}
            <div className="assistant-card">
              <span className="assistant-label">JANVOICE ASSISTANT</span>

              <h3>Need help with your case?</h3>

              <p>
                Ask what you can do next, understand procedures, or find
                relevant guidance in your preferred language.
              </p>

              <button className="assistant-button">
                Open Assistant
                <span>›</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* ================= MOBILE FAB ================= */}
      <button className="mobile-fab" aria-label="Create new report">
        <span>+</span>
      </button>
    </div>
  );
};

export default Home;
