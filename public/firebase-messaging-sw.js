// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

console.log('SW: Service Worker script loaded');

importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

console.log('SW: Firebase scripts imported');

// Initialize Firebase in the service worker
// Note: Service workers don't have access to environment variables
// This configuration matches the client-side config in src/firebase/config.ts
firebase.initializeApp({
  apiKey: "AIzaSyBrQ8CJrO0cRlmW_aI4qg1xxf0bg7AoIeQ",
  authDomain: "dgenbooks.firebaseapp.com",
  projectId: "dgenbooks",
  storageBucket: "dgenbooks.firebasestorage.app",
  messagingSenderId: "261197764556",
  appId: "1:261197764556:web:a5ea8cf6d7d1ea58ac6f69",
  measurementId: "G-6VB11GMWP4"
});

console.log('SW: Firebase initialized');

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

console.log('SW: Firebase Messaging instance created');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('SW: Background Message Received', payload);
  console.log('SW: Notification data:', payload.notification);
  console.log('SW: Custom data:', payload.data);
  
  // Extract notification data
  const notificationTitle = payload.notification?.title || 'DgenBooks Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200], // Subtle vibration pattern
    tag: payload.data?.type || 'default', // Group similar notifications
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type || 'general',
      itemId: payload.data?.itemId || null,
    },
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [],
    requireInteraction: payload.data?.requireInteraction === 'true',
  };

  console.log('SW: Showing notification with title:', notificationTitle);
  console.log('SW: Notification options:', notificationOptions);

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification click received', event);
  console.log('SW: Action clicked:', event.action || 'default');
  
  event.notification.close();

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';
  console.log('SW: Opening URL:', urlToOpen);
  
  // Handle action button clicks
  if (event.action) {
    console.log('SW: Specific action clicked:', event.action);
    // You can handle specific actions here
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      console.log('SW: Found', clientList.length, 'client windows');
      
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          console.log('SW: Focusing existing window');
          // Focus the existing window and navigate to the URL
          return client.focus().then(() => {
            if ('navigate' in client) {
              console.log('SW: Navigating to:', urlToOpen);
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        console.log('SW: Opening new window');
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('SW: Service Worker activated');
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('SW: Service Worker installing');
  self.skipWaiting(); // Activate worker immediately
});

console.log('SW: Service Worker setup complete');
