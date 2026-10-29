import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Edit3,
  FileX,
  ThumbsUp,
  Heart,
  MessageSquare,
  Crosshair,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getReports, updateUserProfile, getProfileImageUrl, DEFAULT_AVATAR } from "../../services/fetching";
import NavBar from "../Navbar/NavBar";
import ReportCard, { type ReportData } from "../Feed/ReportCard";
import LocationMap from "../Map/LocationMap";
import styles from "./Profile.module.css";

interface UserCommentActivity {
  id: string;
  reportId: string;
  comment: string;
  likes: number;
  createdAt?: string;
  reportTitle?: string;
}

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"myReports" | "supportedReports" | "myComments">("myReports");
  const [allReports, setAllReports] = useState<ReportData[]>([]);
  const [userComments, setUserComments] = useState<UserCommentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editArea, setEditArea] = useState(user?.location?.area || "");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editLat, setEditLat] = useState<number | null>(user?.location?.latitude ?? null);
  const [editLng, setEditLng] = useState<number | null>(user?.location?.longitude ?? null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditArea(user.location?.area || "");
      setEditLat(user.location?.latitude ?? null);
      setEditLng(user.location?.longitude ?? null);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getReports();
        const reportsList: ReportData[] = response && response.reports ? response.reports : Array.isArray(response) ? response : [];
        setAllReports(reportsList);

        // Fetch comments for all reports to find user comments
        const commentsPromises = reportsList.map(async (r) => {
          try {
            const res = await fetch(`http://localhost:3007/api/reports/${r._id}/comments`, {
              credentials: "include",
            }).then((res) => res.json());

            if (res && res.success && Array.isArray(res.comments)) {
              return res.comments.filter(
                (c: any) => c.userId === user?.id || c.userId === user?.username
              ).map((c: any) => ({
                id: c.id,
                reportId: r._id,
                comment: c.comment,
                likes: c.likes || 0,
                createdAt: c.createdAt,
                reportTitle: r.problemDescription || r.category || "Report",
              }));
            }
          } catch (e) {
            console.error(e);
          }
          return [];
        });

        const resolvedCommentsLists = await Promise.all(commentsPromises);
        const combinedComments = resolvedCommentsLists.flat();
        setUserComments(combinedComments);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (!user) return null;

  // Filter My Reports - support ObjectId string, user ID, username, or userId field
  const myReports = allReports.filter((r: any) => {
    const creatorStr = r.createdBy ? String(r.createdBy) : "";
    const userStr = r.userId ? String(r.userId) : "";
    const targetId = user.id ? String(user.id) : "";
    const targetUsername = user.username ? String(user.username) : "";

    return (
      (creatorStr !== "" && (creatorStr === targetId || creatorStr === targetUsername)) ||
      (userStr !== "" && (userStr === targetId || userStr === targetUsername))
    );
  });

  // Filter Supported Reports using supportedBy array
  const supportedReports = allReports.filter((r) =>
    Array.isArray(r.supportedBy) ? r.supportedBy.includes(user.id) : false
  );

  const handleDetectGeo = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(pos.coords.latitude);
        setEditLng(pos.coords.longitude);
        alert("Updated coordinates to your current position!");
      },
      () => {
        alert("Unable to fetch location.");
      }
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", editName.trim());
      formData.append("area", editArea.trim());
      if (editLat !== null) formData.append("latitude", String(editLat));
      if (editLng !== null) formData.append("longitude", String(editLng));
      if (editFile) {
        formData.append("profilePhoto", editFile);
      }

      const res = await updateUserProfile(formData);
      if (res && res.success && res.user) {
        updateUser(res.user);
        setIsEditModalOpen(false);
        alert("Profile updated successfully!");
      } else {
        alert(res?.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div className={styles.profilePage}>
      <NavBar />

      <main className={styles.container}>
        {/* Profile Header */}
        <section className={styles.headerCard}>
          <div className={styles.userBasicGroup}>
            <img
              src={getProfileImageUrl(user.profilePhoto)}
              alt={user.name}
              className={styles.profileAvatar}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div className={styles.userInfo}>
              <div className={styles.nameRow}>
                <h1 className={styles.userName}>{user.name}</h1>
                <span className={styles.usernameHandle}>@{user.username}</span>
              </div>
              <div className={styles.locationPill}>
                <MapPin size={16} color="#2563eb" />
                <span>{user.location?.area || "Area Not Specified"}</span>
              </div>
              <div className={styles.joinDate}>
                <Calendar size={15} />
                <span>Member since {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className={styles.editProfileBtn}
          >
            <Edit3 size={18} />
            <span>Edit Profile</span>
          </button>
        </section>

        {/* User Map Location Section */}
        {typeof user.location?.latitude === "number" &&
          typeof user.location?.longitude === "number" && (
            <section className={styles.mapCard}>
              <h2 className={styles.sectionTitle}>Registered Citizen Geolocation</h2>
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.75rem" }}>
                Location verified via GPS coordinates ({user.location.latitude.toFixed(4)}, {user.location.longitude.toFixed(4)}).
              </p>
              <LocationMap
                latitude={user.location.latitude}
                longitude={user.location.longitude}
                address={user.location.area || "Registered Area"}
                height="220px"
              />
            </section>
          )}

        {/* User Activity Section */}
        <section>
          <div className={styles.tabsRow}>
            <button
              type="button"
              onClick={() => setActiveTab("myReports")}
              className={`${styles.tabBtn} ${activeTab === "myReports" ? styles.tabBtnActive : ""}`}
            >
              <span>My Reports</span>
              <span
                className={`${styles.tabCountBadge} ${
                  activeTab === "myReports" ? styles.tabCountBadgeActive : ""
                }`}
              >
                {myReports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("supportedReports")}
              className={`${styles.tabBtn} ${
                activeTab === "supportedReports" ? styles.tabBtnActive : ""
              }`}
            >
              <span>Supported Reports</span>
              <span
                className={`${styles.tabCountBadge} ${
                  activeTab === "supportedReports" ? styles.tabCountBadgeActive : ""
                }`}
              >
                {supportedReports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("myComments")}
              className={`${styles.tabBtn} ${activeTab === "myComments" ? styles.tabBtnActive : ""}`}
            >
              <span>My Comments</span>
              <span
                className={`${styles.tabCountBadge} ${
                  activeTab === "myComments" ? styles.tabCountBadgeActive : ""
                }`}
              >
                {userComments.length}
              </span>
            </button>
          </div>

          {/* Activity Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              Loading user activity...
            </div>
          ) : activeTab === "myReports" ? (
            myReports.length > 0 ? (
              <div className={styles.cardsGrid}>
                {myReports.map((report) => (
                  <ReportCard key={report._id} report={report} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FileX className={styles.emptyStateIcon} size={36} />
                <h3>No reports submitted yet</h3>
                <p>Grievances you submit will appear here.</p>
              </div>
            )
          ) : activeTab === "supportedReports" ? (
            supportedReports.length > 0 ? (
              <div className={styles.cardsGrid}>
                {supportedReports.map((report) => (
                  <ReportCard key={report._id} report={report} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <ThumbsUp className={styles.emptyStateIcon} size={36} />
                <h3>No supported reports</h3>
                <p>Public grievances you upvote in the Feed will show up here.</p>
              </div>
            )
          ) : userComments.length > 0 ? (
            <div className={styles.cardsGrid}>
              {userComments.map((comm) => (
                <div
                  key={comm.id}
                  className={styles.commentCard}
                  onClick={() => navigate(`/report/${comm.reportId}`)}
                >
                  <div className={styles.commentHeader}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb" }}>
                      On Grievance: {comm.reportTitle}
                    </span>
                    <span className={styles.commentDate}>{formatDate(comm.createdAt)}</span>
                  </div>
                  <p className={styles.commentText}>"{comm.comment}"</p>
                  <div className={styles.commentFooter}>
                    <div className={styles.likeCount}>
                      <Heart size={18} />
                      <span>{comm.likes} likes</span>
                    </div>
                    <span>Click to view full report</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <MessageSquare className={styles.emptyStateIcon} size={36} />
              <h3>No comments posted</h3>
              <p>Comments you leave on civic reports will appear here.</p>
            </div>
          )}
        </section>
      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Profile</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={styles.closeBtn}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>User ID (Read Only)</label>
                <input type="text" value={user.id} readOnly className={`${styles.formInput} ${styles.readOnlyInput}`} />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Username (Read Only)</label>
                <input type="text" value={`@${user.username}`} readOnly className={`${styles.formInput} ${styles.readOnlyInput}`} />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Area / Locality</label>
                <input
                  type="text"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g. Sector 62, Noida"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Coordinates (Read Only)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={editLat !== null ? `Lat: ${editLat}` : "Latitude: N/A"}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnlyInput}`}
                  />
                  <input
                    type="text"
                    value={editLng !== null ? `Lng: ${editLng}` : "Longitude: N/A"}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnlyInput}`}
                  />
                </div>
                <button type="button" onClick={handleDetectGeo} className={styles.geoBtn}>
                  <Crosshair size={16} />
                  <span>Update Location via Geolocation</span>
                </button>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={styles.editProfileBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={styles.editProfileBtn}
                  style={{ backgroundColor: "#2563eb", color: "#ffffff", borderColor: "#2563eb" }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
