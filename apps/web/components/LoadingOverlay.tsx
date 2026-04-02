'use client';

// ============================================================================
// LoadingOverlay - Global Loading UI (DreamTask Premium)
// ============================================================================
// แสดง Overlay กลางจอ พร้อม animation สวยๆ เวลา connect API
// ใช้ CSS keyframes เพื่อความเสถียร + createPortal เพื่อ z-index ที่ถูกต้อง

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLoadingStore } from '@/store/loadingStore';

export function LoadingOverlay() {
  const { isLoading, message } = useLoadingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoading) return null;

  return createPortal(
    <div
      className="loading-overlay"
      aria-label="กำลังโหลด"
      role="status"
    >
      {/* Background */}
      <div className="loading-backdrop" />

      {/* Content */}
      <div className="loading-content">
        {/* DreamTask Logo + Orb */}
        <div className="loading-orb-container">
          {/* Outer glow pulse */}
          <div className="loading-glow loading-glow-1" />
          <div className="loading-glow loading-glow-2" />

          {/* The Orb */}
          <div className="loading-orb">
            <div className="loading-orb-inner" />
            <div className="loading-orb-shine" />
          </div>

          {/* Orbiting ring */}
          <div className="loading-ring" />
        </div>

        {/* Brand + Message */}
        <div className="loading-text-area">
          <h2 className="loading-brand">DreamTask</h2>
          <p className="loading-message">{message}</p>
        </div>

        {/* Progress bar */}
        <div className="loading-progress-track">
          <div className="loading-progress-bar" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
