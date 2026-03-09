import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB9oUIh8Ccqt8D-OCJrQVcQTAHRmzDiIZs",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "arc-journal-8086f.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "arc-journal-8086f",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "arc-journal-8086f.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "433957470546",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:433957470546:web:9262d198305279e9c07a8b",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, "arcjrnzz8");
const storage = getStorage(app);

export { app, auth, db, storage };
