"use client";

import { useEffect, useState, useCallback, use } from 'react';
import Image from 'next/image';
import styles from '../Status.module.css';
import { Navbar } from '../../components/Navbar';


interface JobStatus {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
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
            const data: FeedVideo[] = await res.json();
            setFeed(data);
        } catch (err) {
            console.error("Feed error:", err);
        }
    }, []);


    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined;

        
        //If job is already done:
        if (jobStatus?.status === 'COMPLETE' || jobStatus?.status === 'ERROR') {
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
                        <div key={video.id} className={styles.videoCard}>
                            <div className={styles.thumbnail}>
                                <Image
                                    src="/assets/thumbnails/mock.jpg"
                                    alt={`Thumbnail for ${video.title}`}
                                    width={300}
                                    height={180}
                                    style={{ width: '100%', height: 'auto' }}
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

    if (jobStatus?.status === 'COMPLETE' && jobStatus.videoUrl) {
        return (
            <>
                <Navbar activePath="/" />
                <main className={styles.mainContainer}>

                    <div className={styles.completeViewContainer}>

                        <div className={styles.videoCard}>

                            <div className={styles.videoWrapper}>
                                <video
                                    controls
                                    src={jobStatus.videoUrl}
                                    poster={jobStatus.thumbnailUrl || undefined}
                                    className="w-full h-full object-contain"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>


                            <div className={styles.controlsRow}>

                                <input
                                    type="text"
                                    defaultValue={`VIDEO NAME #${jobId.slice(0, 4)}`}
                                    className={styles.videoTitleInput}
                                />


                                                                <a
                                    href={jobStatus.videoUrl}
                                    download={`keyframe-video-${jobId}.mp4`}
                                    className={styles.iconButton}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </a >

                                <button className={styles.iconButton}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </>
        );
    }


    // RENDER 2: PROCESSING STATE
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
