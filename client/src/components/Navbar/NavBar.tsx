import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  Rss,
  User,
  Bell,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  FileText,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfileImageUrl,
  DEFAULT_AVATAR,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/fetching";
import styles from "./NavBar.module.css";

interface NotificationItem {
  _id?: string;
  id?: string;
  reportId: string;
  title: string;
  message: string;
  type?: string;
  createdAt: string;
  read: boolean;
}

export const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const isCurrent = (path: string) => location.pathname === path;

  // Socket.IO real-time notification connection
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const socket: Socket = io("http://localhost:3007");
      socket.emit("join_user", user.id);

      socket.on("notification", (newNotif: NotificationItem) => {
        setNotifications((prev) => [newNotif, ...prev]);
      });

      // Fetch existing stored notifications
      getNotifications(user.id).then((res) => {
        if (res && res.success && Array.isArray(res.notifications)) {
          setNotifications(res.notifications);
        }
      }).catch((err) => console.error("Error fetching notifications:", err));

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowReportMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    const notifId = notif._id || notif.id;
    if (notifId && !notif.read) {
      try {
        await markNotificationRead(notifId);
        setNotifications((prev) =>
          prev.map((n) => ((n._id || n.id) === notifId ? { ...n, read: true } : n))
        );
      } catch (e) {
        console.error(e);
      }
    }
    setShowNotifMenu(false);
    if (notif.reportId) {
      navigate(`/report/${notif.reportId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (user?.id) {
      try {
        await markAllNotificationsRead(user.id);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const profileImgSrc = getProfileImageUrl(user?.profilePhoto);

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* Brand / Logo */}
        <Link to={isAuthenticated ? "/feed" : "/landing"} className={styles.brandGroup}>
          <img
            src="/logo.jpeg"
            alt="JanSetu"
            className={styles.logoImg}
          />
          <div className={styles.brandTextGroup}>
            <div className={styles.brandTitleRow}>
              <span className={styles.govBadge}>GOV PORTAL</span>
            </div>
            <span className={styles.brandSubtitle}>Public Grievance Redressal</span>
          </div>
        </Link>

        {/* Actions / Nav */}
        <div className={styles.navActions}>
          {isAuthenticated ? (
            <>
              <nav className={styles.navLinksGroup}>
                <Link
                  to="/feed"
                  className={isCurrent("/feed") || isCurrent("/") ? styles.navLinkActive : styles.navLink}
                >
                  <Rss size={18} />
                  <span>Feed</span>
                </Link>

                <Link
                  to="/profile"
                  className={isCurrent("/profile") ? styles.navLinkActive : styles.navLink}
                >
                  <User size={18} />
                  <span>Profile</span>
                </Link>
              </nav>

              {/* Notification Bell Icon Dropdown */}
              <div className={styles.notifWrapper} ref={notifRef}>
                <button
                  type="button"
                  className={styles.notifBtn}
                  onClick={() => setShowNotifMenu((prev) => !prev)}
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
                </button>

                {showNotifMenu && (
                  <div className={styles.notifDropdown}>
                    <div className={styles.notifHeader}>
                      <span className={styles.notifHeaderTitle}>Notifications</span>
                      {unreadCount > 0 && (
                        <button type="button" className={styles.clearAllBtn} onClick={handleMarkAllRead}>
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.8125rem" }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n, idx) => {
                        const nId = n._id || n.id || `notif_${idx}_${n.createdAt || ""}`;
                        return (
                          <div
                            key={nId}
                            className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className={styles.notifItemTitle}>{n.title || "Notification"}</div>
                            <div className={styles.notifItemMsg}>{n.message}</div>
                            <div className={styles.notifItemTime}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Report Issue Button & Selection Dropdown */}
              <div className={styles.reportDropdown} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.topReportBtn}
                  onClick={() => setShowReportMenu((prev) => !prev)}
                >
                  <PlusCircle size={18} />
                  <span>Report Issue</span>
                  {showReportMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showReportMenu && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownHeader}>Select Reporting Method</div>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowReportMenu(false);
                        navigate("/report_manual");
                      }}
                    >
                      <FileText size={18} style={{ color: "#059669" }} />
                      <div className={styles.dropdownTextGroup}>
                        <div className={styles.dropdownTitle}>1. Manual Report</div>
                        <span className={styles.dropdownSub}>Structured multi-step form</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowReportMenu(false);
                        navigate("/report");
                      }}
                    >
                      <Sparkles size={18} style={{ color: "#2563eb" }} />
                      <div className={styles.dropdownTextGroup}>
                        <div className={styles.dropdownTitle}>2. AI Assisted Report</div>
                        <span className={styles.dropdownSub}>Conversational voice & text AI</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Logged-in User Profile Section & Logout */}
              {user && (
                <div className={styles.userSectionGroup}>
                  <Link to="/profile" className={styles.profileWrapper}>
                    <img
                      src={profileImgSrc}
                      alt={user.name || "User"}
                      className={styles.avatar}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                    <div className={styles.profileInfo}>
                      <span className={styles.profileName}>{user.name}</span>
                      <span className={styles.profileRole}>
                        {user.location?.area || "Citizen Resident"}
                      </span>
                    </div>
                  </Link>

                  <button type="button" onClick={logout} className={styles.logoutBtn}>
                    Logout
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link to="/login" className={styles.navLink}>
                Log In
              </Link>
              <Link to="/signup" className={styles.topReportBtn}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
