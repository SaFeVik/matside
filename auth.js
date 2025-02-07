import { db, storage } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

async function isUser(userName) {
    const usersCol = collection(db, 'users')
    const q = query(usersCol, where("userName", "==", userName))
    const userFound = await getDocs(q)

    if (!userFound.empty) {
        console.log("Bruker logget inn", userName)
        return true
    } else {
        return false
    }

}

async function makeUser(userName) {
    const user = {"userName": userName}
    try {
        await addDoc(collection(db, "users"), user)
        console.log("Bruker opprettet: ", userName)
    } catch (error) {
        console.error("Feil ved oppretting av bruker: ", error)
    }
}

export { isUser, makeUser }