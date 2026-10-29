import React, { createContext, useContext, useState, useEffect } from "react";
import { getMeUser, loginUser, logoutUser, signupUser } from "../services/fetching";

export interface UserAuthData {
  id: string;
  username: string;
  name: string;
  profilePhoto?: string | null;
  location?: {
    area?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  createdAt?: string;
}

interface AuthContextType {
  user: UserAuthData | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: any) => Promise<{ success: boolean; message?: string }>;
  signup: (userData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updatedUser: Partial<UserAuthData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuthData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const res = await getMeUser();
      if (res && res.success && res.authenticated && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("checkAuth error:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      const res = await loginUser(credentials);
      if (res && res.success && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        return { success: true, message: res.message };
      } else {
        return { success: false, message: res.message || "Login failed" };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || "Login request failed" };
    }
  };

  const signup = async (userData: any) => {
    try {
      const res = await signupUser(userData);
      if (res && res.success) {
        return { success: true, message: res.message || "Account created successfully" };
      } else {
        return { success: false, message: res.message || "Signup failed" };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || "Signup request failed" };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (updatedUser: Partial<UserAuthData>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
