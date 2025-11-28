// src/app/status/[jobId]/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import styles from "../Status.module.css";
import { Navbar } from "../../components/Navbar";

interface JobStatus {
  jobId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETE" | "ERROR";
  progress: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

interface FeedVideo {
  id: string;
  title: string;
  style: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export default function StatusPage({ params }: { params: { jobId: string } }) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [feed, setFeed] = useState<FeedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFeedOpen, setIsFeedOpen] = useState(true);

  // Keep the delay state for a smooth transition from submission
  const [isAwaitingInitialStatus, setIsAwaitingInitialStatus] = useState(true);

  // Next.js may supply `params` as a Promise. Unwrap using `React.use` when available
  // (this is provided by the app-router runtime). Fall back to the raw params object.
  const resolvedParams: { jobId: string } = (React as any).use
    ? (React as any).use(params)
    : params;
  const jobId = resolvedParams.jobId;

  // backend origin for API calls (set NEXT_PUBLIC_BACKEND_URL in frontend env to override)
  const API_BASE =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:3001";

  const fetchStatus = useCallback(async () => {
    if (!jobId) {
      setError("Job ID is missing.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/${jobId}`);
      if (!res.ok) {
        throw new Error(`Status check failed: ${res.status}`);
      }
      const data: JobStatus = await res.json();
      setJobStatus(data);
    } catch (err) {
      console.error("Polling error:", err);
      setError("Could not retrieve job status.");
    }
  }, [jobId]);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed`);
      if (!res.ok) {
        throw new Error(`Feed fetch failed: ${res.status}`);
      }
      const data = await res.json();
      // backend returns { success, count, videos } — accept both shapes
      const videos: FeedVideo[] = Array.isArray(data)
        ? data
        : data.videos || [];
      setFeed(videos);
    } catch (err) {
      console.error("Feed error:", err);
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      setError("Missing job id");
      return;
    }

    // Reconnecting EventSource with exponential backoff
    let es: EventSource | null = null;
    let retryCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const baseDelay = 1000; // 1s
    const maxDelay = 30000; // 30s
    // Backend origin — set in environment or default to localhost:3001
    const API_BASE =
      (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
      "http://localhost:3001";

    const connect = () => {
      try {
        es = new EventSource(`${API_BASE}/api/v1/events/${jobId}`);

        es.onopen = () => {
          retryCount = 0;
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        };

        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            const data = payload.type === "init" ? payload.data : payload;

            const statusRaw =
              data.status || data.state || data.status_text || "";
            let status: JobStatus["status"] = "QUEUED";
            if (typeof statusRaw === "string") {
              const s = statusRaw.toLowerCase();
              if (s === "done" || s === "complete" || s === "finished")
                status = "COMPLETE";
              else if (s === "failed" || s === "error") status = "ERROR";
              else status = "PROCESSING";
            }

            const progress = data.progress ? parseInt(data.progress, 10) : 0;
            const videoUrl = data.video_url || data.videoUrl || null;
            const thumbnailUrl =
              data.thumbnail_url || data.thumbnailUrl || null;

            setJobStatus({ jobId, status, progress, videoUrl, thumbnailUrl });
          } catch (err) {
            console.error("SSE message parse error", err);
          }
        };

        es.onerror = (err) => {
          console.warn("SSE error, will attempt reconnect", err);
          // close current connection and schedule reconnect
          try {
            es?.close();
          } catch (e) {}
          es = null;
          // schedule reconnect with exponential backoff
          retryCount += 1;
          const delay = Math.min(
            baseDelay * Math.pow(2, retryCount - 1),
            maxDelay
          );
          reconnectTimer = setTimeout(() => {
            connect();
          }, delay);
          // fallback single status check while waiting
          fetchStatus();
        };
      } catch (err) {
        console.error(
          "Failed to open SSE, scheduling reconnect and falling back to polling",
          err
        );
        retryCount += 1;
        const delay = Math.min(
          baseDelay * Math.pow(2, retryCount - 1),
          maxDelay
        );
        reconnectTimer = setTimeout(() => connect(), delay);
        fetchStatus();
      }
    };

    // start connection
    connect();

    // fetch feed once
    fetchFeed();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        try {
          es.close();
        } catch (e) {}
      }
    };
  }, [jobId, fetchStatus, fetchFeed]);

  const CommunityFeedView = () => (
    <div className={styles.feedToggleContainer}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsFeedOpen(!isFeedOpen)}
        style={{ transform: isFeedOpen ? "rotate(90deg)" : "rotate(0deg)" }}
      >
        &#x230d;
      </button>

      <div
        className={`${styles.feedContainer} ${
          !isFeedOpen ? styles.collapsed : ""
        }`}
      >
        <div className={styles.feedGrid}>
          {feed.map((video) => (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.thumbnail}>
                {/* Prefer a thumbnailUrl if provided; otherwise use the backend public thumbnail path */}
                <img
                  src={
                    video.thumbnailUrl ||
                    `${API_BASE}/public/videos/${video.id}/thumbnail${video.id}.jpg`
                  }
                  alt={`Thumbnail for ${video.title}`}
                  width={300}
                  height={180}
                  style={{ width: "100%", height: "auto", objectFit: "cover" }}
                />
              </div>
              <div className={styles.cardDetails}>
                <span className={styles.cardTitle}>{video.title}</span>
                <span
                  className={styles.cardDetails}
                  style={{ color: "#FF5757" }}
                >
                  &#x26B2; {video.id.split("-").pop()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // RENDER 1: COMPLETE STATE
  if (jobStatus?.status === "COMPLETE" && jobStatus.videoUrl) {
    return (
      <>
        <Navbar activePath="/" />
        <main className={styles.mainContainer}>
          <div className={styles.completeViewContainer}>
            <div className={styles.videoCard}>
              <div className={styles.videoWrapperLarge}>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  // ensure player reloads when jobId changes
                  key={jobId}
                  src={
                    jobStatus.videoUrl || `${API_BASE}/api/v1/videos/${jobId}`
                  }
                  poster={
                    jobStatus.thumbnailUrl ||
                    `${API_BASE}/public/videos/${jobId}/thumbnail${jobId}.jpg`
                  }
                  className={styles.videoElement}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className={styles.controlsRow}>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="text"
                    defaultValue={
                      jobStatus.title || `VIDEO NAME #${jobId.slice(0, 4)}`
                    }
                    className={styles.videoTitleInput}
                    id="videoTitleInput"
                  />
                  <button
                    className={styles.saveButton}
                    onClick={async () => {
                      const el = document.getElementById(
                        "videoTitleInput"
                      ) as HTMLInputElement;
                      if (!el) return;
                      const newTitle = el.value.trim();
                      if (!newTitle) return;
                      try {
                        const res = await fetch(
                          `${API_BASE}/api/v1/videos/${jobId}/title`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title: newTitle }),
                          }
                        );
                        if (res.ok) {
                          setJobStatus({ ...jobStatus, title: newTitle });
                        } else {
                          console.error(
                            "Failed to save title",
                            await res.text()
                          );
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    Save
                  </button>
                </div>

                {/* REMOVED PENCIL ICON (EDIT BUTTON) */}

                <a
                  href={`${API_BASE}/api/v1/videos/${jobId}?download=1`}
                  // let the server set Content-Disposition for cross-origin downloads
                  className={styles.iconButton}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </a>
                <button
                  className={styles.iconButton}
                  onClick={() => {
                    // fullscreen toggle
                    const el = document.querySelector(
                      `.${styles.videoWrapperLarge}`
                    ) as HTMLElement;
                    if (!el) return;
                    if (!document.fullscreenElement) {
                      el.requestFullscreen().catch((e) => console.error(e));
                    } else {
                      document.exitFullscreen().catch((e) => console.error(e));
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // RENDER 2: PROCESSING STATE (Combined logic)
  return (
    <>
      {/* NAV BAR REMOVED FROM PROCESSING STATE */}
      <main className={styles.mainContainer}>
        <div className={styles.processArea}>
          <div className={styles.logoIcon}>
            <Image
              src="/assets/Logo_Transparent.png"
              alt="KeyFrame Logo"
              width={128}
              height={128}
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          <p className={styles.statusText}>
            FILMING, NARRATING, KEYFRAMING... PLEASE WAIT
          </p>

          {/* Progress Bar (Simulated Loading Bar) */}
          <div className={styles.progressBarContainer}>
            {/* Progress fill */}
            <div
              className={styles.progressBarFill}
              style={{ width: `${jobStatus ? jobStatus.progress : 0}%` }}
            ></div>
          </div>

          {/* Detailed Status (Optional, useful for debugging) */}
          <p className={styles.detailStatus}>
            Status: {jobStatus ? jobStatus.status : "Loading..."} (
            {jobStatus?.progress}%)
          </p>

          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        {/* The Community Feed with Collapse/Expand  */}
        <CommunityFeedView />
      </main>
    </>
  );
}
