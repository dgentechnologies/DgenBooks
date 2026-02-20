"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onLater: () => void;
}

export function LocationPermissionDialog({
  open,
  onOpenChange,
  onAllow,
  onLater,
}: LocationPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-950/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-headline">
            Location Access Required
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2 space-y-2">
            <p>
              Dgen Access needs your location to:
            </p>
            <ul className="text-left space-y-1 mt-2 pl-6 list-disc text-muted-foreground">
              <li>Verify your physical access eligibility</li>
              <li>Provide location-based features</li>
              <li>Ensure secure access control</li>
            </ul>
            <p className="text-sm pt-2 text-muted-foreground/70">
              Your location is only used while you are on the Dgen Access page
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
          <Button
            onClick={onAllow}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold"
            size="lg"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Allow Location Access
          </Button>
          <Button
            onClick={onLater}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-white"
          >
            <X className="mr-2 h-4 w-4" />
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
