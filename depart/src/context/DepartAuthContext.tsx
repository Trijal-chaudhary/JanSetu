import React, { createContext, useContext, useState, useEffect } from "react";
import { DepartmentInfo } from "../types/depart";

interface DepartAuthContextType {
  department: DepartmentInfo | null;
  loading: boolean;
  login: (username: string, password: string, category: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const DepartAuthContext = createContext<DepartAuthContextType | undefined>(undefined);

export const DepartAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [department, setDepartment] = useState<DepartmentInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/depart/auth/me", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.department) {
        setDepartment(data.department);
      } else {
        setDepartment(null);
      }
    } catch (err) {
      console.error("Session refresh error:", err);
      setDepartment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (username: string, password: string, category: string) => {
    try {
      const res = await fetch("/api/depart/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, category }),
      });
      const data = await res.json();
      if (data.success && data.department) {
        setDepartment(data.department);
        return { success: true };
      } else {
        return { success: false, message: data.message || "Authentication failed" };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Network error occurred" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/depart/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setDepartment(null);
    }
  };

  return (
    <DepartAuthContext.Provider value={{ department, loading, login, logout, refreshSession }}>
      {children}
    </DepartAuthContext.Provider>
  );
};

export const useDepartAuth = () => {
  const context = useContext(DepartAuthContext);
  if (!context) {
    throw new Error("useDepartAuth must be used within a DepartAuthProvider");
  }
  return context;
};
