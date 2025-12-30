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
import { Bell, X } from 'lucide-react';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onLater: () => void;
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
  onAllow,
  onLater,
}: NotificationPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-950/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-headline">
            Stay Updated on Team Expenses
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2 space-y-2">
            <p>
              Get instant notifications when:
            </p>
            <ul className="text-left space-y-1 mt-2 pl-6 list-disc text-muted-foreground">
              <li>Someone adds a new expense</li>
              <li>You receive an urgent purchase request</li>
              <li>A teammate settles up with you</li>
            </ul>
            <p className="text-sm pt-2 text-muted-foreground/70">
              You can always change this later in Settings
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
          <Button
            onClick={onAllow}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold"
            size="lg"
          >
            <Bell className="mr-2 h-4 w-4" />
            Enable Notifications
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
