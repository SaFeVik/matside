import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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
const storage = getStorage(app);

// Funksjon for å laste opp et bilde
function uploadImage(file) {
    const storageRef = ref(storage, 'images/' + file.name); // Angi sti i Storage
    uploadBytes(storageRef, file).then((snapshot) => {
        console.log('Bilde lastet opp:', snapshot);
    }).catch((error) => {
        console.error('Feil ved opplasting:', error);
    });
}

// Bruk funksjonen med en fil (f.eks. fra en input)
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        uploadImage(file);
    }
});