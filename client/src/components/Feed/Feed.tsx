import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  ChevronDown,
  PlusCircle,
  Search,
  ListFilter,
  AlertTriangle,
  Inbox,
  Navigation,
  Lightbulb,
  Waves,
  Construction,
  Droplets,
  ArrowRight,
  Info,
  Plus,
  Home,
  Compass,
  Bell,
  User,
  Headphones,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { getReports } from "../../services/fetching";
import ReportCard, { type ReportData } from "./ReportCard";
import NavBar from "../Navbar/NavBar";
import { useAuth } from "../../context/AuthContext";
import {
  filterAndSortReports,
  getEligibleNearbyIssues,
  type CanonicalStatus,
  type SortOption,
  type DistanceRadius,
  getCanonicalStatus,
} from "../../utils/feedHelpers";
import { formatDistance, isValidCoordinate } from "../../utils/distance";
import styles from "./Feed.module.css";

export type Report = ReportData;

export default function Feed() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "nearby" | "recent">("all");
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<DistanceRadius>(5);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState<CanonicalStatus>("All Statuses");
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  // User location states
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (
      authUser?.location?.latitude &&
      authUser?.location?.longitude &&
      isValidCoordinate(authUser.location.latitude, authUser.location.longitude)
    ) {
      return {
        latitude: authUser.location.latitude,
        longitude: authUser.location.longitude,
      };
    }
    // Default reference coordinates for Greater Noida civic center
    return { latitude: 28.4615, longitude: 77.5132 };
  });

  const [locationName, setLocationName] = useState<string>(() => {
    return authUser?.location?.area || "Greater Noida, Uttar Pradesh";
  });
  const [hasRequestedGeo, setHasRequestedGeo] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);

  const categories = [
    "All Categories",
    "Roads & Pavements",
    "Drainage & Sewage",
    "Streetlights & Power",
    "Water Supply",
    "Public Health",
  ];

  const statuses: CanonicalStatus[] = [
    "All Statuses",
    "Reported",
    "Under Review",
    "In Progress",
    "Resolved",
    "Escalated",
  ];

  const distanceOptions: DistanceRadius[] = [1, 3, 5, 10];

  const hasValidUserLocation = isValidCoordinate(userCoords?.latitude, userCoords?.longitude);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReports();
      if (response && response.reports) {
        setReports(response.reports);
      } else if (Array.isArray(response)) {
        setReports(response);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError("Unable to connect to JanSetu grievance database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Request device location safely (at most once per explicit trigger)
  const requestDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Using reference location.");
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationName("Detected Live Location");
        setLocationError(null);
      },
      (err) => {
        setLocatingUser(false);
        console.warn("Geolocation request failed or denied:", err.message);

        // Fallback to profile coordinates if available
        if (
          authUser?.location?.latitude &&
          authUser?.location?.longitude &&
          isValidCoordinate(authUser.location.latitude, authUser.location.longitude)
        ) {
          setUserCoords({
            latitude: authUser.location.latitude,
            longitude: authUser.location.longitude,
          });
          setLocationName(authUser.location.area || "Profile Location");
          setLocationError(null);
        } else {
          // Keep Greater Noida reference coordinate
          setUserCoords({ latitude: 28.4615, longitude: 77.5132 });
          setLocationName("Greater Noida (Reference)");
          setLocationError(
            "Browser location permission was not granted. Using Greater Noida reference coordinates."
          );
        }
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }, [authUser]);

  // Handle switching to nearby tab
  const handleSelectNearbyTab = () => {
    setActiveTab("nearby");
    if (!hasRequestedGeo) {
      setHasRequestedGeo(true);
      requestDeviceLocation();
    }
    // Smooth scroll to feed controls
    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  // Reset all filters to default state
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSelectedStatus("All Statuses");
    setActiveTab("all");
    setSelectedRadiusKm(5);
    setSortBy("latest");
    setLocationError(null);
  };

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All Categories" ||
    selectedStatus !== "All Statuses" ||
    activeTab !== "all" ||
    sortBy !== "latest";

  // Memoized filter and sort computation
  const { processedReports: sortedReports, distancesMap } = useMemo(() => {
    return filterAndSortReports(reports, {
      searchQuery,
      selectedCategory,
      selectedStatus,
      activeTab,
      selectedRadiusKm,
      userLatitude: userCoords?.latitude ?? null,
      userLongitude: userCoords?.longitude ?? null,
      sortBy,
    });
  }, [
    reports,
    searchQuery,
    selectedCategory,
    selectedStatus,
    activeTab,
    selectedRadiusKm,
    userCoords,
    sortBy,
  ]);

  // Helper for status dot indicator color
  const getStatusDotColor = (status: CanonicalStatus): string => {
    switch (status) {
      case "Reported":
        return "#d97706";
      case "Under Review":
        return "#2563eb";
      case "In Progress":
        return "#9333ea";
      case "Resolved":
        return "#16a34a";
      case "Escalated":
        return "#dc2626";
      default:
        return "#64748b";
    }
  };

  // Helper to pick category icon
  const getCategoryIcon = (category: string | null, subcategory: string | null) => {
    const text = `${category || ""} ${subcategory || ""}`.toLowerCase();
    if (
      text.includes("road") ||
      text.includes("pothole") ||
      text.includes("footpath") ||
      text.includes("pavement") ||
      text.includes("bridge")
    ) {
      return <Construction size={16} />;
    }
    if (
      text.includes("drain") ||
      text.includes("sewer") ||
      text.includes("sewage") ||
      text.includes("flood") ||
      text.includes("overflow")
    ) {
      return <Waves size={16} />;
    }
    if (
      text.includes("light") ||
      text.includes("power") ||
      text.includes("electric") ||
      text.includes("transformer")
    ) {
      return <Lightbulb size={16} />;
    }
    if (text.includes("water") || text.includes("tap") || text.includes("pipe")) {
      return <Droplets size={16} />;
    }
    return <Navigation size={16} />;
  };

  // Nearby sidebar items derived from reports, sorted strictly by ascending geographic distance
  const nearbySidebarItems = useMemo(() => {
    return getEligibleNearbyIssues(
      reports,
      userCoords?.latitude ?? null,
      userCoords?.longitude ?? null,
      selectedRadiusKm,
      5
    );
  }, [reports, userCoords, selectedRadiusKm]);

  return (
    <div className={styles.main}>
      {/* ================= NAVBAR ================= */}
      <NavBar />

      {/* ================= MAIN CONTENT ================= */}
      <main className={styles.container}>
        {/* Welcome Header Section */}
        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <div className={styles.locationBar}>
                <div className={styles.locationPill}>
                  <MapPin className={styles.locationPillIcon} size={16} />
                  <span>{locationName}</span>
                </div>
                <button
                  type="button"
                  className={styles.changeLocationBtn}
                  onClick={() => {
                    handleSelectNearbyTab();
                    requestDeviceLocation();
                  }}
                  title="Click to detect device GPS coordinates"
                >
                  <span>
                    {locatingUser
                      ? "Locating device..."
                      : activeTab === "nearby"
                        ? `Active radius: ≤ ${selectedRadiusKm} km`
                        : "Change / Detect location"}
                  </span>
                  <ChevronDown size={14} />
                </button>
              </div>

              <h1 className={styles.heroTitle}>What's happening in your community?</h1>
              <p className={styles.heroSubtitle}>
                See problems reported by fellow citizens and raise your collective voice for verified
                municipal action.
              </p>
            </div>

            <div className={styles.heroRight}>
              <Link to="/report" className={styles.heroActionBtn}>
                <PlusCircle size={20} />
                <span>+ Report an Issue</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feed Controls: Search Bar, Tabs, Sort & Categories */}
        <section className={styles.feedControls}>
          {/* 1. Search Bar */}
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search grievances by keyword, locality, scheme, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 2. Controls Header: Scope Tabs, Radius, Sort */}
          <div className={styles.controlsHeader}>
            <div className={styles.controlsTitleGroup}>
              <ListFilter className={styles.controlsTitleIcon} size={20} />
              <h2 className={styles.controlsTitle}>Community Issues</h2>
            </div>

            {/* Scope Navigation Tabs, Radius Selector, and Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Scope Tabs */}
              <div className={styles.tabGroup}>
                <button
                  type="button"
                  className={activeTab === "all" ? styles.tabBtnActive : styles.tabBtn}
                  onClick={() => setActiveTab("all")}
                >
                  All Issues
                </button>
                <button
                  type="button"
                  className={activeTab === "nearby" ? styles.tabBtnActive : styles.tabBtn}
                  onClick={handleSelectNearbyTab}
                >
                  Nearby (≤ {selectedRadiusKm} km)
                </button>
                <button
                  type="button"
                  className={activeTab === "recent" ? styles.tabBtnActive : styles.tabBtn}
                  onClick={() => setActiveTab("recent")}
                >
                  Recent
                </button>
              </div>

              {/* Distance Radius Selector (Available when Nearby tab is active) */}
              {activeTab === "nearby" && (
                <div className={styles.distanceGroup}>
                  <span className={styles.distanceLabel}>Radius:</span>
                  {distanceOptions.map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      className={
                        selectedRadiusKm === radius ? styles.distanceBtnActive : styles.distanceBtn
                      }
                      onClick={() => setSelectedRadiusKm(radius)}
                    >
                      {radius} km
                    </button>
                  ))}
                </div>
              )}

              {/* Sorting Dropdown */}
              <div className={styles.sortWrapper}>
                <span className={styles.sortLabel}>Sort by:</span>
                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="supported">Most Supported</option>
                  <option value="discussed">Most Discussed</option>
                  <option value="attention">Needs Attention</option>
                </select>
              </div>
            </div>
          </div>

          {/* Needs Attention Explanatory Tooltip Banner */}
          {sortBy === "attention" && (
            <div className={styles.needsAttentionBanner}>
              <Sparkles className={styles.needsAttentionBannerIcon} size={18} />
              <div>
                <strong>Needs Attention Ranking:</strong> Prioritizes unresolved grievances waiting
                the longest without updates, boosted by citizen supporters and urgent safety risks.
                Resolved grievances are placed at the bottom.
              </div>
            </div>
          )}

          {/* Location Notice Banner if Geolocation was denied or reference is used */}
          {activeTab === "nearby" && locationError && (
            <div className={styles.locationAlertBanner}>
              <div className={styles.locationAlertTextGroup}>
                <AlertTriangle size={18} />
                <span>{locationError}</span>
              </div>
              <div className={styles.locationAlertActions}>
                <button
                  type="button"
                  className={styles.locationActionBtn}
                  onClick={() => {
                    setUserCoords({ latitude: 28.4615, longitude: 77.5132 });
                    setLocationName("Greater Noida (Reference)");
                    setLocationError(null);
                  }}
                >
                  Use Greater Noida
                </button>
                <button
                  type="button"
                  className={styles.locationActionBtnPrimary}
                  onClick={() => setActiveTab("all")}
                >
                  View All Issues
                </button>
              </div>
            </div>
          )}

          {/* 3. Status Filter Row */}
          <div className={styles.statusRow}>
            <span className={styles.filterLabel}>Status:</span>
            <div className={styles.statusPillGroup}>
              {statuses.map((st) => {
                const isActive = selectedStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    className={isActive ? styles.statusPillActive : styles.statusPill}
                    onClick={() => setSelectedStatus(st)}
                  >
                    <span
                      className={styles.statusPillDot}
                      style={{ backgroundColor: getStatusDotColor(st) }}
                    />
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Category Filter Pills */}
          <div className={styles.statusRow}>
            <span className={styles.filterLabel}>Category:</span>
            <div className={styles.categoryScroll}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={
                    selectedCategory === cat ? styles.categoryPillActive : styles.categoryPill
                  }
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Active Filters Summary and Reset Row */}
          {isFiltered && (
            <div className={styles.filterMetaRow}>
              <div className={styles.resultCountBadge}>
                <CheckCircle2 size={16} color="#1d4ed8" />
                <span>
                  Showing <strong className={styles.resultCountNumber}>{sortedReports.length}</strong>{" "}
                  of {reports.length} grievances
                </span>
              </div>

              <div className={styles.filterTagsGroup}>
                {searchQuery.trim() && (
                  <span className={styles.activeFilterTag}>Search: "{searchQuery}"</span>
                )}
                {selectedCategory !== "All Categories" && (
                  <span className={styles.activeFilterTag}>Category: {selectedCategory}</span>
                )}
                {selectedStatus !== "All Statuses" && (
                  <span className={styles.activeFilterTag}>Status: {selectedStatus}</span>
                )}
                {activeTab === "nearby" && (
                  <span className={styles.activeFilterTag}>Radius: ≤ {selectedRadiusKm} km</span>
                )}
                {activeTab === "recent" && (
                  <span className={styles.activeFilterTag}>Recent (≤ 30 days)</span>
                )}
                {sortBy !== "latest" && (
                  <span className={styles.activeFilterTag}>
                    Sort:{" "}
                    {sortBy === "attention"
                      ? "Needs Attention"
                      : sortBy === "oldest"
                        ? "Oldest"
                        : sortBy === "supported"
                          ? "Most Supported"
                          : "Most Discussed"}
                  </span>
                )}

                <button
                  type="button"
                  className={styles.resetFiltersBtn}
                  onClick={handleResetFilters}
                  title="Reset all filters to defaults"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Two-Column Layout (Feed + Sidebar) */}
        <div className={styles.contentGrid}>
          {/* Main Feed Column */}
          <div className={styles.feedColumn}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading verified community reports...</p>
              </div>
            ) : error ? (
              <div className={styles.emptyContainer}>
                <AlertTriangle className={styles.emptyIcon} size={32} />
                <h3 className={styles.emptyTitle}>Unable to load reports</h3>
                <p className={styles.emptyText}>{error}</p>
                <button
                  type="button"
                  className={styles.heroActionBtn}
                  onClick={fetchReports}
                  style={{ marginTop: "8px" }}
                >
                  Retry Connection
                </button>
              </div>
            ) : sortedReports.length === 0 ? (
              <div className={styles.emptyContainer}>
                <Inbox className={styles.emptyIcon} size={32} />
                <h3 className={styles.emptyTitle}>No community issues found</h3>
                <p className={styles.emptyText}>
                  No reports match your current filter, distance, or search criteria. Try expanding
                  your radius, changing the status, or resetting your filters.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {isFiltered && (
                    <button
                      type="button"
                      className={styles.resetFiltersBtn}
                      onClick={handleResetFilters}
                      style={{ padding: "8px 16px", fontSize: "0.875rem" }}
                    >
                      <RotateCcw size={16} />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                  <Link to="/report" className={styles.heroActionBtn}>
                    + Report an Issue
                  </Link>
                </div>
              </div>
            ) : (
              sortedReports.map((report, idx) => (
                <ReportCard
                  key={report._id}
                  report={report}
                  index={idx}
                  userDistance={distancesMap.get(report._id)}
                />
              ))
            )}
          </div>

          {/* Concise Sidebar Column */}
          <aside className={styles.sidebarColumn}>
            {/* Nearby Issues Widget */}
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <div className={styles.widgetTitleGroup}>
                  <h3 className={styles.widgetTitle}>Nearby Issues</h3>
                  <span className={styles.widgetSubtitle}>
                    {hasValidUserLocation
                      ? `Within ${selectedRadiusKm} km of your location`
                      : `Within ${selectedRadiusKm} km radius`}
                  </span>
                </div>
                <Navigation className={styles.widgetHeaderIcon} size={18} />
              </div>

              {locatingUser ? (
                <div className={styles.nearbyStatusState}>
                  <div className={styles.spinnerSmall}></div>
                  <p className={styles.nearbyStatusText}>Detecting your location...</p>
                </div>
              ) : !hasValidUserLocation ? (
                <div className={styles.nearbyStatusState}>
                  <Navigation className={styles.nearbyStatusIcon} size={22} />
                  <h4 className={styles.nearbyStatusTitle}>Location Needed</h4>
                  <p className={styles.nearbyStatusText}>
                    Enable GPS or set a reference location to find grievances near you.
                  </p>
                  <div className={styles.nearbyActionButtons}>
                    <button
                      type="button"
                      className={styles.nearbyActionBtn}
                      onClick={() => {
                        setHasRequestedGeo(true);
                        requestDeviceLocation();
                      }}
                    >
                      Detect Location
                    </button>
                    <button
                      type="button"
                      className={styles.nearbyActionBtnSecondary}
                      onClick={() => {
                        setUserCoords({ latitude: 28.4615, longitude: 77.5132 });
                        setLocationName("Greater Noida (Reference)");
                        setLocationError(null);
                      }}
                    >
                      Use Greater Noida
                    </button>
                  </div>
                </div>
              ) : nearbySidebarItems.length === 0 ? (
                <div className={styles.nearbyStatusState}>
                  <MapPin className={styles.nearbyStatusIcon} size={22} />
                  <h4 className={styles.nearbyStatusTitle}>
                    No Issues Within {selectedRadiusKm} km
                  </h4>
                  <p className={styles.nearbyStatusText}>
                    No community grievances found within {selectedRadiusKm} km of your current
                    location.
                  </p>
                  <div className={styles.nearbyActionButtons}>
                    {selectedRadiusKm < 10 && (
                      <button
                        type="button"
                        className={styles.nearbyActionBtn}
                        onClick={() => setSelectedRadiusKm(10)}
                      >
                        Expand to 10 km
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.nearbyActionBtnSecondary}
                      onClick={() => setActiveTab("all")}
                    >
                      View All Issues
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.nearbyList}>
                  {nearbySidebarItems.map(({ report: item, distanceKm }) => {
                    const canonical = getCanonicalStatus(item.applicationStatus);
                    const icon = getCategoryIcon(item.category, item.subcategory);
                    return (
                      <div
                        key={item._id}
                        className={styles.nearbyRow}
                        onClick={() => navigate(`/report/${item._id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(`/report/${item._id}`);
                          }
                        }}
                        title={`Click to view details: ${item.problemDescription || "Grievance"
                          }`}
                      >
                        <div className={styles.nearbyRowLeft}>
                          <span className={styles.nearbyIcon}>{icon}</span>
                          <div className={styles.nearbyTitleGroup}>
                            <span className={styles.nearbyRowTitle}>
                              {item.problemDescription
                                ? item.problemDescription.length > 36
                                  ? `${item.problemDescription.substring(0, 36)}...`
                                  : item.problemDescription
                                : item.subcategory || item.issueType || "Civic Grievance"}
                            </span>
                            <span className={styles.nearbyRowSub}>
                              <strong style={{ color: "#1d4ed8", fontWeight: 700 }}>
                                {formatDistance(distanceKm)} away
                              </strong>
                              {item.location?.address ? ` • ${item.location.address}` : ""}
                            </span>
                          </div>
                        </div>
                        <span
                          className={styles.nearbyChip}
                          style={{
                            backgroundColor:
                              canonical === "Resolved"
                                ? "#dcfce7"
                                : canonical === "In Progress"
                                  ? "#faf5ff"
                                  : canonical === "Under Review"
                                    ? "#eff6ff"
                                    : "#fef3c7",
                            color:
                              canonical === "Resolved"
                                ? "#166534"
                                : canonical === "In Progress"
                                  ? "#6b21a8"
                                  : canonical === "Under Review"
                                    ? "#1e40af"
                                    : "#92400e",
                            border: `1px solid ${canonical === "Resolved"
                                ? "#86efac"
                                : canonical === "In Progress"
                                  ? "#e9d5ff"
                                  : canonical === "Under Review"
                                    ? "#bfdbfe"
                                    : "#fde68a"
                              }`,
                          }}
                        >
                          {canonical}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                className={styles.viewAllLink}
                onClick={handleSelectNearbyTab}
              >
                <span>View all nearby issues</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Citizen Quick Guide Card */}
            <div className={styles.guideCard}>
              <div className={styles.guideHeader}>
                <Info className={styles.guideHeaderIcon} size={18} />
                <h4 className={styles.guideTitle}>How JanSetu Works</h4>
              </div>
              <ol className={styles.guideList}>
                <li className={styles.guideItem}>
                  <span className={styles.guideNum}>1.</span>
                  <span>
                    <strong>Post Photo & Location:</strong> Snap the civic defect with auto-GPS.
                  </span>
                </li>
                <li className={styles.guideItem}>
                  <span className={styles.guideNum}>2.</span>
                  <span>
                    <strong>Authority Notified:</strong> Auto-routed to jurisdictional civic officer.
                  </span>
                </li>
                <li className={styles.guideItem}>
                  <span className={styles.guideNum}>3.</span>
                  <span>
                    <strong>Track Resolution:</strong> Receive milestone updates & verify remediation.
                  </span>
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </main>

      {/* Floating Mobile Action Button */}
      <div className={styles.mobileFloatingBtn}>
        <Link to="/report" className={styles.floatingReportBtn}>
          <Plus size={20} />
          <span>Report Issue</span>
        </Link>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={styles.mobileBottomNav}>
        <Link to="/" className={`${styles.mobileNavItem} ${styles.mobileNavItemActive}`}>
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link to="/" className={styles.mobileNavItem}>
          <Compass size={20} />
          <span>Explore</span>
        </Link>
        <Link to="/report" className={styles.mobileNavCenter}>
          <div className={styles.mobileCenterCircle}>
            <Plus size={24} />
          </div>
          <span style={{ color: "#1d4ed8", fontWeight: 600, marginTop: "2px" }}>Report</span>
        </Link>
        <Link to="/" className={styles.mobileNavItem}>
          <Bell size={20} />
          <span>Alerts</span>
        </Link>
        <Link to="/" className={styles.mobileNavItem}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>

      {/* ================= FOOTER ================= */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <span className={styles.footerTitle}>JanSetu</span>
              <p className={styles.footerSub}>Citizen Civic Grievance & Public Redressal Portal</p>
            </div>

            <div className={styles.helplineBox}>
              <Headphones className={styles.helplineIcon} size={20} />
              <span>
                Civic Helpline: <strong>1800-11-2024</strong> (Toll Free, 24x7)
              </span>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.copyright}>
              © 2024 JanSetu Civic Administration. Open public service platform.
            </p>
            <div className={styles.footerLinks}>
              <a href="#privacy" className={styles.footerLink}>
                Privacy Policy
              </a>
              <a href="#terms" className={styles.footerLink}>
                Terms of Service
              </a>
              <a href="#guidelines" className={styles.footerLink}>
                Government Guidelines
              </a>
              <a href="#charter" className={styles.footerLink}>
                Citizen Charter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
