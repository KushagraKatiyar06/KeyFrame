"use client";

import { useEffect, useState } from 'react';

// Tracks admin session state: checks on mount, and re-checks whenever any
// component dispatches a 'kf_admin_change' event (login/logout elsewhere on the page).
export function useIsAdmin(): [boolean, (value: boolean) => void] {
  const [isAdmin, setIsAdmin] = useState(false);

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

  return [isAdmin, setIsAdmin];
}
