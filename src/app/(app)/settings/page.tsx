"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switcher1 } from "@/components/ui/switcher1";
import { AlertTriangle, LogOut, Settings as SettingsIcon, Bell, BellOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOut } from "firebase/auth";
import { toast } from "@/lib/toast";
import { useNotificationToken } from "@/hooks/useNotificationToken";
import { NotificationPermissionDialog } from "@/components/notification-permission-dialog";

export default function SettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const {
    permission,
    isSupported,
    isLoading,
    requestPermission,
    revokePermission,
  } = useNotificationToken();
  
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const notificationsEnabled = permission === 'granted';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out", "You have been successfully logged out.");
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error", "Failed to log out. Please try again.");
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      // Show soft prompt first
      setShowPermissionDialog(true);
    } else {
      // Disable notifications
      await revokePermission();
    }
  };

  const handleAllowNotifications = async () => {
    setShowPermissionDialog(false);
    await requestPermission();
  };

  const handleLaterNotifications = () => {
    setShowPermissionDialog(false);
    toast.info("No Problem", "You can enable notifications anytime from Settings");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-3xl md:text-4xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
          Settings
        </h2>
        <p className="text-muted-foreground/80 text-base">
          Manage your application preferences and account settings.
        </p>
      </div>

      {/* Notification Permission Dialog */}
      <NotificationPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onAllow={handleAllowNotifications}
        onLater={handleLaterNotifications}
      />

      {/* App Preferences Card */}
      <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            App Preferences
          </CardTitle>
          <CardDescription>
            Customize your app experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Theme Section (Placeholder) */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Current theme: Dark Mode
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon
              </div>
            </div>

            {/* Notifications Section */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p className="font-medium">Push Notifications</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notificationsEnabled
                    ? "Get notified about expenses, requests, and settlements"
                    : isSupported
                    ? "Enable notifications to stay updated"
                    : "Not supported in this browser"}
                </p>
                {notificationsEnabled && (
                  <p className="text-xs text-primary/70 mt-1">
                    ✓ Notifications enabled on this device
                  </p>
                )}
              </div>
              <Switcher1
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={!isSupported || isLoading}
                className="ml-4"
                aria-label="Toggle push notifications"
              />
            </div>

            {/* Language Section (Placeholder) */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div>
                <p className="font-medium">Language</p>
                <p className="text-sm text-muted-foreground">
                  Current language: English
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="bg-red-950/20 backdrop-blur-xl border-red-500/30 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.1s'}}>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-300/70">
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Logout Section */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Log out of your account on this device
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be logged out of your account and redirected to the login page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sign Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="font-headline text-xl">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-white">DgenBooks</span> - Premium Corporate Expense & Reimbursement Tracker
            </p>
            <p>Version 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
