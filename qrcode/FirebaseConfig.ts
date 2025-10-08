// firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZblI7S4smfLe5sHfbc2VZqQLa8l2rIAc",
  authDomain: "fuze-be491.firebaseapp.com",
  projectId: "fuze-be491",
  storageBucket: "fuze-be491.firebasestorage.app",
  messagingSenderId: "1022359132799",
  appId: "1:1022359132799:web:74572056121f802ad7bd4a",
};

// Initialize Firebase (avoid re-initialization during Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
