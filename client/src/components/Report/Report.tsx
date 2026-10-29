import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  ArrowUp,
  Paperclip,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Languages,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Report.module.css";
import { givingInfo, saveDraft } from "../../services/fetching";
import LocationCard, { type LocationData } from "../locationcard/LocationCard";
import Evidence, { type UploadedEvidenceItem } from "../evidence/Evidence";
import ReportProgress from "../ReportProgress/ReportProgress";
import Classfication from "../Classfication/Classfication";
import ReportDetails from "../../pages/DIsplayinfo/ReportDetails";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useAuth } from "../../context/AuthContext";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  type?: string;
  isConfirmed?: boolean;
}

interface AudioPlaybackState {
  messageId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
}

const getCurrentTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Report: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [done, setDone] = useState<boolean>(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([
    "category",
    "subcategory",
    "problemDescription",
    "location",
  ]);

  const [reportDraft, setReportDraft] = useState({
    createdBy: user?.id || user?.username || null,
    category: null as string | null,
    subcategory: null as string | null,
    problemDescription: null as string | null,

    location: {
      address: null as string | null,
      latitude: null as number | null,
      longitude: null as number | null,
    },

    issueType: null as string | null,
    serviceOrScheme: null as string | null,
    relevantDateOrDuration: null as string | null,
    applicationStatus: null as string | null,

    evidence: [] as {
      url: string;
      type: "image" | "video" | "document" | "other";
    }[],

    riskOrUrgency: null as string | null,
    impact: null as string | null,
    desiredResolution: null as string | null,
    affectedPeople: null as string | null,
  });

  const [isThinking, setIsThinking] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttLang, setSttLang] = useState<"en-IN" | "hi-IN">("en-IN");

  const [audioState, setAudioState] = useState<AudioPlaybackState>({
    messageId: null,
    isPlaying: false,
    isPaused: false,
  });

  const [messages, setMessage] = useState<Message[]>([
    {
      id: "msg_init",
      role: "assistant",
      text: "Namaste! I am MargDarshak AI. Please describe the grievance or civic issue you are facing.",
      time: getCurrentTime(),
      type: "text",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const baseTextRef = useRef<string>("");
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Restore draft if returning from Sensitivity Review page
  useEffect(() => {
    if ((location.state as any)?.draft) {
      setReportDraft((prev) => ({
        ...prev,
        ...(location.state as any).draft,
      }));
    }
  }, [location.state]);

  const navigateToSensitivityReview = async (finalDraft: any) => {
    try {
      const sanitizedDraft = {
        ...finalDraft,
        createdBy: user?.id || user?.username || finalDraft.createdBy || null,
        userId: user?.id || null,
      };
      const res = await saveDraft(sanitizedDraft);
      const targetDraftId = res?.draftId || `draft_${Date.now()}`;
      sessionStorage.setItem("jansetu_active_draft_id", targetDraftId);
      sessionStorage.setItem("jansetu_active_draft", JSON.stringify(sanitizedDraft));
      navigate(`/sensitivity-review?draftId=${targetDraftId}&source=ai`, {
        state: { draftId: targetDraftId, draft: sanitizedDraft },
      });
    } catch (e) {
      console.error("Error saving draft for review:", e);
      navigate("/sensitivity-review?source=ai", {
        state: { draft: finalDraft },
      });
    }
  };

  // Text to Speech playback controller
  const handleToggleAudio = (msgId: string, rawText: string) => {
    if (!("speechSynthesis" in window)) {
      setChatError("Speech synthesis is not supported in this browser.");
      return;
    }

    // 1. If currently playing this exact message -> pause it
    if (audioState.messageId === msgId && audioState.isPlaying) {
      window.speechSynthesis.pause();
      setAudioState({ messageId: msgId, isPlaying: false, isPaused: true });
      return;
    }

    // 2. If paused on this exact message -> resume it
    if (audioState.messageId === msgId && audioState.isPaused) {
      window.speechSynthesis.resume();
      setAudioState({ messageId: msgId, isPlaying: true, isPaused: false });
      return;
    }

    // 3. Otherwise: start fresh playback for this message
    window.speechSynthesis.cancel();

    // Strip Markdown symbols and URLs so spoken voice is clean
    const cleanText = rawText
      .replace(/[#*_`~>[\]]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[•●📍📎✦]/gu, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = /[\u0900-\u097F]/.test(cleanText) ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    activeUtteranceRef.current = utterance;

    utterance.onstart = () => {
      setAudioState({ messageId: msgId, isPlaying: true, isPaused: false });
    };

    utterance.onpause = () => {
      setAudioState({ messageId: msgId, isPlaying: false, isPaused: true });
    };

    utterance.onresume = () => {
      setAudioState({ messageId: msgId, isPlaying: true, isPaused: false });
    };

    utterance.onend = () => {
      activeUtteranceRef.current = null;
      setAudioState({ messageId: null, isPlaying: false, isPaused: false });
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis utterance error:", e);
      activeUtteranceRef.current = null;
      setAudioState({ messageId: null, isPlaying: false, isPaused: false });
    };

    try {
      window.speechSynthesis.speak(utterance);
      setAudioState({ messageId: msgId, isPlaying: true, isPaused: false });
    } catch (err) {
      console.error("Speech playback error:", err);
      setAudioState({ messageId: null, isPlaying: false, isPaused: false });
    }
  };

  // Safe Speech Recognition Hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const isSpeechSupported = Boolean(browserSupportsSpeechRecognition);

  // Synchronize incoming transcript with input while preserving prior typed text
  useEffect(() => {
    if (listening && transcript) {
      setQuestion(baseTextRef.current + transcript);
    }
  }, [transcript, listening]);

  // When listening ends naturally, clear baseTextRef
  useEffect(() => {
    if (!listening) {
      baseTextRef.current = "";
    }
  }, [listening]);

  const handleStartListening = () => {
    setSttError(null);
    if (!browserSupportsSpeechRecognition) {
      setSttError("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }
    if (isMicrophoneAvailable === false) {
      setSttError("Microphone access is blocked. Please enable microphone permissions in your browser.");
      return;
    }

    const currentVal = question.trim();
    baseTextRef.current = currentVal ? `${currentVal} ` : "";
    resetTranscript();

    try {
      SpeechRecognition.startListening({
        continuous: true,
        language: sttLang,
      });
    } catch (err) {
      console.error("STT start error:", err);
      setSttError("Failed to start speech recognition. Please retry.");
    }
  };

  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };

  const toggleSttLanguage = () => {
    const nextLang = sttLang === "en-IN" ? "hi-IN" : "en-IN";
    setSttLang(nextLang);
    if (listening) {
      SpeechRecognition.stopListening();
      setTimeout(() => {
        baseTextRef.current = question.trim() ? `${question.trim()} ` : "";
        resetTranscript();
        SpeechRecognition.startListening({
          continuous: true,
          language: nextLang,
        });
      }, 150);
    }
  };

  // Handle citizen text response
  const handleReply = async (userTextToSend?: string) => {
    const textToSend = typeof userTextToSend === "string" ? userTextToSend.trim() : question.trim();
    if (!textToSend || isThinking) return;

    if (listening) {
      SpeechRecognition.stopListening();
    }
    resetTranscript();
    baseTextRef.current = "";

    setChatError(null);
    setSttError(null);
    const userMsgId = `msg_user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      time: getCurrentTime(),
      type: "text",
    };

    const updatedMessages = [...messages, userMsg];
    setMessage(updatedMessages);
    setQuestion("");
    setIsThinking(true);

    try {
      const response = await givingInfo(textToSend, updatedMessages, reportDraft);

      if (!response || !response.success || !response.result) {
        throw new Error(response?.message || "Failed to receive response from MargDarshak AI.");
      }

      const res = response.result;

      // Update draft with verified backend data and preserve user createdBy
      const mergedDraft = {
        ...reportDraft,
        ...res.reportDraft,
        createdBy: reportDraft.createdBy || user?.id || user?.username || null,
      };
      setReportDraft(mergedDraft);

      if (Array.isArray(res.requiredFields) && res.requiredFields.length > 0) {
        setRequiredFields(res.requiredFields);
      }

      const assistantMsgId = `msg_ai_${Date.now()}`;

      if (res.assistantMessage) {
        handleToggleAudio(assistantMsgId, res.assistantMessage);
      }

      if (res.isComplete) {
        const fullDraft = { ...reportDraft, ...res.reportDraft };
        navigateToSensitivityReview(fullDraft);
        return;
      }

      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: res.assistantMessage || "Thank you. Let me verify the details.",
        time: getCurrentTime(),
        type: res.requestedInputType || res.aiQueryType || "text",
      };

      setMessage((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setChatError(error?.message || "Connection error. Please try sending your message again.");
    } finally {
      setIsThinking(false);
    }
  };

  // Handle confirmed location from LocationCard
  const handleLocationConfirm = async (messageId: string, location: LocationData) => {
    setMessage((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isConfirmed: true } : m))
    );

    const updatedDraft = {
      ...reportDraft,
      location: {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    };
    setReportDraft(updatedDraft);

    let locationText = "📍 Incident location selected: ";
    if (location.address) {
      locationText += location.address;
    }
    if (location.latitude !== null && location.longitude !== null) {
      locationText += ` (Coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)})`;
    }

    const userMsg: Message = {
      id: `msg_user_loc_${Date.now()}`,
      role: "user",
      text: locationText,
      time: getCurrentTime(),
      type: "text",
    };

    const updatedMessages = [...messages, userMsg];
    setMessage(updatedMessages);
    setIsThinking(true);
    setChatError(null);

    try {
      const response = await givingInfo(locationText, updatedMessages, updatedDraft);
      if (!response || !response.success || !response.result) {
        throw new Error(response?.message || "Failed to process location.");
      }

      const res = response.result;
      setReportDraft((prev) => ({
        ...prev,
        ...res.reportDraft,
        createdBy: prev.createdBy || user?.id || user?.username || null,
      }));

      if (Array.isArray(res.requiredFields) && res.requiredFields.length > 0) {
        setRequiredFields(res.requiredFields);
      }

      const assistantMsgId = `msg_ai_${Date.now()}`;

      if (res.assistantMessage) {
        handleToggleAudio(assistantMsgId, res.assistantMessage);
      }
      if (res.isComplete) {
        const fullDraft = { ...reportDraft, ...res.reportDraft };
        navigateToSensitivityReview(fullDraft);
        return;
      }

      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: res.assistantMessage,
        time: getCurrentTime(),
        type: res.requestedInputType || res.aiQueryType || "text",
      };
      setMessage((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Location submit error:", err);
      setChatError(err?.message || "Failed to process location. Please retry.");
    } finally {
      setIsThinking(false);
    }
  };

  // Handle confirmed evidence from Evidence card
  const handleEvidenceConfirm = async (messageId: string, items: UploadedEvidenceItem[]) => {
    setMessage((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isConfirmed: true } : m))
    );

    const updatedEvidence = items.map((it) => ({
      url: it.url,
      type: it.type,
    }));

    const updatedDraft = {
      ...reportDraft,
      evidence: updatedEvidence,
    };
    setReportDraft(updatedDraft);

    const confirmationText = `📎 Uploaded ${items.length} supporting file(s) for verification.`;

    const userMsg: Message = {
      id: `msg_user_ev_${Date.now()}`,
      role: "user",
      text: confirmationText,
      time: getCurrentTime(),
      type: "text",
    };

    const updatedMessages = [...messages, userMsg];
    setMessage(updatedMessages);
    setIsThinking(true);
    setChatError(null);

    try {
      const response = await givingInfo(confirmationText, updatedMessages, updatedDraft);
      if (!response || !response.success || !response.result) {
        throw new Error(response?.message || "Failed to process evidence.");
      }

      const res = response.result;
      setReportDraft((prev) => ({
        ...prev,
        ...res.reportDraft,
        createdBy: prev.createdBy || user?.id || user?.username || null,
      }));

      if (Array.isArray(res.requiredFields) && res.requiredFields.length > 0) {
        setRequiredFields(res.requiredFields);
      }

      const assistantMsgId = `msg_ai_${Date.now()}`;

      if (res.assistantMessage) {
        handleToggleAudio(assistantMsgId, res.assistantMessage);
      }
      if (res.isComplete) {
        const fullDraft = { ...reportDraft, ...res.reportDraft };
        navigateToSensitivityReview(fullDraft);
        return;
      }

      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        text: res.assistantMessage,
        time: getCurrentTime(),
        type: res.requestedInputType || res.aiQueryType || "text",
      };
      setMessage((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Evidence submit error:", err);
      setChatError(err?.message || "Failed to process evidence. Please retry.");
    } finally {
      setIsThinking(false);
    }
  };

  // If report completion is confirmed, show Review Page
  if (done) {
    return (
      <ReportDetails
        reportDraft={reportDraft}
        onBack={() => setDone(false)}
      />
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.chatSection}>
          <header className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <button
                className={styles.backButton}
                aria-label="Go back"
                onClick={() => (window.location.href = "/feed")}
              >
                ←
              </button>

              <div className={styles.aiAvatar}>✦</div>

              <div>
                <h1>Report an Issue</h1>
                <div className={styles.aiStatus}>
                  <span className={styles.onlineDot} />
                  MargDarshak AI
                </div>
              </div>
            </div>

            <button
              className={styles.closeButton}
              aria-label="Close report"
              onClick={() => (window.location.href = "/feed")}
            >
              ×
            </button>
          </header>

          <div className={styles.conversation}>
            <div className={styles.conversationIntro}>
              <div className={styles.introIcon}>✦</div>
              <h2>Tell MargDarshak what happened</h2>
              <p>
                Describe the situation in your own words. JanSetu AI will automatically identify the category, request necessary evidence, and guide you through reporting.
              </p>
            </div>

            <div className={styles.messageList}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? styles.userMessageRow
                      : styles.assistantMessageRow
                  }
                >
                  {message.role === "assistant" && (
                    <div className={styles.smallAiAvatar}>✦</div>
                  )}

                  <div
                    className={
                      message.role === "user"
                        ? styles.userMessage
                        : styles.assistantMessage
                    }
                  >
                    <p>{message.text}</p>

                    {message.role === "assistant" && (
                      <div
                        className={`${styles.ttsBar} ${
                          audioState.messageId === message.id && audioState.isPlaying
                            ? styles.ttsBarActive
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(message.id, message.text)}
                          className={`${styles.ttsPlayButton} ${
                            audioState.messageId === message.id && audioState.isPlaying
                              ? styles.ttsPlayButtonPlaying
                              : ""
                          }`}
                          aria-label={
                            audioState.messageId === message.id && audioState.isPlaying
                              ? "Pause audio"
                              : "Play audio"
                          }
                          title={
                            audioState.messageId === message.id && audioState.isPlaying
                              ? "Pause voice response"
                              : audioState.messageId === message.id && audioState.isPaused
                              ? "Resume voice response"
                              : "Listen to voice response"
                          }
                        >
                          {audioState.messageId === message.id && audioState.isPlaying ? (
                            <Pause size={13} fill="currentColor" />
                          ) : (
                            <Play size={13} fill="currentColor" style={{ marginLeft: "1.5px" }} />
                          )}
                        </button>
                        <span className={styles.ttsStatusText}>
                          {audioState.messageId === message.id && audioState.isPlaying
                            ? "Playing voice response"
                            : audioState.messageId === message.id && audioState.isPaused
                            ? "Voice response paused"
                            : "Listen to response"}
                        </span>
                        {audioState.messageId === message.id && audioState.isPlaying && (
                          <div className={styles.audioWave} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <span />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contextual Card: Location */}
                    {message.role === "assistant" && message.type === "location" && (
                      <LocationCard
                        initialLocation={reportDraft.location}
                        isConfirmed={message.isConfirmed}
                        onLocationConfirm={(loc) => handleLocationConfirm(message.id, loc)}
                      />
                    )}

                    {/* Contextual Card: Evidence & Documents */}
                    {message.role === "assistant" &&
                      (message.type === "evidence" ||
                        message.type === "image" ||
                        message.type === "document") && (
                        <Evidence
                          type={
                            message.type === "image"
                              ? "image"
                              : message.type === "document"
                              ? "document"
                              : "evidence"
                          }
                          initialEvidence={reportDraft.evidence}
                          isConfirmed={message.isConfirmed}
                          onUploadedEvidence={(items) =>
                            handleEvidenceConfirm(message.id, items)
                          }
                        />
                      )}

                    <span className={styles.messageTime}>{message.time}</span>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className={styles.aiThinking}>
                  <div className={styles.thinkingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>MargDarshak AI is analyzing your report...</p>
                </div>
              )}

              {chatError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#dc2626",
                    fontSize: "12.5px",
                    margin: "8px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} />
                    <span>{chatError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReply(question || "retry")}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fca5a5",
                      color: "#dc2626",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className={styles.inputArea}>
            {sttError && (
              <div className={styles.sttAlert}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} />
                  <span>{sttError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSttError(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#b91c1c",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                  aria-label="Dismiss speech recognition error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className={styles.inputContainer}>
              <button
                className={styles.attachButton}
                aria-label="Attach evidence"
                onClick={() => {
                  const evMsg: Message = {
                    id: `msg_ev_prompt_${Date.now()}`,
                    role: "assistant",
                    text: "Please upload your photographs or documents below.",
                    time: getCurrentTime(),
                    type: "evidence",
                  };
                  setMessage((prev) => [...prev, evMsg]);
                }}
                title="Add photo or document evidence"
              >
                <Paperclip size={16} />
              </button>

              <input
                type="text"
                placeholder="Describe the issue, location, or answer MargDarshak's question..."
                className={styles.messageInput}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                disabled={isThinking}
              />

              {/* Language Switcher for STT */}
              <button
                type="button"
                onClick={toggleSttLanguage}
                className={`${styles.sttLangToggle} ${
                  sttLang === "hi-IN" ? styles.sttLangActive : ""
                }`}
                title={`Speech recognition language: ${
                  sttLang === "hi-IN" ? "Hindi (हिन्दी)" : "English"
                }. Click to toggle.`}
                aria-label={`Switch speech language. Current: ${
                  sttLang === "hi-IN" ? "Hindi" : "English"
                }`}
              >
                <Languages size={13} />
                <span>{sttLang === "hi-IN" ? "HI" : "EN"}</span>
              </button>

              {isSpeechSupported ? (
                listening ? (
                  <button
                    type="button"
                    onClick={handleStopListening}
                    className={`${styles.micButton} ${styles.micActive}`}
                    aria-label="Stop voice input"
                    title="Listening... Click to stop voice input"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartListening}
                    className={styles.micButton}
                    aria-label="Start voice input"
                    title={`Speak in ${
                      sttLang === "hi-IN" ? "Hindi" : "English"
                    } or Hinglish`}
                  >
                    <Mic size={16} />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className={styles.micButton}
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                  title="Speech recognition not supported in this browser. Please type your message."
                  disabled
                >
                  <Mic size={16} />
                </button>
              )}

              <button
                type="button"
                className={styles.sendButton}
                aria-label="Send message"
                onClick={() => handleReply()}
                disabled={!question.trim() || isThinking}
              >
                <ArrowUp size={16} />
              </button>
            </div>

            <div className={styles.inputHint}>
              <span>
                {listening
                  ? `🎙️ Listening in ${
                      sttLang === "hi-IN" ? "Hindi" : "English"
                    }... Speak now. Click stop when finished.`
                  : `You can speak or type in English, Hindi, or Hinglish (Speech input: ${
                      sttLang === "hi-IN" ? "Hindi" : "English"
                    })`}
              </span>
              <span>JanSetu AI Redressal</span>
            </div>
          </footer>
        </section>

        <aside className={styles.sidebar}>
          <Classfication reportDraft={reportDraft} />

          <ReportProgress
            reportDraft={reportDraft}
            requiredFields={requiredFields}
          />
        </aside>
      </div>
    </main>
  );
};

export default Report;
