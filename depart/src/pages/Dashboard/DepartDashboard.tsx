import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  MapPin,
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ThumbsUp,
} from "lucide-react";
import styles from "./DepartDashboard.module.css";
import { useDepartAuth } from "../../context/DepartAuthContext";
import { ReportItem } from "../../types/depart";
import { DepartHeader } from "../../components/Header/DepartHeader";
import { ReportDetailModal } from "../../components/ReportDetailModal/ReportDetailModal";

interface Props {
  onNavigate?: (view: "dashboard" | "details") => void;
  onInspectReport?: (report: ReportItem) => void;
}

export const DepartDashboard: React.FC<Props> = ({ onNavigate, onInspectReport }) => {
  const { department } = useDepartAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const [activeModalReport, setActiveModalReport] = useState<ReportItem | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/depart/reports");
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setError(data.message || "Failed to load department report data");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching department reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    if (department) {
      const socket = io("http://localhost:3007");
      socket.emit("join_department", department.departmentId);
      socket.emit("join_category", department.category);

      socket.on("report_updated", (updatedReport: ReportItem) => {
        setReports((prev) => {
          const idB = (updatedReport._id || updatedReport.id || "").toString();
          const exists = prev.some((r) => (r._id || r.id || "").toString() === idB);
          if (exists) {
            return prev.map((r) =>
              (r._id || r.id || "").toString() === idB ? updatedReport : r
            );
          }
          return [updatedReport, ...prev];
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [department]);

  if (!department) return null;

  // Filter logic
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      (r.problemDescription || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location?.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.issueType || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubcat =
      selectedSubcategory === "ALL" || r.subcategory === selectedSubcategory;

    const currentStatus = r.applicationStatus || "Reported";
    const matchesStatus =
      selectedStatusFilter === "ALL" || currentStatus === selectedStatusFilter;

    return matchesSearch && matchesSubcat && matchesStatus;
  });

  // Calculate stats
  const totalReports = reports.length;
  const reportedCount = reports.filter(
    (r) => !r.applicationStatus || r.applicationStatus === "Reported"
  ).length;
  const reviewProgressCount = reports.filter(
    (r) => r.applicationStatus === "Under Review" || r.applicationStatus === "In Progress" || r.applicationStatus === "Reopened"
  ).length;
  const resolvedCount = reports.filter(
    (r) => r.applicationStatus === "Resolved" || r.applicationStatus === "Closed"
  ).length;
  const urgentCount = reports.filter((r) => Boolean(r.riskOrUrgency)).length;

  const handleStatusUpdated = (updatedReport: ReportItem) => {
    setReports((prev) =>
      prev.map((r) => {
        const idA = r._id || r.id;
        const idB = updatedReport._id || updatedReport.id;
        return idA === idB ? updatedReport : r;
      })
    );
    if (activeModalReport) {
      setActiveModalReport(updatedReport);
    }
  };

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "Under Review":
        return styles.statusBadgeUnderReview;
      case "In Progress":
        return styles.statusBadgeInProgress;
      case "Resolved":
        return styles.statusBadgeResolved;
      case "Closed":
        return styles.statusBadgeClosed;
      case "Reopened":
        return styles.statusBadgeReopened;
      case "Rejected":
        return styles.statusBadgeRejected;
      default:
        return styles.statusBadgeReported;
    }
  };

  const isPublicInfra = department.category.toLowerCase() === "public infrastructure";
  const locText = department.location
    ? `${department.location.area || ""}${department.location.area && department.location.city ? ", " : ""}${department.location.city || ""}${isPublicInfra ? " (10 KM Radius Zone)" : ""}`
    : "Greater Noida Authority Jurisdiction";

  const handleInspect = (report: ReportItem) => {
    if (onInspectReport) {
      onInspectReport(report);
    } else {
      setActiveModalReport(report);
    }
  };

  return (
    <div className={styles.container}>
      <DepartHeader activeView="dashboard" onNavigate={onNavigate} />

      <main className={styles.mainContent}>
        {/* Welcome Hero Banner */}
        <div className={styles.heroCard}>
          <div className={styles.heroLeft}>
            <div className={styles.locationBar}>
              <div className={styles.locationPill}>
                <MapPin size={16} className={styles.locationPillIcon} />
                {locText}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Category: <strong>{department.category}</strong>
              </span>
            </div>
            <h1 className={styles.heroTitle}>{department.departmentName}</h1>
            <p className={styles.heroSubtitle}>
              Official JanSetu Government Authority Operations & Public Grievance Dispatch Console
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.liveTag}>
              <span className={styles.liveDot} />
              Connected • {department.username || department.departmentId}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Total Grievances</span>
              <div
                className={styles.metricIconWrapper}
                style={{ background: "#eff6ff", color: "#1d4ed8" }}
              >
                <FileText size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{totalReports}</div>
            <div className={styles.metricSubtext}>Assigned to this department</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>New / Reported</span>
              <div
                className={styles.metricIconWrapper}
                style={{ background: "#fef3c7", color: "#92400e" }}
              >
                <PlusCircle size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{reportedCount}</div>
            <div className={styles.metricSubtext}>Awaiting initial review</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>In Progress / Reopened</span>
              <div
                className={styles.metricIconWrapper}
                style={{ background: "#faf5ff", color: "#6b21a8" }}
              >
                <Clock size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{reviewProgressCount}</div>
            <div className={styles.metricSubtext}>Under active resolution</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Resolved / Closed</span>
              <div
                className={styles.metricIconWrapper}
                style={{ background: "#f0fdf4", color: "#166534" }}
              >
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{resolvedCount}</div>
            <div className={styles.metricSubtext}>Successfully resolved/closed</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Urgent / Safety Risk</span>
              <div
                className={styles.metricIconWrapper}
                style={{ background: "#fef2f2", color: "#991b1b" }}
              >
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{urgentCount}</div>
            <div className={styles.metricSubtext}>High urgency flagged</div>
          </div>
        </div>

        {/* Subcategories Breakdown Pills */}
        <div className={styles.subcatBreakdown}>
          <div className={styles.breakdownHeader}>Authorized Subcategories ({department.subcategories.length})</div>
          <div className={styles.pillsRow}>
            <button
              className={`${styles.subcatPill} ${selectedSubcategory === "ALL" ? styles.subcatPillActive : ""}`}
              onClick={() => setSelectedSubcategory("ALL")}
            >
              All Subcategories <span className={styles.subcatCount}>{totalReports}</span>
            </button>

            {department.subcategories.map((sc) => {
              const count = reports.filter((r) => r.subcategory === sc).length;
              return (
                <button
                  key={sc}
                  className={`${styles.subcatPill} ${selectedSubcategory === sc ? styles.subcatPillActive : ""}`}
                  onClick={() => setSelectedSubcategory(sc)}
                >
                  {sc} <span className={styles.subcatCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Bar: Search & Status Filters */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search reports by keyword, location, or issue type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Reports Table - Balanced & Non-overflowing layout without Report ID column */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loadingSpinner}>Loading department grievance records...</div>
          ) : error ? (
            <div className={styles.emptyState} style={{ color: "#dc2626" }}>
              {error}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={40} />
              <span>No reports found matching your current filter criteria.</span>
            </div>
          ) : (
            <table className={styles.reportsTable}>
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Subcategory</th>
                  <th style={{ width: "34%" }}>Problem Description</th>
                  <th style={{ width: "20%" }}>Location</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "10%" }}>Urgency</th>
                  <th style={{ width: "5%" }}>Support</th>
                  <th style={{ width: "5%", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const rId = report._id || report.id || "N/A";
                  const status = report.applicationStatus || "Reported";
                  return (
                    <tr key={rId}>
                      <td className={styles.subcatCell} title={report.subcategory}>
                        {report.subcategory}
                      </td>
                      <td className={styles.snippetCell} title={report.problemDescription}>
                        {report.problemDescription}
                      </td>
                      <td className={styles.locationCell} title={report.location?.address || "N/A"}>
                        <span className={styles.locationText}>{report.location?.address || "Address unavailable"}</span>
                        {report.distanceKm != null && (
                          <span className={styles.distanceBadge}>
                            {report.distanceKm} km away
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        {report.riskOrUrgency ? (
                          <span className={styles.urgencyBadge} title={report.riskOrUrgency}>
                            {report.riskOrUrgency}
                          </span>
                        ) : (
                          <span className={styles.normalUrgency}>Normal</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.supportBadge} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <ThumbsUp size={13} />
                          <span>{report.supportedBy?.length || 0}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleInspect(report)}
                        >
                          Inspect & Action
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal View for Selected Report fallback */}
      {activeModalReport && !onInspectReport && (
        <ReportDetailModal
          report={activeModalReport}
          onClose={() => setActiveModalReport(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};
