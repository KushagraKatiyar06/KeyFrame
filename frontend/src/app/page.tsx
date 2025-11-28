// src/app/api/v1/generate/route.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "./components/Navbar";
import styles from "./Home.module.css";

// The Initial Landing Splash
const SplashSection = () => (
  <section className={styles.splashSection}>
    <div className={styles.topContentWrapper}>
      {/* Main Logo (Image) */}
      <div className={styles.mainLogo}>
        <Image
          src="/assets/Logo_Transparent.png"
          alt="KeyFrame Logo"
          width={128}
          height={128}
        />
      </div>

      <h1 className={styles.welcomeText}>WELCOME TO KEYFRAME</h1>
    </div>

    <Link href="#prompt-section" className={styles.ctaLink}>
      <p className={styles.ctaText}>GENERATE VIDEOS NOW</p>
      {/* Down Arrow */}
      <svg
        className={styles.arrowIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </Link>
  </section>
);

// The Prompt Input Area
const PromptSection = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Educational");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  // Must match backend allowed values: 'Educational', 'Storytelling', 'Meme'
  const stylesList = ["Educational", "Meme", "Storytelling"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!prompt.trim()) {
      setError("Please enter a prompt to generate a video.");
      setIsLoading(false);
      return;
    }

    try {
      // Use explicit backend URL so the frontend dev server doesn't intercept the request
      const API_BASE =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${API_BASE}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/status/${data.jobId}`);
      } else {
        setError(
          "Failed to start video generation. Received status: " +
            response.status
        );
      }
    } catch (err) {
      setError("A network error occurred while submitting the job.");
      console.error("Couldn't fetch", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="prompt-section" className={styles.promptSection}>
      <div className={styles.promptContainer}>
        {/* Main Logo in the Prompt Section */}
        <div className={styles.promptSectionLogo}>
          <Image
            src="/assets/Logo_Transparent.png"
            alt="KeyFrame Logo"
            width={128}
            height={128}
          />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Prompt Entry Area */}
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={styles.promptInput}
            placeholder="Input any topic, story, etc that you would like a video of..."
            disabled={isLoading}
            required
          />

          {/* Mode Selection and Generate Button Area */}
          <div className={styles.controls}>
            {/* Style Buttons */}
            <div className={styles.styleButtons}>
              {stylesList.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`${styles.styleButton} ${
                    style === s ? styles.selected : ""
                  }`}
                  disabled={isLoading}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className={styles.loadingIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "Start Generation"
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </section>
  );
};

// --- Main Page Component ---
export default function Home() {
  return (
    <main>
      <Navbar />
      <SplashSection />
      <PromptSection />
    </main>
  );
}
