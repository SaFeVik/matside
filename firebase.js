import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB94CA3-iFO4fJo3J2YHdGt70bQOVkQAk0",
  authDomain: "matside-4e35a.firebaseapp.com",
  projectId: "matside-4e35a",
  storageBucket: "matside-4e35a.appspot.com",
  messagingSenderId: "910675157152",
  appId: "1:910675157152:web:98640657498bfda41729c5",
  measurementId: "G-72QLN1X328"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export {db, storage}