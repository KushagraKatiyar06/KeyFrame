"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../status/Status.module.css";
import { Navbar } from "../components/Navbar";

interface FeedVideo {
  id: string;
  title?: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingPoster, setPlayingPoster] = useState<string | undefined>(
    undefined
  );

  const API_BASE =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "http://localhost:3001";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/feed`);
        if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
        const json = await res.json();
        const videos: FeedVideo[] = Array.isArray(json)
          ? json
          : json.videos || [];
        if (mounted) setFeed(videos);
      } catch (e) {
        console.error("Failed to load feed", e);
        setError("Could not load community feed");
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openPlayer = (video: FeedVideo) => {
    const url =
      video.videoUrl ||
      `${API_BASE}/public/videos/${video.id}/final_video${video.id}.mp4`;
    const poster =
      video.thumbnailUrl ||
      `${API_BASE}/public/videos/${video.id}/thumbnail${video.id}.jpg`;
    setPlayingPoster(poster);
    setPlayingUrl(url);
  };

  return (
    <>
      <Navbar />
      <main className={styles.mainContainer}>
        <h2 style={{ margin: "16px 0" }}>Community Videos</h2>

        {error && <p className={styles.errorText}>{error}</p>}

        {/** Top horizontal strip: show only available videos with assets (no gaps) **/}
        {(() => {
          const visible = feed.filter((v) => v.thumbnailUrl || v.videoUrl);
          if (!visible.length) return <p>No community videos available yet.</p>;

          return (
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                padding: "8px 0",
              }}
            >
              {visible.map((v) => {
                const thumb =
                  v.thumbnailUrl ||
                  `${API_BASE}/public/videos/${v.id}/thumbnail${v.id}.jpg`;
                return (
                  <div
                    key={v.id}
                    style={{ minWidth: 200, cursor: "pointer" }}
                    onClick={() => openPlayer(v)}
                  >
                    <img
                      src={thumb}
                      alt={v.title || v.id}
                      style={{
                        width: 200,
                        height: 112,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                    <div style={{ marginTop: 6, textAlign: "center" }}>
                      {v.title || `Video ${v.id.slice(0, 8)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {playingUrl && (
          <div
            className={styles.videoModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setPlayingUrl(null)}
          >
            <div
              style={{
                width: "80%",
                maxWidth: 960,
                background: "#000",
                padding: 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={playingUrl}
                poster={playingPoster}
                controls
                autoPlay
                style={{ width: "100%", height: "auto" }}
              />
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className={styles.iconButton}
                  onClick={() => setPlayingUrl(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
