import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHe_ynHH-AKGjYlymbpQi8zdOQ26yJJGo",
  authDomain: "kalam-notes.firebaseapp.com",
  projectId: "kalam-notes",
  storageBucket: "kalam-notes.firebasestorage.app",
  messagingSenderId: "1066929757932",
  appId: "1:1066929757932:web:54c44659e5c7c3424a8fc9",
  measurementId: "G-WSJWS3Z6X4"
};

// Initialize Firebase (safely handle Vite HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
