import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
            width: "48px",
            height: "48px",
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
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
          Authenticating citizen portal session
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
