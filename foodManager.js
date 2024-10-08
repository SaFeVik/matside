import { db, storage } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

async function getDishes(sort) {
    const dishesCol = collection(db, 'dishes');
    const q = query(dishesCol, where("user", "==", "Felix"));
    const dishesSnapshot = await getDocs(q);
    const dishList = dishesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    return dishList
}

async function addDish() {
    const newDish = {
        name: "Laks 2",
        recipe: "https://trinesmatblogg.no/recipe/laks-med-soyasaus-agurk-og-eplesalat/",
        sideDish: "med syltet agurk, poteter og fløtesaus",
        user: "Felix"
    }
    
    await addDoc(collection(db, "dishes"), newDish)
}

