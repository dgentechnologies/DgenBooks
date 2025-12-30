"use client";

import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { firebaseApp } from '@/firebase/config';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { toast } from '@/lib/toast';

// Service worker path - centralized constant
const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

// VAPID key - IMPORTANT: Replace this with your actual VAPID key from Firebase Console
// Generate at: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// TODO: Move to environment variable for better security
const VAPID_KEY = 'BFZE4SK3p9z7CaJ3dwvdlPmvSTWZfGAKNmqviBXjNv2bJls8bf0ThRXCpjopXzU4S1q2Z9bFKRSZsBT2ePIgEuQ';

export interface NotificationState {
  permission: NotificationPermission;
  token: string | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useNotificationToken() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    token: null,
    isSupported: false,
    isLoading: true,
    error: null,
  });

  const firestore = useFirestore();
  const auth = useAuth();
  const user = useUser();

  // Check if notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const isSupported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      setState(prev => ({
        ...prev,
        isSupported,
        permission: isSupported ? Notification.permission : 'denied',
        isLoading: false,
      }));
    };

    checkSupport();
  }, []);

  // Save token to Firestore
  const saveTokenToFirestore = useCallback(
    async (token: string) => {
      if (!auth.currentUser || !firestore) {
        console.warn('Cannot save token: user not authenticated or firestore not available');
        return;
      }

      try {
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          lastTokenUpdate: new Date().toISOString(),
        });
        console.log('FCM token saved to Firestore');
      } catch (error) {
        console.error('Error saving FCM token to Firestore:', error);
        throw error;
      }
    },
    [auth.currentUser, firestore]
  );

  // Remove token from Firestore
  const removeTokenFromFirestore = useCallback(
    async (token: string) => {
      if (!auth.currentUser || !firestore) {
        return;
      }

      try {
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          fcmTokens: arrayRemove(token),
        });
        console.log('FCM token removed from Firestore');
      } catch (error) {
        console.error('Error removing FCM token from Firestore:', error);
      }
    },
    [auth.currentUser, firestore]
  );

  // Request notification permission and get token
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!state.isSupported) {
      const error = 'Push notifications are not supported in this browser';
      setState(prev => ({ ...prev, error }));
      toast.error('Not Supported', error);
      return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Permission denied',
        }));
        return null;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
      
      if (!registration) {
        registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
          scope: '/',
        });
        console.log('Service Worker registered:', registration);
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log('FCM token obtained:', token);
        await saveTokenToFirestore(token);
        
        setState(prev => ({
          ...prev,
          permission: 'granted',
          token,
          isLoading: false,
        }));

        toast.success('Notifications Enabled', 'You will now receive push notifications');
        return token;
      } else {
        throw new Error('No registration token available');
      }
    } catch (error) {
      console.error('Error getting notification permission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable notifications';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error('Error', errorMessage);
      return null;
    }
  }, [state.isSupported, saveTokenToFirestore]);

  // Revoke notification permission (remove token)
  const revokePermission = useCallback(async () => {
    if (state.token) {
      await removeTokenFromFirestore(state.token);
      setState(prev => ({
        ...prev,
        token: null,
        permission: 'default',
      }));
      toast.info('Notifications Disabled', 'You will no longer receive push notifications');
    }
  }, [state.token, removeTokenFromFirestore]);

  // Handle foreground messages
  useEffect(() => {
    if (!state.isSupported || !auth.currentUser) {
      return;
    }

    try {
      const messaging = getMessaging(firebaseApp);
      
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        console.log('Foreground message received:', payload);
        
        const title = payload.notification?.title || 'DgenBooks';
        const body = payload.notification?.body || '';
        
        // Show toast notification for foreground messages
        toast.info(title, body);

        // Optionally show browser notification even in foreground
        if (Notification.permission === 'granted' && payload.notification) {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: payload.data,
          });
        }
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up foreground message handler:', error);
    }
  }, [state.isSupported, auth.currentUser]);

  return {
    ...state,
    requestPermission,
    revokePermission,
  };
}
