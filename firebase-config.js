// ============================================
// FIREBASE CONFIGURATION
// ============================================
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (name it anything, e.g. "vortex-chat")
// 3. Enable Authentication → Email/Password
// 4. Create a Firestore Database (start in test mode for now)
// 5. Go to Project Settings → Your apps → Web → Register app
// 6. Copy the config object and paste it below

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
