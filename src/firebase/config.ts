// Import the functions you need from the SDKs you need
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrQ8CJrO0cRlmW_aI4qg1xxf0bg7AoIeQ",
  authDomain: "dgenbooks.firebaseapp.com",
  projectId: "dgenbooks",
  storageBucket: "dgenbooks.firebasestorage.app",
  messagingSenderId: "261197764556",
  appId: "1:261197764556:web:a5ea8cf6d7d1ea58ac6f69",
  measurementId: "G-6VB11GMWP4"
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.error("Failed to initialize Firebase", e);
  // @ts-ignore
  app = {}; // Provide a dummy app object to avoid further errors
}


export const firebaseApp = app;
export const firebaseAnalytics = analytics;
export { firebaseConfig };
