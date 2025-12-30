// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

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

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
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

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  
  event.notification.close();

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';
  
  // Handle action button clicks
  if (event.action) {
    console.log('[firebase-messaging-sw.js] Action clicked:', event.action);
    // You can handle specific actions here
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Focus the existing window and navigate to the URL
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
});
