"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Navbar.module.css";

interface NavbarProps {
  activePath?: string;
}

export function Navbar({ activePath = "/" }: NavbarProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/v1/admin/session')
      .then(r => r.json())
      .then(data => setIsAdmin(data.isAdmin))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPassword('');
    }
  }, [showModal]);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isAdmin) return; // normal navigation
    e.preventDefault();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAdmin(true);
      setShowModal(false);
      window.dispatchEvent(new Event('kf_admin_change'));
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/v1/admin/logout', { method: 'POST' });
    setIsAdmin(false);
    window.dispatchEvent(new Event('kf_admin_change'));
  };

  return (
    <>
      <nav className={styles.navbar}>
        {/* Logo — navigates home when admin; triggers password modal otherwise */}
        {isAdmin ? (
          <Link href="/" className={styles.logoLink}>
            <div className={styles.logoContainer}>
              <Image src="/assets/Logo_Transparent.png" alt="KeyFrame Home" width={48} height={48} />
              <span className={styles.adminBadge}>ADMIN</span>
            </div>
          </Link>
        ) : (
          <div className={styles.logoLink} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <div className={styles.logoContainer}>
              <Image src="/assets/Logo_Transparent.png" alt="KeyFrame Home" width={48} height={48} />
            </div>
          </div>
        )}

        <div className={styles.navLinks}>
          <Link href="/" className={`${styles.navLink} ${activePath === "/" ? styles.active : ""}`}>
            Generate
          </Link>
          <Link href="/feed" className={`${styles.navLink} ${activePath === "/feed" ? styles.active : ""}`}>
            Community
          </Link>
          <Link href="/team" className={`${styles.navLink} ${activePath === "/team" ? styles.active : ""}`}>
            Team
          </Link>
          {isAdmin && (
            <button className={styles.signOutButton} onClick={handleSignOut}>
              Exit Admin
            </button>
          )}
        </div>
      </nav>

      {/* Admin password modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            className={`${styles.adminModal} ${shake ? styles.shake : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <p className={styles.adminModalTitle}>Admin Mode</p>
            <form onSubmit={handleSubmit} className={styles.adminForm}>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className={styles.adminInput}
                autoComplete="off"
              />
              <button type="submit" className={styles.adminSubmit}>Unlock</button>
            </form>
            <button className={styles.adminCancel} onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
