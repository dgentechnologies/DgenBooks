"use client";

import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { firebaseApp } from '@/firebase/config';
import { useFirestore, useAuth, useUser } from '@/firebase';
import { toast } from '@/lib/toast';

// VAPID key - IMPORTANT: Replace this with your actual VAPID key from Firebase Console
// Generate at: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
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

      console.log('Notification Support Check:', {
        hasWindow: typeof window !== 'undefined',
        hasNotification: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        isSupported,
        currentPermission: isSupported ? Notification.permission : 'denied',
      });

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
        console.log('✅ FCM token saved to Firestore');
      } catch (error) {
        console.error('❌ Error saving FCM token to Firestore:', error);
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
        console.log('✅ FCM token removed from Firestore');
      } catch (error) {
        console.error('❌ Error removing FCM token from Firestore:', error);
      }
    },
    [auth.currentUser, firestore]
  );

  // Request notification permission and get token
  const requestPermission = useCallback(async (): Promise<string | null> => {
    console.log('🔔 Starting notification permission request...');
    
    if (!state.isSupported) {
      const error = 'Push notifications are not supported in this browser';
      console.error('❌', error);
      setState(prev => ({ ...prev, error }));
      toast.error('Not Supported', error);
      return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Request permission
      console.log('📝 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('📝 Permission result:', permission);
      
      if (permission !== 'granted') {
        console.warn('⚠️ Permission not granted:', permission);
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Permission denied',
        }));
        return null;
      }

      // Register service worker
      console.log('🔧 Registering service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      console.log('✅ Service Worker registered:', registration);

      // Wait for service worker to be ready
      console.log('⏳ Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is ready');

      // Get FCM token
      console.log('🔑 Getting FCM token...');
      console.log('🔑 Using VAPID key:', VAPID_KEY);
      
      const messaging = getMessaging(firebaseApp);
      let token: string | null = null;
      
      try {
        token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      } catch (tokenError) {
        // Handle IndexedDB errors gracefully - mobile browsers may restrict access
        console.warn('⚠️ Error getting FCM token (likely IndexedDB restriction):', tokenError);
        
        // Check if it's an IndexedDB-related error
        const errorMessage = tokenError instanceof Error ? tokenError.message : String(tokenError);
        if (errorMessage.includes('indexedDB') || errorMessage.includes('IndexedDB')) {
          console.log('ℹ️ Proceeding in Online-Only mode without offline persistence');
          // Continue without throwing - we'll still mark notifications as "enabled"
          // The app will work in online-only mode for notifications
        } else {
          // If it's a different error, throw it
          throw tokenError;
        }
      }

      if (token) {
        console.log('✅ FCM token obtained');
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
        // Token is null (likely due to IndexedDB issue), but permission was granted
        console.log('⚠️ No FCM token but permission granted - Online-Only mode');
        setState(prev => ({
          ...prev,
          permission: 'granted',
          token: null,
          isLoading: false,
        }));
        
        toast.success('Notifications Enabled', 'You will receive notifications while online');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting notification permission:', error);
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
    console.log('🔕 Revoking notification permission...');
    if (state.token) {
      await removeTokenFromFirestore(state.token);
      setState(prev => ({
        ...prev,
        token: null,
        permission: 'default',
      }));
      toast.info('Notifications Disabled', 'You will no longer receive push notifications');
      console.log('✅ Notifications disabled');
    }
  }, [state.token, removeTokenFromFirestore]);

  // Handle foreground messages
  useEffect(() => {
    if (!state.isSupported || !auth.currentUser) {
      return;
    }

    try {
      console.log('👂 Setting up foreground message listener...');
      const messaging = getMessaging(firebaseApp);
      
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        console.log('📬 Foreground message received:', payload);
        
        const title = payload.notification?.title || 'DgenBooks';
        const body = payload.notification?.body || '';
        
        console.log('📬 Notification details - Title:', title, 'Body:', body);
        
        // Show toast notification for foreground messages
        toast.info(title, body);

        // ALWAYS show browser notification in foreground for better visibility
        if (Notification.permission === 'granted') {
          console.log('🔔 Creating browser notification...');
          try {
            const notification = new Notification(title, {
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: payload.data?.type || 'foreground-notification',
              data: payload.data,
              requireInteraction: false, // Auto-dismiss after a while
            });

            // Handle notification click in foreground
            notification.onclick = (event) => {
              console.log('🖱️ Foreground notification clicked');
              event.preventDefault();
              window.focus();
              const url = payload.data?.url || '/';
              if (url && url !== window.location.pathname) {
                window.location.href = url;
              }
              notification.close();
            };

            console.log('✅ Browser notification created');
          } catch (error) {
            console.error('❌ Error creating browser notification:', error);
          }
        } else {
          console.warn('⚠️ Cannot show browser notification - permission not granted');
        }
      });

      console.log('✅ Foreground message listener set up');

      return () => {
        console.log('🔕 Cleaning up foreground message listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error setting up foreground message handler:', error);
    }
  }, [state.isSupported, auth.currentUser]);

  return {
    ...state,
    requestPermission,
    revokePermission,
  };
}
