"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Component that listens for service worker messages
 * Handles navigation requests from notification clicks on mobile
 */
export function ServiceWorkerListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('📨 Received message from service worker:', event.data);
      
      if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
        console.log('🧭 Navigating to:', event.data.url);
        
        try {
          // Parse the URL to get the pathname
          const url = new URL(event.data.url, window.location.origin);
          const pathname = url.pathname;
          
          // Use Next.js router to navigate
          router.push(pathname);
        } catch (error) {
          console.error('❌ Error navigating:', error);
          // Fallback to window.location
          window.location.href = event.data.url;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    console.log('✅ Service worker message listener registered');

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      console.log('🔕 Service worker message listener removed');
    };
  }, [router]);

  return null;
}
