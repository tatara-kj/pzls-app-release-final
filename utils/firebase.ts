import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// To NIE jest sekret. Może być w kodzie, ale docelowo przeniesiemy to do .env
const firebaseConfig = {
  apiKey: "AIzaSyAZOSio6I3sV126OyLBLCOtyijq_WIsSKA",
  authDomain: "pzls-app.firebaseapp.com",
  projectId: "pzls-app",
  storageBucket: "pzls-app.firebasestorage.app",
  messagingSenderId: "364251623789",
  appId: "1:364251623789:web:510bdf9da500ec37f22a64",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
