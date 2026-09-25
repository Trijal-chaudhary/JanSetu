import React, { useRef, useState } from "react";
import styles from "./Report.module.css";
import { givingInfo, uploadingEvidence } from "../../services/fetching";
import LocationCard from "../locationcard/LocationCard";
import Evidence from "../evidence/Evidence";
import ReportProgress from "../ReportProgress/ReportProgress";
import Classfication from "../Classfication/Classfication";
import ReportDetails from "../../pages/DIsplayinfo/ReportDetails";

type MessageRole = "user" | "assistant";

interface Message {
  role: MessageRole;
  text: string;
  time: string;
  type?: string;
}
// const inputRef = useRef<String>("");

const Report: React.FC = () => {
  // const [reportDraft, setReportDraft] = useState({
  //   location: {
  //     address: null as string | null,
  //     latitude: null as number | null,
  //     longitude: null as number | null,
  //   },
  // });
  const [done, setDone] = useState<Boolean>(false);
  const [reportDraft, setReportDraft] = useState({
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
  });
  const [isThinking, setIsThinking] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessage] = useState<Message[]>([
    {
      role: "assistant",
      text: "Discribe your situation",
      time: "10:42 AM",
      type: "text",
    },
  ]);
  const handelReplys = async () => {
    console.log(question);
    setMessage((prev) => [
      ...prev,
      {
        role: "user",
        text: question,
        time: "10:42 AM",
        type: "text",
      },
    ]);
    setIsThinking(true);
    const response = await givingInfo(question, messages);
    setIsThinking(false);
    const res = response.result;
    // console.log(res.assistantMessage);
    if (res.isComplete) setDone(true);
    setReportDraft((prev) => ({
      ...prev,
      ...res.reportDraft,
    }));
    setMessage((prev) => [
      ...prev,
      {
        role: "assistant",
        text: res.assistantMessage,
        time: "10:42 AM",
        type: res.aiQueryType,
      },
    ]);
    console.log(res);
    setQuestion("");
  };
  const handelLocation = async (location: {
    address: string | null;
    latitude: number;
    longitude: number;
  }) => {
    setReportDraft((prev) => ({
      ...prev,
      location,
    }));

    const locationMessage = `My live location is latitude: ${location.latitude}, longitude: ${location.longitude}., and my address is ${location.address}`;

    setMessage((prev) => [
      ...prev,
      {
        role: "user",
        text: locationMessage,
        time: "10:42 AM",
        type: "text",
      },
    ]);
    setIsThinking(true);
    const response = await givingInfo(locationMessage, messages);
    setIsThinking(false);
    const res = response.result;
    if (res.isComplete) setDone(true);

    setReportDraft((prev) => ({
      ...prev,
      ...res.reportDraft,
    }));
    setMessage((prev) => [
      ...prev,
      {
        role: "assistant",
        text: res.assistantMessage,
        time: "10:42 AM",
        type: res.aiQueryType,
      },
    ]);

    console.log(response.result);
  };
  const handleUplading = async (evidence) => {
    setIsThinking(true);
    const response = await uploadingEvidence(evidence);
    console.log(response.evidence[0].url);
    const res = response.evidence[0];
    const uploaded = `i have uploaded the url is ${res.url}, and the file type is ${res.type}`;
    setMessage((prev) => [
      ...prev,
      {
        role: "user",
        text: uploaded,
        time: "10:42 AM",
        type: "text",
      },
    ]);

    const resp = await givingInfo(uploaded, messages);
    const re = resp.result;
    setIsThinking(false);
    setReportDraft((prev) => ({
      ...prev,
      ...re.reportDraft,
    }));
    if (re.isComplete) setDone(true);

    setMessage((prev) => [
      ...prev,
      {
        role: "assistant",
        text: re.assistantMessage,
        time: "10:42 AM",
        type: re.aiQueryType,
      },
    ]);
    console.log("Evidence selected:", evidence);
  };
  return (
    <>
      {done && <ReportDetails reportDraft={reportDraft} />}
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={styles.chatSection}>
            <header className={styles.chatHeader}>
              <div className={styles.headerLeft}>
                <button className={styles.backButton} aria-label="Go back">
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

              <button className={styles.closeButton} aria-label="Close report">
                ×
              </button>
            </header>

            <div className={styles.conversation}>
              <div className={styles.conversationIntro}>
                <div className={styles.introIcon}>✦</div>

                <h2>Tell me what happened</h2>

                <p>
                  You can describe the situation in your own words. I'll ask for
                  the information needed to complete your report.
                </p>
              </div>

              <div className={styles.messageList}>
                {messages.map((message) => (
                  <div
                    // key={message.id}
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
                      {message.type === "location" ? (
                        <LocationCard onLocationFetch={handelLocation} />
                      ) : (
                        <></>
                      )}
                      {message.type === "evidence" ? (
                        <Evidence onEvidenceSubmit={handleUplading} />
                      ) : (
                        <></>
                      )}

                      <span className={styles.messageTime}>{message.time}</span>
                      {/* <Evidence onEvidenceSubmit={handleUplading} /> */}
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

                    <p>MargDarshak AI is thinking...</p>
                  </div>
                )}
              </div>
            </div>

            <footer className={styles.inputArea}>
              <div className={styles.inputContainer}>
                <button
                  className={styles.attachButton}
                  aria-label="Attach evidence"
                >
                  +
                </button>

                <input
                  type="text"
                  placeholder="Describe anything else..."
                  className={styles.messageInput}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />

                <button className={styles.micButton} aria-label="Voice input">
                  🎙
                </button>

                <button
                  className={styles.sendButton}
                  aria-label="Send message"
                  onClick={handelReplys}
                >
                  ↑
                </button>
              </div>

              <div className={styles.inputHint}>
                <span>🎙 You can also speak in your preferred language</span>

                <span>JanVoice AI</span>
              </div>
            </footer>
          </section>

          <aside className={styles.sidebar}>
            <Classfication reportDraft={reportDraft} />

            <ReportProgress
              reportDraft={reportDraft}
              requiredFields={[
                "category",
                "subcategory",
                "problemDescription",
                "location",
              ]}
            />

            {/* Classification */}
            {/* Privacy */}
            {/* 
          <button className={styles.helpButton}>
            <span>?</span>
            Need help?
          </button> */}
          </aside>
        </div>
      </main>
    </>
  );
};

export default Report;
