// FIX: Removed the vite/client reference that was causing a "file not found" error
// and added a manual type declaration for `import.meta.env` to resolve
// the subsequent TypeScript errors.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_FIREBASE_API_KEY: string;
      readonly VITE_FIREBASE_AUTH_DOMAIN: string;
      readonly VITE_FIREBASE_PROJECT_ID: string;
      readonly VITE_FIREBASE_STORAGE_BUCKET: string;
      readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      readonly VITE_FIREBASE_APP_ID: string;
    };
  }
}

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// These variables are loaded from the .env.local file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);