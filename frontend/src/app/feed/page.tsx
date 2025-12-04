"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Navbar } from '../components/Navbar';
import { ParticleBackground } from '../components/ParticleBackground';
import styles from './Feed.module.css';

interface Video {
  id: string;
  title: string;
  style: string;
  thumbnailUrl: string;
  videoUrl: string;
}

export default function Feed() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    fetchFeedVideos();
  }, []);

  const fetchFeedVideos = async () => {
    try {
      const response = await fetch('/api/v1/feed');
      if (!response.ok) {
        throw new Error('Failed to fetch feed videos');
      }
      const data = await response.json();
      //Backend returns { success, count, videos: [...]}
      setVideos(data.videos || data);
    } catch (err) {
      setError('Failed to load community videos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Educational', 'Meme', 'Story'];

  const filteredVideos = selectedCategory === 'All'
    ? videos
    : videos.filter(video => video.style === selectedCategory);

  return (
    <main className={styles.pageWrapper}>
      <ParticleBackground />
      <Navbar activePath="/feed" />

      <div className={styles.feedContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Community Feed</h1>
          <p className={styles.subtitle}>
            Discover the latest videos created by our community
          </p>
        </div>

        <div className={styles.categoryFilter}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`${styles.categoryButton} ${
                selectedCategory === category ? styles.active : ''
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading videos...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {!loading && !error && filteredVideos.length === 0 && (
          <div className={styles.emptyState}>
            <p>No videos found in this category yet.</p>
          </div>
        )}

        {!loading && !error && filteredVideos.length > 0 && (
          <div className={styles.videoGrid}>
            {filteredVideos.map((video) => (
              <div key={video.id} className={styles.videoCard}>
                <div className={styles.thumbnailContainer}>
                  <video
                    className={styles.videoThumbnail}
                    src={video.videoUrl}
                    controls
                    preload="metadata"
                  />
                </div>
                <div className={styles.videoInfo}>
                  <h3 className={styles.videoTitle}>{video.title}</h3>
                  <span className={styles.videoCategory}>{video.style}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
