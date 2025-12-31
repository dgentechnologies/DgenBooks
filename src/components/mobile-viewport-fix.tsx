"use client";

import { useEffect } from "react";

/**
 * Mobile Viewport Fix Component
 * Handles the dynamic viewport height on mobile browsers (especially iOS Safari)
 * where the address bar can change the visible viewport height
 */
export function MobileViewportFix() {
  useEffect(() => {
    // Set CSS custom property for actual viewport height
    const setViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight * 0.01;
      // Set the CSS custom property
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initial set
    setViewportHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return null;
}
