import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuCq7bWBnXaULcrlDFrt7poCJeLx7iKP0",
  authDomain: "capabilio-ai.firebaseapp.com",
  projectId: "capabilio-ai",
  storageBucket: "capabilio-ai.firebasestorage.app",
  messagingSenderId: "487151382110",
  appId: "1:487151382110:web:f57898f33fa52d80c38ecf",
  measurementId: "G-DP691V02B3",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;