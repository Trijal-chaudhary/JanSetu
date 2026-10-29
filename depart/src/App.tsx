import React, { useState } from "react";
import { DepartAuthProvider, useDepartAuth } from "./context/DepartAuthContext";
import { DepartLogin } from "./pages/Login/DepartLogin";
import { DepartDashboard } from "./pages/Dashboard/DepartDashboard";
import { DepartDetailsPage } from "./pages/DepartmentDetails/DepartDetailsPage";
import { ReportDetailPage } from "./pages/ReportDetail/ReportDetailPage";
import { ReportItem } from "./types/depart";

const AppContent: React.FC = () => {
  const { department, loading } = useDepartAuth();
  const [activeView, setActiveView] = useState<"dashboard" | "details" | "report-detail">("dashboard");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1d",
          color: "#94a3b8",
          fontFamily: "Inter, sans-serif",
          fontSize: "1.1rem",
        }}
      >
        Authenticating Department Authority Session...
      </div>
    );
  }

  if (!department) {
    return <DepartLogin />;
  }

  const handleNavigate = (view: "dashboard" | "details") => {
    setActiveView(view);
  };

  const handleInspectReport = (report: ReportItem) => {
    setSelectedReport(report);
    setActiveView("report-detail");
  };

  if (activeView === "details") {
    return <DepartDetailsPage onNavigate={handleNavigate} />;
  }

  if (activeView === "report-detail") {
    return (
      <ReportDetailPage
        report={selectedReport}
        onNavigate={handleNavigate}
        onBack={() => setActiveView("dashboard")}
        onStatusUpdated={(updated) => setSelectedReport(updated)}
      />
    );
  }

  return (
    <DepartDashboard
      onNavigate={handleNavigate}
      onInspectReport={handleInspectReport}
    />
  );
};

export const App: React.FC = () => {
  return (
    <DepartAuthProvider>
      <AppContent />
    </DepartAuthProvider>
  );
};

export default App;
