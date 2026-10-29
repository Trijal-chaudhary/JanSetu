import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  User,
  AtSign,
  Lock,
  KeyRound,
  Upload,
  RefreshCw,
  Crosshair,
  AlertTriangle,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./Auth.module.css";

export default function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Profile Photo state
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [area, setArea] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Please select a valid image.");
      return;
    }

    // Validation: max size 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Profile photo is too large.");
      return;
    }

    setProfilePhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleLocationDetect = () => {
    setLocationError(null);
    if (error) setError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
          );

          if (res.ok) {
            const data = await res.json();
            const detectedArea =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.residential ||
              data.address?.city_district ||
              data.address?.village ||
              data.address?.town ||
              data.address?.city ||
              data.display_name ||
              "";
            setArea(detectedArea);
          } else {
            setArea("");
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        } finally {
          setLocationLoading(false);
        }
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        setLocationLoading(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError(
            "Location permission was denied. Please allow location access to automatically detect your location."
          );
        } else {
          setLocationError("Unable to detect your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError("Full Name is required.");
    if (!formData.username.trim()) return setError("Username is required.");
    if (!formData.password) return setError("Password is required.");
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    setSubmitting(true);
    setError(null);

    // Build FormData
    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("username", formData.username.trim());
    payload.append("password", formData.password);
    payload.append("confirmPassword", formData.confirmPassword);

    payload.append(
      "location",
      JSON.stringify({
        area: area.trim(),
        latitude,
        longitude,
      })
    );

    if (profilePhoto) {
      payload.append("profilePhoto", profilePhoto);
    }

    const result = await signup(payload);

    setSubmitting(false);

    if (result.success) {
      navigate("/login", {
        state: { message: "Account created successfully. Please login." },
      });
    } else {
      setError(result.message || "Failed to create account.");
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
          <h1 className={styles.brandTitle}>Create JanSetu Account</h1>
          <p className={styles.brandSubtitle}>
            Join your local civic redressal community portal
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: error ? "16px" : 0 }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} size={18} />
              <input
                type="text"
                name="name"
                className={styles.input}
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <AtSign className={styles.inputIcon} size={18} />
              <input
                type="text"
                name="username"
                className={styles.input}
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={handleChange}
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
                name="password"
                className={styles.input}
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <KeyRound className={styles.inputIcon} size={18} />
              <input
                type="password"
                name="confirmPassword"
                className={styles.input}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Profile Photo Upload Section */}
          <div className={`${styles.formGroup} ${styles.photoSection}`}>
            <label className={styles.label}>Profile Photo</label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handlePhotoSelect}
            />

            {!photoPreview ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                <span>Choose Photo</span>
              </button>
            ) : (
              <div className={styles.photoPreviewContainer}>
                <img src={photoPreview} alt="Profile preview" className={styles.photoPreviewImage} />
                <div className={styles.photoActionGroup}>
                  <span className={styles.photoFileName}>{profilePhoto?.name}</span>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={16} />
                    <span>Change Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className={styles.locationSection}>
            <div className={styles.locationHeader}>
              <label className={styles.label} style={{ margin: 0 }}>
                Location
              </label>
              <button
                type="button"
                className={styles.locationBtn}
                onClick={handleLocationDetect}
                disabled={locationLoading}
              >
                <Crosshair size={16} />
                <span>
                  {locationLoading ? "Detecting location..." : "Use My Current Location"}
                </span>
              </button>
            </div>

            {locationError && (
              <div className={styles.errorBanner} style={{ marginTop: 0 }}>
                <AlertTriangle size={16} />
                <span>{locationError}</span>
              </div>
            )}

            {(latitude !== null || longitude !== null) && (
              <div className={styles.coordsGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Latitude (read-only)</label>
                  <input
                    type="text"
                    className={styles.readOnlyInput}
                    value={latitude !== null ? latitude : ""}
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Longitude (read-only)</label>
                  <input
                    type="text"
                    className={styles.readOnlyInput}
                    value={longitude !== null ? longitude : ""}
                    readOnly
                  />
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Area / Locality (editable)</label>
              <div className={styles.inputWrapper}>
                <MapPin className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  name="area"
                  className={styles.input}
                  placeholder="e.g. Knowledge Park II, Greater Noida"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>SIGN UP</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?
          <Link to="/login" className={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

