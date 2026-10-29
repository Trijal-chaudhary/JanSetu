import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import styles from "./DepartLogin.module.css";
import { useDepartAuth } from "../../context/DepartAuthContext";

const CATEGORIES = [
  "Administrative Processes",
  "Welfare Schemes",
  "Public Infrastructure",
  "Education",
  "Public Safety",
];

export const DepartLogin: React.FC = () => {
  const { login } = useDepartAuth();
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const res = await login(username.trim(), password, category);
      if (!res.success) {
        setError(res.message || "Invalid credentials or unauthorized category.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.emblemBadge}>
            <img src="/logo.jpeg" alt="JanSetu Logo" className={styles.logoImg} />
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>JanSetu</h1>
            <span className={styles.govTag}>Department Portal</span>
          </div>
          <p className={styles.subtitle}>
            Authorized Government Authority Dashboard Access
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Department Category</label>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Department Username</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. admin_kp2, infra_kp2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Authority Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating Authority..." : "Access Department Dashboard"}
          </button>
        </form>

        <p className={styles.helperText}>
          Authorized government personnel only. Credentials are authenticated securely against official server configurations.
        </p>
      </div>
    </div>
  );
};
