import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Mic,
  HelpCircle,
  CheckSquare,
  FileText,
  CheckCircle,
  Brain,
  Edit3,
  Paperclip,
  Map,
  ThumbsUp,
  MessageSquare,
  Rss,
  Shield,
} from "lucide-react";
import NavBar from "../Navbar/NavBar";
import styles from "./LandingPage.module.css";

const HERO_IMAGES = [
  {
    url: "/images/hero/hero-civic-01.jpg",
    alt: "Modern Indian Civic Infrastructure and Smart Governance",
  },
  {
    url: "/images/hero/hero-civic-02.jpg",
    alt: "Indian Citizens Collaborating in Community Development",
  },
  {
    url: "/images/hero/hero-civic-03.jpg",
    alt: "Transparent Digital Public Services and Administration",
  },
  {
    url: "/images/hero/hero-civic-04.jpg",
    alt: "Clean Indian Urban Environment and Public Services",
  },
];

export const LandingPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-rotate every 12 seconds
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  // Preload upcoming hero images to prevent flashing
  useEffect(() => {
    HERO_IMAGES.forEach((img) => {
      const image = new Image();
      image.src = img.url;
    });
  }, []);

  const handleSelectSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className={styles.landingPage}>
      {/* Navigation Bar */}
      <NavBar />

      {/* Hero Section */}
      <section className={styles.heroSection}>
        {/* Background Image Carousel Layer (Right to Left Slide) */}
        <div className={styles.heroBackgroundContainer}>
          {HERO_IMAGES.map((img, index) => {
            let slideClass = styles.slideInactiveRight;
            if (index === currentSlide) {
              slideClass = styles.slideActive;
            } else if (
              index === (currentSlide - 1 + HERO_IMAGES.length) % HERO_IMAGES.length
            ) {
              slideClass = styles.slideExitLeft;
            }
            return (
              <div
                key={img.url}
                className={`${styles.heroSlide} ${slideClass}`}
                style={{ backgroundImage: `url(${img.url})` }}
                aria-hidden={index !== currentSlide}
              />
            );
          })}
        </div>

        {/* Readability Gradient Overlay */}
        <div className={styles.heroOverlay} />

        {/* Hero Content Area */}
        <div className={styles.heroContainer}>
          <h1 className={styles.heroTitle}>
            Your Voice. Your Community. <br />
            <span className={styles.heroTitleHighlight}>Better Governance.</span>
          </h1>

          <p className={styles.heroParagraph}>
            JanSetu is a citizen voice and accountability platform that empowers people to easily report grievances, attach evidence, link community issues, and drive government action through transparent tracking.
          </p>

          <div className={styles.heroBtnGroup}>
            <Link to="/signup" className={styles.btnPrimary}>
              <span>Get Started</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className={styles.btnSecondary}>
              <span>Login</span>
            </Link>
          </div>

          {/* Indicator Navigation Dots */}
          <div className={styles.slideIndicators} aria-label="Hero Image Carousel Navigation">
            {HERO_IMAGES.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicatorDot} ${
                  index === currentSlide ? styles.indicatorActive : ""
                }`}
                onClick={() => handleSelectSlide(index)}
                aria-label={`Switch to hero slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What is JanSetu? */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Platform Overview</span>
          <h2 className={styles.sectionTitle}>What is JanSetu?</h2>
          <p className={styles.sectionSubtitle}>
            Bridging the communication and accountability gap between citizens and municipal authorities across India through intelligent technology.
          </p>
        </div>

        <div className={styles.grid2}>
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.cardTitle}>The Problem We Solve</h3>
            <p className={styles.cardDesc}>
              Citizens often experience delayed administrative services, broken infrastructure, or sewage overflows, but struggle to identify responsible departments, fill out complex forms, or track issue progress.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#ecfdf5", color: "#059669" }}>
              <Sparkles size={24} />
            </div>
            <h3 className={styles.cardTitle}>The JanSetu Solution</h3>
            <p className={styles.cardDesc}>
              JanSetu provides conversational AI and simple manual tools to structure grievances, link similar neighborhood reports, and offer transparent tracking for quick administrative resolution.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.section} style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Simple Workflow</span>
          <h2 className={styles.sectionTitle}>How JanSetu Works</h2>
          <p className={styles.sectionSubtitle}>
            Four clear steps from reporting a civic issue to community action and government resolution.
          </p>
        </div>

        <div className={styles.stepContainer}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <div>
              <h3 className={styles.cardTitle}>Report</h3>
              <p className={styles.cardDesc}>
                Citizen describes the problem using text or voice in Hindi, English, or Hinglish, or submits a structured manual form.
              </p>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <div>
              <h3 className={styles.cardTitle}>Structure &amp; Classify</h3>
              <p className={styles.cardDesc}>
                JanSetu AI asks follow-up questions, extracts key facts, organizes location/evidence, and classifies sensitivity.
              </p>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <div>
              <h3 className={styles.cardTitle}>Connect</h3>
              <p className={styles.cardDesc}>
                Citizens discover nearby non-sensitive grievances, upvote issues affecting their area, and add comments or experience confirmations.
              </p>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <div>
              <h3 className={styles.cardTitle}>Act</h3>
              <p className={styles.cardDesc}>
                Structured, aggregated grievances highlight recurring issues and provide authorities with actionable insights to prioritize resolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligent Reporting Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Intelligent Guidance</span>
          <h2 className={styles.sectionTitle}>Intelligent Grievance Intake</h2>
          <p className={styles.sectionSubtitle}>
            Our interactive assistant MargDarshak helps citizens describe problems naturally without worrying about technical jargon or complicated forms.
          </p>
        </div>

        <div className={styles.flowDiagram}>
          <div className={styles.flowSteps}>
            <div className={styles.flowNode}>
              <div className={styles.flowNodeIcon}>
                <Mic size={24} />
              </div>
              <div className={styles.flowNodeText}>Citizen Description</div>
            </div>
            <ArrowRight size={18} className={styles.flowArrow} />

            <div className={styles.flowNode}>
              <div className={styles.flowNodeIcon}>
                <HelpCircle size={24} />
              </div>
              <div className={styles.flowNodeText}>AI Asks Follow-up</div>
            </div>
            <ArrowRight size={18} className={styles.flowArrow} />

            <div className={styles.flowNode}>
              <div className={styles.flowNodeIcon}>
                <CheckSquare size={24} />
              </div>
              <div className={styles.flowNodeText}>Facts Collected</div>
            </div>
            <ArrowRight size={18} className={styles.flowArrow} />

            <div className={styles.flowNode}>
              <div className={styles.flowNodeIcon}>
                <FileText size={24} />
              </div>
              <div className={styles.flowNodeText}>Structured Draft</div>
            </div>
            <ArrowRight size={18} className={styles.flowArrow} />

            <div className={styles.flowNode} style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}>
              <div className={styles.flowNodeIcon} style={{ color: "#1e40af" }}>
                <CheckCircle size={24} />
              </div>
              <div className={styles.flowNodeText} style={{ color: "#1e40af" }}>Review &amp; Submit</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className={styles.section} style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Capabilities</span>
          <h2 className={styles.sectionTitle}>Core Features</h2>
          <p className={styles.sectionSubtitle}>
            Built specifically to solve public grievance redressal challenges in Indian civic environments.
          </p>
        </div>

        <div className={styles.grid4}>
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <Brain size={24} />
            </div>
            <h3 className={styles.cardTitle}>Guided Intake</h3>
            <p className={styles.cardDesc}>
              Interactive text and voice intake in Hindi and English with smart follow-up questions.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#fef3c7", color: "#d97706" }}>
              <Edit3 size={24} />
            </div>
            <h3 className={styles.cardTitle}>Manual Reporting</h3>
            <p className={styles.cardDesc}>
              Dynamic category and subcategory form for citizens who prefer direct manual submission.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <Paperclip size={24} />
            </div>
            <h3 className={styles.cardTitle}>Evidence Upload</h3>
            <p className={styles.cardDesc}>
              Upload images, videos, or documents directly to substantiate public grievances.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#fdf2f8", color: "#db2777" }}>
              <Map size={24} />
            </div>
            <h3 className={styles.cardTitle}>Location-Based Maps</h3>
            <p className={styles.cardDesc}>
              Integrated OpenStreetMap &amp; Leaflet map visualization for exact location pinpointing.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#eff6ff", color: "#2563eb" }}>
              <ThumbsUp size={24} />
            </div>
            <h3 className={styles.cardTitle}>Community Support</h3>
            <p className={styles.cardDesc}>
              Upvote existing non-sensitive neighborhood reports to highlight urgency and scale.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#faf5ff", color: "#9333ea" }}>
              <MessageSquare size={24} />
            </div>
            <h3 className={styles.cardTitle}>Comments &amp; Discussions</h3>
            <p className={styles.cardDesc}>
              Participate in community discussions and upvote helpful community comments.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#fff7ed", color: "#ea580c" }}>
              <Rss size={24} />
            </div>
            <h3 className={styles.cardTitle}>Smart Feed</h3>
            <p className={styles.cardDesc}>
              Filter public reports by category, locality, keywords, or engagement sorting.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIconWrapper} style={{ background: "#f1f5f9", color: "#475569" }}>
              <Shield size={24} />
            </div>
            <h3 className={styles.cardTitle}>Sensitivity Protection</h3>
            <p className={styles.cardDesc}>
              Automatic classification ensuring sensitive cases remain protected with restricted access.
            </p>
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to make your voice heard?</h2>
        <p className={styles.ctaDesc}>
          Join JanSetu today to submit grievances, support community issues in your locality, and foster civic accountability.
        </p>
        <div className={styles.heroBtnGroup}>
          <Link to="/signup" className={styles.btnPrimary} style={{ backgroundColor: "#ffffff", color: "#1e40af" }}>
            <span>Create Account</span>
          </Link>
          <Link to="/login" className={styles.btnSecondary}>
            <span>Login</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <img
                  src="/logo.jpeg"
                  alt="JanSetu Logo"
                  className={styles.footerLogoImg}
                />
                <span>JanSetu</span>
              </div>
              <p style={{ lineHeight: "1.6" }}>
                Public Grievance Redressal &amp; Citizen Accountability Platform. Empowering citizens to report local civic issues and connect directly with local government authorities.
              </p>
            </div>

            <div>
              <h4 style={{ color: "#ffffff", marginBottom: "1rem" }}>Platform Features</h4>
              <p style={{ margin: "0.25rem 0" }}>Grievance Reporting</p>
              <p style={{ margin: "0.25rem 0" }}>Neighborhood Linking</p>
              <p style={{ margin: "0.25rem 0" }}>Transparent Tracking</p>
              <p style={{ margin: "0.25rem 0" }}>Department Resolution</p>
            </div>

            <div>
              <h4 style={{ color: "#ffffff", marginBottom: "1rem" }}>Quick Links</h4>
              <p style={{ margin: "0.25rem 0" }}>
                <Link to="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>
                  Sign In
                </Link>
              </p>
              <p style={{ margin: "0.25rem 0" }}>
                <Link to="/signup" style={{ color: "#94a3b8", textDecoration: "none" }}>
                  Create Account
                </Link>
              </p>
              <p style={{ margin: "0.25rem 0" }}>
                <Link to="/landing" style={{ color: "#94a3b8", textDecoration: "none" }}>
                  About Platform
                </Link>
              </p>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>&copy; 2026 JanSetu. All rights reserved. Citizen Voice &amp; Accountability Platform.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
