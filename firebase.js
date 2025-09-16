import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqDBY8ZlNsgM0xhFe5qgHCoYI1Rv2uczU",
  authDomain: "chatarrera-system.firebaseapp.com",
  projectId: "chatarrera-system",
  storageBucket: "chatarrera-system.firebasestorage.app",
  messagingSenderId: "740453262138",
  appId: "1:740453262138:web:13f194d36f30d195b5e603",
  measurementId: "G-B971ZFMVEY"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);