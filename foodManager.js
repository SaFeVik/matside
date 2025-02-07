import { db, storage } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

async function getDishes(filter) {
    const dishesCol = collection(db, 'dishes');
    let q;

    // Dersom filter.persons finnes (og inneholder minst ett element), bruk det til å filtrere på "user".
    // Hvis ikke, last inn alle retter.
    if (filter && filter.persons && filter.persons.length > 0) {
        if (filter.persons.length === 1) {
            q = query(dishesCol, where("user", "==", filter.persons[0]));
        } else {
            q = query(dishesCol, where("user", "in", filter.persons));
        }
    } else {
        // Ingen personfilter betyr at vi laster inn alle retter
        q = query(dishesCol);
    }

    // Dersom filteret skal vise kun favoritter, legges den betingelsen til i spørringen.
    if (filter && filter.favourite) {
        q = query(q, where("favourite", "==", true));
    }

    const dishesSnapshot = await getDocs(q);
    let dishList = dishesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // Klientside-filter for "meat" – dersom filteret inneholder flere valg
    if (filter && filter.meat && filter.meat.length > 0) {
        dishList = dishList.filter(dish => filter.meat.includes(dish.meat.toLowerCase()));
    }

    // Klientside-filter for "type"
    if (filter && filter.type && filter.type.length > 0) {
        dishList = dishList.filter(dish => filter.type.includes(dish.type));
    }

    return dishList;
}

async function addDish(dishData) {
    await addDoc(collection(db, "dishes"), dishData)
}
async function updateDish(dishId, dishData) {
    const dishRef = doc(db, "dishes", dishId)
    await updateDoc(dishRef, dishData)
}
async function deleteDish(dishId) {
    const dishRef = doc(db, "dishes", dishId)
    await deleteDoc(dishRef)
}

export { getDishes, addDish, updateDish, deleteDish }