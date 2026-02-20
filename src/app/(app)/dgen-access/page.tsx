"use client";

import React, { useState, useEffect } from "react";
import { DGEN_ACCESS_URL } from "@/lib/constants";
import { LocationPermissionDialog } from "@/components/location-permission-dialog";
import { toast } from "@/lib/toast";

export default function DgenAccessPage() {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    // Don't show dialog if user already made a choice
    if (localStorage.getItem("dgen-location-asked")) return;

    const tryPermissionsApi = async () => {
      if ("permissions" in navigator) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (result.state === "prompt") {
            setShowDialog(true);
          }
          // If "granted" or "denied", no need to ask again
          return;
        } catch {
          // Permissions API not supported (e.g. Safari) — fall through
        }
      }
      // Permissions API unavailable: show dialog since we haven't asked yet
      setShowDialog(true);
    };

    tryPermissionsApi();
  }, []);

  const handleAllow = () => {
    setShowDialog(false);
    localStorage.setItem("dgen-location-asked", "true");
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        toast.success("Location Enabled", "Dgen Access can now use your location.");
      },
      () => {
        toast.error("Location Denied", "Location access was denied. Some features may not work.");
      }
    );
  };

  const handleLater = () => {
    setShowDialog(false);
    localStorage.setItem("dgen-location-asked", "true");
    toast.info("Location Skipped", "You can grant location access later from your browser settings.");
  };

  return (
    // Negative margins offset the content-area padding so the iframe fills edge-to-edge.
    // Height accounts for the sticky header (~5rem) plus some breathing room.
    <div className="h-[calc(100vh-8rem)] -m-3 sm:-m-4 md:-m-6 lg:-m-8">
      <LocationPermissionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onAllow={handleAllow}
        onLater={handleLater}
      />
      <iframe
        src={DGEN_ACCESS_URL}
        className="w-full h-full border-0"
        title="Dgen Access"
        allow="geolocation"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
