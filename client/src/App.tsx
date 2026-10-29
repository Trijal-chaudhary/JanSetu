import React from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import LandingPage from "./components/Landing/LandingPage";
import Login from "./components/Auth/Login";
import SignUp from "./components/Auth/SignUp";
import Feed from "./components/Feed/Feed";
import Profile from "./components/Profile/Profile";
import ReportDetailPage from "./components/ReportDetails/ReportDetailPage";
import Report from "./components/Report/Report";
import ManualReport from "./components/ManualReport/ManualReport";
import SensitivityReview from "./pages/SensitivityReview/SensitivityReview";
import SemanticClusteringReview from "./pages/SemanticClusteringReview/SemanticClusteringReview";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

const RootRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            border: "4px solid #cbd5e1",
            borderTopColor: "#1e40af",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: "16px",
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e40af", margin: 0 }}>
          Loading JanSetu...
        </h2>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Feed />;
  }

  return <Navigate to="/landing" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Entry Route / */}
          <Route path="/" element={<RootRoute />} />

          {/* Protected Routes */}
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/:id"
            element={
              <ProtectedRoute>
                <ReportDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report_manual"
            element={
              <ProtectedRoute>
                <ManualReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sensitivity-review"
            element={
              <ProtectedRoute>
                <SensitivityReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/semantic-review"
            element={
              <ProtectedRoute>
                <SemanticClusteringReview />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
