"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * PWA Splash Screen Component
 * Shows a native-like splash screen when the app loads as a PWA
 */
export function PWASplashScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
                         document.referrer.includes('android-app://');
    
    setIsPWA(isStandalone);

    // Only show splash screen for PWA
    if (isStandalone) {
      // Hide splash screen after app is ready
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  if (!isPWA || !isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* App Logo/Icon */}
        <div className="relative">
          <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold font-headline text-white">D</span>
          </div>
        </div>
        
        {/* App Name */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            DgenBooks
          </h1>
          <p className="text-sm text-muted-foreground">Expense Tracker</p>
        </div>

        {/* Loading Spinner */}
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
