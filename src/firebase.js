import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyDRBFwVNP55JwHLCFsSmmRyu6SLCnjk_gw",
  authDomain: "myredesocial-web.firebaseapp.com",
  projectId: "myredesocial-web",
  storageBucket: "myredesocial-web.firebasestorage.app",
  messagingSenderId: "993396200515",
  appId: "1:993396200515:web:04ca2c5e5e5e78feae30f6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db =getFirestore(app);