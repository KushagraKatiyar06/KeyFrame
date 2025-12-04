"use client";

import { useEffect, useState, useCallback, use, useRef } from 'react';
import Image from 'next/image';
import styles from '../Status.module.css';
import { Navbar } from '../../components/Navbar';


interface JobStatus {
    jobId: string;
    status: 'queued' | 'processing' | 'done' | 'failed';
    progress: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
}

interface FeedVideo {
    id: string;
    title: string;
    style: string;
    thumbnailUrl: string;
    videoUrl: string;
}


export default function StatusPage({ params }: { params: Promise<{ jobId: string }> }) {
    //Unwraps params using React.use()
    const unwrappedParams = use(params);
    const jobId = unwrappedParams.jobId;

    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const [feed, setFeed] = useState<FeedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isFeedOpen, setIsFeedOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [videoTitle, setVideoTitle] = useState(`VIDEO NAME #${jobId.slice(0, 4)}`);
    const [selectedCommunityVideo, setSelectedCommunityVideo] = useState<FeedVideo | null>(null);

    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const modalVideoRef = useRef<HTMLVideoElement>(null);
    const communityVideoRef = useRef<HTMLVideoElement>(null);
    const communityModalVideoRef = useRef<HTMLVideoElement>(null);

    //Keeps the delay state for a smooth transition from submission
    const [isAwaitingInitialStatus, setIsAwaitingInitialStatus] = useState(true);


    const fetchStatus = useCallback(async () => {
        if (!jobId) {
            setError("Job ID is missing.");
            return;
        }
        try {
            const res = await fetch(`/api/v1/status/${jobId}`);
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
            const res = await fetch('/api/v1/feed');
            if (!res.ok) {
                throw new Error(`Feed fetch failed: ${res.status}`);
            }
            const data = await res.json();
            //Backend returns { success, count, videos: [...]}
            const videos = data.videos || data;
            setFeed(Array.isArray(videos) ? videos : []);
        } catch (err) {
            console.error("Feed error:", err);
        }
    }, []);


    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined;

        
        //If job is already done:
        if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') {
            return () => { }; // Return an empty cleanup function, essentially stopping the loop.
        }

        // 1.Initial Delay Timer (2 seconds)
        const initialDelayTimer = setTimeout(() => {
            setIsAwaitingInitialStatus(false);

            fetchStatus();
            fetchFeed();

            // 2. Start Polling Interval (Only starts if status is still not complete/error)
            intervalId = setInterval(fetchStatus, 5000);

        }, 2000);


        // 3. Global Cleanup Function
        return () => {
            clearTimeout(initialDelayTimer);
            if (intervalId) {
                clearInterval(intervalId);
            }
        };

    }, [fetchStatus, fetchFeed, jobStatus?.status]);


    const CommunityFeedView = () => (
        <div className={styles.feedToggleContainer}>
            <button
                className={styles.toggleButton}
                onClick={() => setIsFeedOpen(!isFeedOpen)}
                style={{ transform: isFeedOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
                &#x230d;
            </button>

            <div className={`${styles.feedContainer} ${!isFeedOpen ? styles.collapsed : ''}`}>
                <div className={styles.feedGrid}>
                    {feed.map((video) => (
                        <div
                            key={video.id}
                            className={styles.videoCard}
                            onClick={() => setSelectedCommunityVideo(video)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.thumbnail}>
                                <video
                                    src={video.videoUrl}
                                    className={styles.videoThumbnail}
                                    preload="metadata"
                                    muted
                                />
                            </div>
                            <div className={styles.cardDetails}>
                                <span className={styles.cardTitle}>{video.title}</span>
                                <span className={styles.cardDetails} style={{ color: '#FF5757' }}>&#x26B2; {video.id.split('-').pop()}</span>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );

    const CommunityVideoDetailView = ({ video }: { video: FeedVideo }) => {
        const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

        const handleOpenCommunityModal = () => {
            const mainVideo = communityVideoRef.current;
            if (mainVideo) {
                mainVideo.pause();
                setIsCommunityModalOpen(true);

                setTimeout(() => {
                    const modalVideo = communityModalVideoRef.current;
                    if (modalVideo) {
                        modalVideo.currentTime = mainVideo.currentTime;
                        modalVideo.play();
                    }
                }, 50);
            }
        };

        const handleCloseCommunityModal = () => {
            const modalVideo = communityModalVideoRef.current;
            const mainVideo = communityVideoRef.current;

            if (modalVideo && mainVideo) {
                mainVideo.currentTime = modalVideo.currentTime;
                const wasPlaying = !modalVideo.paused;

                setIsCommunityModalOpen(false);

                if (wasPlaying) {
                    setTimeout(() => {
                        mainVideo.play();
                    }, 50);
                }
            } else {
                setIsCommunityModalOpen(false);
            }
        };

        return (
            <>
                <main className={styles.mainContainer}>
                    <div className={styles.completeViewContainer}>

                        {/* Back Arrow Button */}
                        <button
                            className={styles.backButton}
                            onClick={() => setSelectedCommunityVideo(null)}
                            title="Back to community feed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>

                        <div className={styles.videoCard}>
                            <div className={styles.videoWrapper}>
                                <video
                                    ref={communityVideoRef}
                                    controls
                                    src={video.videoUrl}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>

                            <div className={styles.controlsRow}>
                                <div className={styles.videoTitleInput} style={{ flexGrow: 1 }}>
                                    {video.title}
                                </div>

                                <button
                                    onClick={() => window.open(video.videoUrl, '_blank')}
                                    className={styles.iconButton}
                                    title="Open in new tab"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </button>

                                <button
                                    className={styles.iconButton}
                                    onClick={handleOpenCommunityModal}
                                    title="View fullscreen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Modal for fullscreen video */}
                    {isCommunityModalOpen && (
                        <div className={styles.modalOverlay} onClick={handleCloseCommunityModal}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <button
                                    className={styles.closeButton}
                                    onClick={handleCloseCommunityModal}
                                >
                                    ✕
                                </button>
                                <video
                                    ref={communityModalVideoRef}
                                    controls
                                    src={video.videoUrl}
                                    style={{
                                        width: '100%',
                                        maxHeight: '80vh',
                                        objectFit: 'contain'
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>
                    )}
                </main>
            </>
        );
    };

    if (jobStatus?.status === 'done' && jobStatus.videoUrl) {
        const handleDownload = () => {
            if (jobStatus.videoUrl) {
                window.open(jobStatus.videoUrl, '_blank');
            }
        };

        const handleOpenModal = () => {
            const mainVideo = mainVideoRef.current;
            if (mainVideo) {
                // Pause main video and open modal
                mainVideo.pause();
                setIsModalOpen(true);

                // After modal opens, sync time with modal video
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
                // Sync time back to main video
                mainVideo.currentTime = modalVideo.currentTime;
                const wasPlaying = !modalVideo.paused;

                setIsModalOpen(false);

                // Resume main video if modal was playing
                if (wasPlaying) {
                    setTimeout(() => {
                        mainVideo.play();
                    }, 50);
                }
            } else {
                setIsModalOpen(false);
            }
        };

        const handleSubmitToCommunity = async () => {
            try {
                // TODO: Implement API call to submit video to community
                alert('Video submitted to community!');
            } catch (err) {
                alert('Failed to submit to community');
            }
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
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>


                            <div className={styles.controlsRow}>

                                <input
                                    type="text"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    className={styles.videoTitleInput}
                                />

                                <button
                                    onClick={handleDownload}
                                    className={styles.iconButton}
                                    title="Open in new tab"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </button>

                                <button
                                    className={styles.iconButton}
                                    onClick={handleOpenModal}
                                    title="View fullscreen"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>

                            <button
                                className={styles.submitButton}
                                onClick={handleSubmitToCommunity}
                            >
                                Submit Video to Community
                            </button>
                        </div>
                    </div>

                    {/* Modal for fullscreen video */}
                    {isModalOpen && (
                        <div className={styles.modalOverlay} onClick={handleCloseModal}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <button
                                    className={styles.closeButton}
                                    onClick={handleCloseModal}
                                >
                                    ✕
                                </button>
                                <video
                                    ref={modalVideoRef}
                                    controls
                                    src={jobStatus.videoUrl}
                                    style={{
                                        width: '100%',
                                        maxHeight: '80vh',
                                        objectFit: 'contain'
                                    }}
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


    // RENDER 2: PROCESSING STATE
    // If a community video is selected, show detail view
    if (selectedCommunityVideo) {
        return <CommunityVideoDetailView video={selectedCommunityVideo} />;
    }

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

                    <p className={styles.statusText}>
                        FILMING, NARRATING, KEYFRAMING... PLEASE WAIT
                    </p>

                    <div className={styles.progressBarContainer}>
                        <div
                            className={styles.progressBarFill}
                            style={{ width: `${jobStatus ? jobStatus.progress : 0}%` }}
                        ></div>
                    </div>

                    <p className={styles.detailStatus}>
                        Status: {jobStatus ? jobStatus.status : 'Loading...'} ({jobStatus?.progress}%)
                    </p>

                    {error && <p className={styles.errorText}>{error}</p>}
                </div>

                {/*The Community Feed with Collapse/Expand */}
                <CommunityFeedView />
            </main>
        </>
    );
}
