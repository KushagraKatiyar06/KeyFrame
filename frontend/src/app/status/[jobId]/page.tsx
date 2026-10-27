"use client";

import { useEffect, useState, useCallback, use, useRef } from 'react';
import Image from 'next/image';
import styles from '../Status.module.css';
import { Navbar } from '../../components/Navbar';
import { AgentGraph, parseActiveSlides } from '../AgentGraph';

// Status calls go through the Next.js proxy (/api/v1/status/...)
// which handles camelCase transformation. BACKEND is used only for admin calls.
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface JobStatus {
    jobId: string;
    status: string;
    progress: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    title: string | null;
    authorName: string | null;
}

export default function StatusPage({ params }: { params: Promise<{ jobId: string }> }) {
    const unwrappedParams = use(params);
    const jobId = unwrappedParams.jobId;

    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [videoTitle, setVideoTitle] = useState('');
    const [titleDirty, setTitleDirty] = useState(false);
    const [titleSaved, setTitleSaved] = useState(false);

    const [authorName, setAuthorName] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [showLog, setShowLog] = useState(false);
    const [logLines, setLogLines] = useState<string[]>([]);

    // slide tracking — persists across polls
    const [totalSlides, setTotalSlides] = useState(0);
    const [maxSlidesSeen, setMaxSlidesSeen] = useState(0);
    // context_refs: { slideIndex_0based: [referencedSlideIndex_0based, ...] }
    const [contextRefs, setContextRefs] = useState<Record<number, number[]>>({});

    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const modalVideoRef = useRef<HTMLVideoElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    const fetchStatus = useCallback(async () => {
        if (!jobId) { setError("Job ID is missing."); return; }
        try {
            const res = await fetch(`/api/v1/status/${jobId}`);
            if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
            const data: JobStatus = await res.json();
            setJobStatus(data);

            const s = data.status;

            // parse Director's "slide count + context refs" signal
            // format: agent_director_slides_8:1>0,3>0,5>3
            if (s.startsWith('agent_director_slides_')) {
                const rest = s.slice('agent_director_slides_'.length);
                const [slidesPart, refsPart] = rest.split(':');
                const n = parseInt(slidesPart, 10);
                if (n > 0) setTotalSlides(n);
                if (refsPart) {
                    const refs: Record<number, number[]> = {};
                    refsPart.split(',').forEach(pair => {
                        const [from, to] = pair.split('>').map(Number);
                        if (!isNaN(from) && !isNaN(to)) {
                            if (!refs[from]) refs[from] = [];
                            refs[from].push(to);
                        }
                    });
                    setContextRefs(refs);
                }
            }

            // track the highest slide number ever seen (fixes graph disappearing after artist phase)
            if (s.startsWith('agent_artist_slide')) {
                const parsed = parseActiveSlides(s);
                if (parsed.size > 0) setMaxSlidesSeen(prev => Math.max(prev, ...parsed));
            }

            // initialize title and author from DB if available
            if (data.title) {
                setVideoTitle(data.title);
            } else if (!videoTitle && data.status === 'done') {
                setVideoTitle(`VIDEO #${jobId.slice(0, 4).toUpperCase()}`);
            }
            if (data.authorName && !authorName) {
                setAuthorName(data.authorName);
            }
        } catch (err) {
            console.error("Polling error:", err);
            setError("Could not retrieve job status.");
        }
    }, [jobId]);

    const fetchLogs = useCallback(async () => {
        if (!jobId) return;
        try {
            const res = await fetch(`/api/v1/status/${jobId}/logs`);
            if (!res.ok) return;
            const data = await res.json();
            setLogLines(data.logs || []);
        } catch { /* silent */ }
    }, [jobId]);

    // auto-scroll log to bottom when new lines arrive
    useEffect(() => {
        if (showLog && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logLines, showLog]);

    // poll logs while log panel is open and job is still running
    useEffect(() => {
        if (!showLog) return;
        fetchLogs();
        if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') return;
        const id = setInterval(fetchLogs, 5000);
        return () => clearInterval(id);
    }, [showLog, fetchLogs, jobStatus?.status]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined;
        if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') return () => { };

        const initialDelayTimer = setTimeout(() => {
            fetchStatus();
            intervalId = setInterval(fetchStatus, 5000);
        }, 2000);

        return () => {
            clearTimeout(initialDelayTimer);
            if (intervalId) clearInterval(intervalId);
        };
    }, [fetchStatus, jobStatus?.status]);

    // initialize title once we get a done job
    useEffect(() => {
        if (jobStatus?.status === 'done' && !videoTitle) {
            setVideoTitle(jobStatus.title || `VIDEO #${jobId.slice(0, 4).toUpperCase()}`);
        }
    }, [jobStatus?.status]);


    // ---- DONE STATE ----
    if (jobStatus?.status === 'done' && jobStatus.videoUrl) {

        const handleSaveTitle = async (): Promise<boolean> => {
            if (!titleDirty || !videoTitle.trim()) return true;
            try {
                const res = await fetch(`/api/v1/status/${jobId}/title`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: videoTitle.trim() })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    setSubmitError(err.error || 'Title was rejected');
                    return false;
                }
                setTitleDirty(false);
                setTitleSaved(true);
                setTimeout(() => setTitleSaved(false), 2000);
                return true;
            } catch { return false; }
        };

        const handleDownload = async () => {
            if (!jobStatus.videoUrl) return;
            const safeName = (videoTitle || 'keyframe_video').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
            try {
                const response = await fetch(jobStatus.videoUrl);
                if (!response.ok) throw new Error('fetch failed');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${safeName}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch {
                window.open(jobStatus.videoUrl, '_blank');
            }
        };

        const handleOpenModal = () => {
            const mainVideo = mainVideoRef.current;
            if (mainVideo) {
                mainVideo.pause();
                setIsModalOpen(true);
                setTimeout(() => {
                    const modalVideo = modalVideoRef.current;
                    if (modalVideo) {
                        modalVideo.currentTime = mainVideo.currentTime;
                        modalVideo.play();
                    }
                }, 50);
            }
        };

        const handleCloseModal = () => {
            const modalVideo = modalVideoRef.current;
            const mainVideo = mainVideoRef.current;
            if (modalVideo && mainVideo) {
                mainVideo.currentTime = modalVideo.currentTime;
                const wasPlaying = !modalVideo.paused;
                setIsModalOpen(false);
                if (wasPlaying) setTimeout(() => mainVideo.play(), 50);
            } else {
                setIsModalOpen(false);
            }
        };

        const handleSubmitToCommunity = async () => {
            setSubmitError(null);
            const titleOk = await handleSaveTitle();
            if (!titleOk) return;

            if (authorName.trim()) {
                try {
                    const res = await fetch(`/api/v1/status/${jobId}/author`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ author_name: authorName.trim() })
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        setSubmitError(err.error || 'Name was rejected');
                        return;
                    }
                } catch { /* silent */ }
            }

            setSubmitSuccess(true);
        };

        return (
            <>
                <Navbar activePath="/" />
                <main className={styles.mainContainer}>
                    <div className={styles.completeViewContainer}>
                        <div className={styles.videoCard}>
                            <div className={styles.videoWrapper}>
                                <video
                                    ref={mainVideoRef}
                                    controls
                                    src={jobStatus.videoUrl}
                                    poster={jobStatus.thumbnailUrl || undefined}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>

                            <div className={styles.controlsRow}>
                                <div className={styles.titleRow}>
                                    <input
                                        type="text"
                                        value={videoTitle}
                                        onChange={(e) => { setVideoTitle(e.target.value); setTitleDirty(true); setTitleSaved(false); }}
                                        onBlur={handleSaveTitle}
                                        className={styles.videoTitleInput}
                                        placeholder="Name this video..."
                                    />
                                    {titleSaved && <span className={styles.savedBadge}>Saved</span>}
                                </div>
                                <button
                                    onClick={handleDownload}
                                    className={styles.iconButton}
                                    title="Download video"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </button>
                                <button className={styles.iconButton} onClick={handleOpenModal} title="View fullscreen">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>

                            <div className={styles.communitySection}>
                                <input
                                    type="text"
                                    value={authorName}
                                    onChange={e => { setAuthorName(e.target.value); setSubmitError(null); }}
                                    className={styles.authorInput}
                                    placeholder="Your name (optional)..."
                                    maxLength={50}
                                />
                                {submitError && <p className={styles.submitError}>{submitError}</p>}
                                {submitSuccess
                                    ? <p className={styles.submitSuccess}>Posted to community!</p>
                                    : (
                                        <button className={styles.submitButton} onClick={handleSubmitToCommunity}>
                                            Post to Community
                                        </button>
                                    )
                                }
                            </div>
                        </div>
                    </div>

                    <div className={styles.logSection}>
                        <button
                            className={styles.logToggleButton}
                            onClick={() => setShowLog(v => !v)}
                        >
                            {showLog ? 'Hide Log' : 'Show Log'}
                        </button>
                        {showLog && (
                            <div className={styles.logPanel}>
                                {logLines.length === 0
                                    ? <span className={styles.logEmpty}>No log entries yet.</span>
                                    : logLines.map((line, i) => <div key={i} className={styles.logLine}>{line}</div>)
                                }
                                <div ref={logEndRef} />
                            </div>
                        )}
                    </div>

                    {isModalOpen && (
                        <div className={styles.modalOverlay} onClick={handleCloseModal}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <button className={styles.closeButton} onClick={handleCloseModal}>✕</button>
                                <video
                                    ref={modalVideoRef}
                                    controls
                                    src={jobStatus.videoUrl}
                                    style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    )}
                </main>
            </>
        );
    }


    // ---- PROCESSING STATE ----
    const currentStatus = jobStatus?.status || 'queued';

    return (
        <>
            <main className={styles.mainContainer}>
                <div className={styles.processArea}>

                    <div className={styles.logoIcon}>
                        <Image
                            src="/assets/Logo_Transparent.png"
                            alt="KeyFrame Logo"
                            width={128}
                            height={128}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>

                    <p className={styles.statusText}>Generating Video</p>

                    <AgentGraph
                        status={currentStatus}
                        totalSlides={totalSlides}
                        maxSlidesSeen={maxSlidesSeen}
                        contextRefs={contextRefs}
                    />

                    {error && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.logSection}>
                        <button
                            className={styles.logToggleButton}
                            onClick={() => setShowLog(v => !v)}
                        >
                            {showLog ? 'Hide Log' : 'Show Log'}
                        </button>
                        {showLog && (
                            <div className={styles.logPanel}>
                                {logLines.length === 0
                                    ? <span className={styles.logEmpty}>Waiting for log entries...</span>
                                    : logLines.map((line, i) => <div key={i} className={styles.logLine}>{line}</div>)
                                }
                                <div ref={logEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
