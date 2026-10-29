import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, AlertCircle, User, Lock, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./Auth.module.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const successMessage = location.state?.message;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      return setError("Username and password are required.");
    }

    setSubmitting(true);
    setError(null);

    const result = await login({
      username: username.trim(),
      password,
    });

    setSubmitting(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Invalid username or password.");
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.brandHeader}>
          <img
            src="/logo.jpeg"
            alt="JanSetu Logo"
            className={styles.brandLogo}
          />
          <h1 className={styles.brandTitle}>Welcome Back to JanSetu</h1>
          <p className={styles.brandSubtitle}>
            Log in to manage and support civic grievance redressals
          </p>
        </div>

        {successMessage && !error && (
          <div className={styles.successBanner}>
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: error ? "16px" : 0 }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input
                type="text"
                className={styles.input}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                className={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Log In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Don't have an account?
          <Link to="/signup" className={styles.link}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
