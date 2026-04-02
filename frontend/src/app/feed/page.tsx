"use client";

import { useState, useEffect, useRef } from 'react';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPrompt, setUploadPrompt] = useState('');
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadThumbFile, setUploadThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSession = () => {
      fetch('/api/v1/admin/session')
        .then(r => r.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => {});
    };
    checkSession();
    window.addEventListener('kf_admin_change', checkSession);
    return () => window.removeEventListener('kf_admin_change', checkSession);
  }, []);

  useEffect(() => { fetchFeedVideos(); }, []);

  // debounce search input — wait 400ms after user stops typing
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      fetchFeedVideos(search);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchFeedVideos = async (q = '') => {
    try {
      const url = q.trim() ? `/api/v1/feed?search=${encodeURIComponent(q.trim())}` : '/api/v1/feed';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch feed videos');
      const data = await response.json();
      const rawVideos = data.videos || data;
      setVideos(rawVideos.map((v: any) => ({
        id: v.id,
        title: v.display_title || v.title || v.prompt,
        style: v.style,
        thumbnailUrl: v.thumbnail_url || v.thumbnailUrl,
        videoUrl: v.video_url || v.videoUrl
      })));
    } catch (err) {
      setError('Failed to load community videos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this video from the community feed?')) return;
    try {
      const res = await fetch(`/api/v1/admin/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch { alert('Failed to delete video.'); }
  };

  const handleRenameSubmit = async (id: string) => {
    const newTitle = renaming[id]?.trim();
    if (!newTitle) return;
    try {
      const res = await fetch(`/api/v1/admin/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (!res.ok) throw new Error();
      setVideos(prev => prev.map(v => v.id === id ? { ...v, title: newTitle } : v));
      setRenaming(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch { alert('Failed to rename video.'); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVideoFile) { setUploadError('Please select a video file.'); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('video', uploadVideoFile);
      if (uploadThumbFile) form.append('thumbnail', uploadThumbFile);
      form.append('title', uploadTitle);
      form.append('prompt', uploadPrompt || uploadTitle);

      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      // refresh feed
      setShowUpload(false);
      setUploadTitle('');
      setUploadPrompt('');
      setUploadVideoFile(null);
      setUploadThumbFile(null);
      setLoading(true);
      await fetchFeedVideos(search);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className={styles.pageWrapper}>
      <ParticleBackground />
      <Navbar activePath="/feed" />

      <div className={styles.feedContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Community Feed</h1>
          <p className={styles.subtitle}>Discover the latest videos created by our community</p>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search videos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          {isAdmin && (
            <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
              + Upload Video
            </button>
          )}
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

        {!loading && !error && videos.length === 0 && (
          <div className={styles.emptyState}>
            <p>No videos yet. Be the first to generate one!</p>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className={styles.videoGrid}>
            {videos.map((video) => (
              <div key={video.id} className={`${styles.videoCard} ${isAdmin ? styles.videoCardAdmin : ''}`}>
                <div className={styles.thumbnailContainer}>
                  <video
                    className={styles.videoThumbnail}
                    src={video.videoUrl}
                    controls
                    preload="metadata"
                    onLoadedMetadata={e => {
                      const dur = (e.target as HTMLVideoElement).duration;
                      if (dur && isFinite(dur)) setDurations(prev => ({ ...prev, [video.id]: dur }));
                    }}
                  />
                  {durations[video.id] && (
                    <span className={styles.durationBadge}>
                      {Math.floor(durations[video.id] / 60)}:{String(Math.floor(durations[video.id] % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className={styles.videoInfo}>
                  {isAdmin && video.id in renaming ? (
                    <div className={styles.renameRow}>
                      <input
                        className={styles.renameInput}
                        value={renaming[video.id] ?? video.title}
                        onChange={e => setRenaming(prev => ({ ...prev, [video.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(video.id);
                          if (e.key === 'Escape') setRenaming(prev => { const n = { ...prev }; delete n[video.id]; return n; });
                        }}
                        autoFocus
                      />
                      <button className={styles.adminActionBtn} onClick={() => handleRenameSubmit(video.id)}>✓</button>
                      <button className={styles.adminActionBtn} onClick={() => setRenaming(prev => { const n = { ...prev }; delete n[video.id]; return n; })}>✕</button>
                    </div>
                  ) : (
                    <h3 className={styles.videoTitle} title={video.title}>{video.title}</h3>
                  )}
                  {isAdmin && (
                    <div className={styles.adminControls}>
                      <button className={styles.adminBtn} onClick={() => setRenaming(prev => ({ ...prev, [video.id]: video.title }))}>Rename</button>
                      <button className={`${styles.adminBtn} ${styles.adminBtnDelete}`} onClick={() => handleDelete(video.id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className={styles.uploadOverlay} onClick={() => !uploading && setShowUpload(false)}>
          <div className={styles.uploadModal} onClick={e => e.stopPropagation()}>
            <p className={styles.uploadModalTitle}>Upload Video</p>
            <form onSubmit={handleUpload} className={styles.uploadForm}>
              <label className={styles.uploadLabel}>Title</label>
              <input
                className={styles.uploadInput}
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="Video title"
                required
              />
              <label className={styles.uploadLabel}>Description (optional)</label>
              <input
                className={styles.uploadInput}
                value={uploadPrompt}
                onChange={e => setUploadPrompt(e.target.value)}
                placeholder="Original prompt or description"
              />
              <label className={styles.uploadLabel}>
                Video file (MP4) <span className={styles.uploadRequired}>*</span>
              </label>
              <div className={styles.filePickerRow}>
                <button type="button" className={styles.filePickerBtn} onClick={() => videoInputRef.current?.click()}>
                  {uploadVideoFile ? uploadVideoFile.name : 'Choose video...'}
                </button>
                <input ref={videoInputRef} type="file" accept="video/mp4,video/*" style={{ display: 'none' }}
                  onChange={e => setUploadVideoFile(e.target.files?.[0] || null)} />
              </div>
              <label className={styles.uploadLabel}>Thumbnail (optional, JPG/PNG)</label>
              <div className={styles.filePickerRow}>
                <button type="button" className={styles.filePickerBtn} onClick={() => thumbInputRef.current?.click()}>
                  {uploadThumbFile ? uploadThumbFile.name : 'Choose thumbnail...'}
                </button>
                <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setUploadThumbFile(e.target.files?.[0] || null)} />
              </div>
              {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
              <div className={styles.uploadActions}>
                <button type="button" className={styles.uploadCancelBtn} onClick={() => setShowUpload(false)} disabled={uploading}>
                  Cancel
                </button>
                <button type="submit" className={styles.uploadSubmitBtn} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
