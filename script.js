import { isUser, makeUser } from './auth.js';
import { getDishes, addDish, updateDish, deleteDish } from './foodManager.js'
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { storage } from './firebase.js';

const dishTemplateEl = document.querySelector('.dish-template')
const dishTitleInput = dishTemplateEl.querySelector('.dish-template-title');
const dishSubtitleInput = dishTemplateEl.querySelector('.dish-template-subtitle');
const dishMeatInput = dishTemplateEl.querySelector('.dish-template-meat');
const dishRecipieLinkInput = dishTemplateEl.querySelector('.dish-template-recipie-link');
const dishTypeInput = dishTemplateEl.querySelector('.dish-template-type');
const dishImageButtonInput = dishTemplateEl.querySelector('.dish-template-image-button');
const imagePreviewImg = dishTemplateEl.querySelector('.dish-template-image-preview');
const favouriteInput = dishTemplateEl.querySelector('.dish-template-star');

const takePicInput = document.querySelector('.dish-template-image-button-take');
const selectPicInput = document.querySelector('.dish-template-image-button-select');

/* LOGIN */
document.querySelector('.signup-show').addEventListener('click', () => {
    document.querySelector('.signup-div').classList.toggle("hide")
})

document.querySelector('.login-button').addEventListener('click', async () => {
    const input = document.querySelector('.login-name')
    const userName = input.value.toLowerCase()
    if (await isUser(userName)) {
        localStorage.user = userName
        loginState()
    } else {
        alert(`${userName} er ikke en bruker`)
    }
    input.value = ""
})

// Legg til event listener for Enter-tasten i innloggingsfeltet
document.querySelector('.login-name').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        document.querySelector('.login-button').click();
    }
});

document.querySelector('.signup-button').addEventListener('click', async () => {
    const input = document.querySelector('.signup-name')
    const userName = input.value.toLowerCase()
    if (!await isUser(userName)) {
        await makeUser(userName)
        localStorage.user = userName
        loginState()
    } else {
        alert(`${userName} er allerede en bruker`)
    }
    input.value = ""
})

// Legg til event listener for Enter-tasten i registreringsfeltet
document.querySelector('.signup-name').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        document.querySelector('.signup-button').click();
    }
});

async function loginState() {
    if (localStorage.user != "null") {
        await showDishes()
        console.log("Logger inn")
        document.querySelector('.username').innerHTML = localStorage.user
        document.querySelector('.user-div').classList.remove('hide')
        document.querySelector(".login-div").classList.add('hide')
        document.querySelector("main").classList.remove('hide')
    } else {
        document.querySelector('.dishes').innerHTML = ""
        console.log("Logger ut")
        document.querySelector('.user-div').classList.add('hide')
        document.querySelector(".login-div").classList.remove('hide')
        document.querySelector("main").classList.add('hide')
    }

}

document.querySelector(".logout-button").addEventListener('click', () => {
    localStorage.user = "null"
    loginState()
})

/* Filter */
document.querySelector('.filter-title-div').addEventListener('click', () => {
    document.querySelector('.filter-arrow').classList.toggle('rotated')
    document.querySelector('.filter-div').classList.toggle('hide')
})
document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.target.classList.toggle('checked')
    })
})

// Event listener for filter-knappen som bygger filter-objektet basert på hvilke filtere som er "checked"
document.querySelector('#filter-button').addEventListener('click', async () => {
    const filter = {};

    // Persons-filter: Hent alle alternativer i .filter-people og behold de som er checked
    const personNodes = document.querySelectorAll('.filter-people .option');
    const checkedPersons = Array.from(personNodes)
        .filter(el => el.classList.contains('checked'))
        .map(el => el.textContent.trim().toLowerCase());
    // Dersom ikke alle er valgt, legg til persons-filter
    if (checkedPersons.length > 0 && checkedPersons.length < personNodes.length) {
        filter.persons = checkedPersons;
    }

    // Type-filter: Hent de checked alternativer fra .filter-type
    const typeNodes = document.querySelectorAll('.filter-type .option');
    const checkedTypes = Array.from(typeNodes)
        .filter(el => el.classList.contains('checked'))
        .map(el => el.textContent.trim());
    if (checkedTypes.length > 0 && checkedTypes.length < typeNodes.length) {
        filter.type = checkedTypes;
    }

    // Meat-filter: Hent de checked alternativene fra .filter-meat
    const meatNodes = document.querySelectorAll('.filter-meat .option');
    const checkedMeats = Array.from(meatNodes)
        .filter(el => el.classList.contains('checked'))
        .map(el => el.textContent.trim().toLowerCase());
    if (checkedMeats.length > 0 && checkedMeats.length < meatNodes.length) {
        filter.meat = checkedMeats;
    }

    // Favoritt-filter: Dersom "Vis bare favoritter" er checked, legg til filter.favourite
    const favOption = document.querySelector('.filter-favorite .option');
    if (favOption && favOption.classList.contains('checked')) {
        filter.favourite = true;
    }

    // Hent retter med filteret. Dersom filter.persons ikke sendes med, lastes alle retter inn.
    await showDishes(filter);
});

/* Add dish */

document.querySelector('.add-dish-button').addEventListener('click', () => {
    editingDishId = "null"
    changeTemplateValues("")
    dishTemplateEl.classList.remove('hide')
})
document.querySelector('.dish-template-x').addEventListener('click', () => {
    dishTemplateEl.classList.add('hide')
})

favouriteInput.addEventListener('click', () => {
    favouriteInput.classList.toggle('favourite')
})

// Globale variabler for å holde styr på bildet
let dishImageURL = "";
let dishImagePath = "";
let currentDishImagePath = ""; // Brukes ved redigering for å lagre stien til eksisterende bilde

// Konstantinne for bildekomprimering
const MAX_IMAGE_WIDTH = 800;
const COMPRESSION_QUALITY = 0.7;

// Oppdatert funksjon for å konvertere, komprimere og laste opp bildet
async function processImage(file) {
    console.log("Starter prosessering av bilde...", file);
    showLoading(true); // Vis lasteindikatoren
    
    try {
        // Sjekk om filen er en HEIC-fil
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
            try {
                const conversionResult = await heic2any({ 
                    blob: file, 
                    toType: "image/jpeg", 
                    quality: COMPRESSION_QUALITY 
                });
                file = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                console.log("HEIC konvertering var vellykket!");
            } catch (error) {
                console.error("Feil under konvertering av HEIC:", error);
                showLoading(false); // Skjul lasteindikatoren ved feil
                alert("Kunne ikke konvertere HEIC-bildet. Prøv et annet bilde.");
                return;
            }
        }
        
        // Hvis i redigeringsmodus og bilde allerede finnes, slett det gamle
        if (editingDishId !== "null" && currentDishImagePath !== "") {
            console.log("Sletter gammelt bilde fra Storage...", currentDishImagePath);
            const oldImageRef = ref(storage, currentDishImagePath);
            try {
                await deleteObject(oldImageRef);
                console.log("Gammelt bilde slettet");
            } catch (err) {
                console.error("Feil ved sletting av gammelt bilde:", err);
                // Fortsett likevel, feilen er ikke kritisk
            }
            currentDishImagePath = "";
        }
        
        // Last bilde inn i Image-objekt for komprimering
        const compressedFile = await compressImage(file);
        
        // Generer filnavn og sti
        const filename = `${Date.now()}.jpg`;
        dishImagePath = `images/${filename}`;
        console.log("Starter opplasting til Storage med filsti:", dishImagePath);
        
        // Referanse til hvor bildet skal lagres i Firebase Storage
        const storageRef = ref(storage, dishImagePath);
        
        // Last opp det komprimerte bildet
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(snapshot.ref);
        
        console.log("Opplasting vellykket! Nedlastings-URL:", url);
        imagePreviewImg.src = url;
        dishImageURL = url;
        showLoading(false); // Skjul lasteindikatoren ved vellykket opplasting
        
    } catch (error) {
        console.error("Feil ved bildeprosessering:", error);
        showLoading(false);
        alert("Det oppstod en feil ved behandling av bildet. Prøv igjen senere.");
    }
}

// Funksjon for å komprimere bilder
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            console.log("Bilde lastet inn i Image-objektet, starter komprimering...");
            console.log(`Original størrelse: ${img.width}x${img.height}`);
            
            const canvas = document.createElement("canvas");
            const ratio = Math.min(1, MAX_IMAGE_WIDTH / img.width);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            console.log(`Komprimert størrelse: ${canvas.width}x${canvas.height}`);
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(blob => {
                if (blob) {
                    console.log(`Original filstørrelse: ~${Math.round(file.size/1024)}KB`);
                    console.log(`Komprimert filstørrelse: ~${Math.round(blob.size/1024)}KB`);
                    console.log(`Komprimeringsratio: ${Math.round((1 - blob.size/file.size) * 100)}%`);
                    resolve(blob);
                } else {
                    reject(new Error("Kunne ikke komprimere bildet"));
                }
            }, 'image/jpeg', COMPRESSION_QUALITY);
        };
        
        img.onerror = function() {
            reject(new Error("Kunne ikke laste inn bildet"));
        };
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error("Kunne ikke lese filen"));
        };
        reader.readAsDataURL(file);
    });
}

// Hent referanser til nødvendige elementer
const takePicButton = document.querySelector('.take-pic-button');
const selectPicButton = document.querySelector('.select-pic-button');

// Lytt på endringer for "Ta bilde"
takePicInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0]);
    }
});

// Lytt på endringer for "Velg bilde"
selectPicInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0]);
    }
});

// Koble knappene til de skjulte file-inputene
takePicButton.addEventListener('click', () => {
    takePicInput.click();
});

selectPicButton.addEventListener('click', () => {
    selectPicInput.click();
});

// --- EVENTLISTENER FOR "FJERN BILDE" ---
const removeImageButton = document.querySelector('.remove-image-button');
if (removeImageButton) {
    removeImageButton.addEventListener('click', () => {
        let imagePathToDelete = editingDishId !== "null" ? currentDishImagePath : dishImagePath;
        if (imagePathToDelete) {
            console.log("Fjerner bilde manuelt med sti:", imagePathToDelete);
            deleteObject(ref(storage, imagePathToDelete))
                .then(() => {
                    console.log("Bilde slettet manuelt.");
                    dishImageURL = "";
                    dishImagePath = "";
                    currentDishImagePath = "";
                    imagePreviewImg.src = "";
                })
                .catch(err => console.error("Feil ved sletting av bilde:", err));
        } else {
            console.log("Ingen bildebane funnet å slette.");
        }
    });
}

// --- LAGRING AV MATRETT ---
document.querySelector('.save-dish-button').addEventListener('click', async () => {
    console.log("Starter lagring av matrett...");
    const favourite = favouriteInput.classList.contains('favourite');
    const dishData = {
        title: dishTitleInput.value,
        subtitle: dishSubtitleInput.value,
        meat: dishMeatInput.value,
        recipieLink: dishRecipieLinkInput.value,
        type: dishTypeInput.value,
        image: (dishImageURL || "Bildesti"),
        imagePath: (dishImageURL ? (dishImagePath || currentDishImagePath) : ""),
        user: localStorage.user,
        favourite: favourite
    };
    console.log("Matrettdata som skal lagres:", dishData);
    
    if (editingDishId !== "null") {
        await updateDish(editingDishId, dishData);
        console.log("Matrett oppdatert.");
    } else {
        await addDish(dishData);
        console.log("Ny matrett opprettet.");
    }
    
    await showDishes();
    dishTemplateEl.classList.add('hide');
});

/* Show dishes */
async function showDishes(filter) {
    if (localStorage.user !== "null") {
        const dishList = await getDishes(filter);
        const dishesContainer = document.querySelector('.dishes');
        dishesContainer.innerHTML = "";

        dishList.forEach(dish => {
            const dishDiv = document.createElement('div');
            dishDiv.className = 'dish';
            dishDiv.setAttribute('data-dish-id', dish.id);
            dishDiv.setAttribute('data-dish-meat', dish.meat);

            // Hvis dish.image er satt og ikke er fallback-verdien, bruk den. Ellers benytt standard-bildesti.
            const dishImage = dish.image && dish.image !== "Bildesti" ? dish.image : "./images/rett.jpg";

            dishDiv.innerHTML = `
                <div class="dish-header">
                    <div class="dish-header-top">
                        <p class="dish-user">${dish.user}</p>
                        <p class="dish-edit">Rediger</p>
                    </div>
                    <div class="dish-title">
                        ${dish.title}
                    </div>
                    <div class="dish-subtitle">
                        ${dish.subtitle}
                    </div>
                </div>
                <div class="dish-body" style="background-image: url('${dishImage}');">
                    <div class="dish-type">${dish.type}</div>
                    <div class="dish-star-div ${dish.favourite ? 'favourite' : ''}">
                        <img src="images/star.svg" class="dish-star ${dish.favourite ? 'favourite' : ''}">
                    </div>
                    <div class="dish-recipie-div">
                        <a href="${dish.recipieLink}" target="_blank" class="dish-recipie">
                            <img src="images/recipie.svg">
                        </a>
                    </div>
                </div>
            `;

            dishesContainer.appendChild(dishDiv);
        });

        // Eksempel på hvordan du kan legge til event listeners til .dish-edit knappene om du ønsker redigeringsfunksjonalitet
        document.querySelectorAll('.dish-edit').forEach(editButton => {
            editButton.addEventListener('click', handleEditClick);
        });
    }
}

/* Edit dish */
let editingDishId = "null"

async function changeTemplateValues(title="", subtitle="", meat="kjøtt", recipieLink="", type="Middag", favourite=false, imageUrl="", imagePath="") {
    const dishTemplateEl = document.querySelector('.dish-template')
    dishTemplateEl.querySelector('.dish-template-title').value = title
    dishTemplateEl.querySelector('.dish-template-subtitle').value = subtitle
    dishTemplateEl.querySelector('.dish-template-meat').value = meat
    dishTemplateEl.querySelector('.dish-template-recipie-link').value = recipieLink
    dishTemplateEl.querySelector('.dish-template-type').value = type
    if (favourite) {
        dishTemplateEl.querySelector('.dish-template-star').classList.add('favourite')
    } else {
        dishTemplateEl.querySelector('.dish-template-star').classList.remove('favourite')
    }
    
    // Oppdater bildevisning ved redigering
    if (imageUrl && imageUrl !== "Bildesti") {
        imagePreviewImg.src = imageUrl;
        dishImageURL = imageUrl;
        currentDishImagePath = imagePath || "";
    } else {
        imagePreviewImg.src = "";
        dishImageURL = "";
        currentDishImagePath = "";
    }
}

/* Delete dish */
document.querySelector('.delete-dish-button').addEventListener('click', async () => {
    console.log("Starter sletting av matrett...");
    if (editingDishId !== "null") {
        const imagePathToDelete = dishImagePath || currentDishImagePath;
        if (imagePathToDelete) {
            console.log("Sletter tilknyttet bilde med sti:", imagePathToDelete);
            deleteObject(ref(storage, imagePathToDelete))
                .then(() => console.log("Bilde slettet ved matrett-sletting."))
                .catch(err => console.error("Feil ved sletting av bilde ved fjerning av matrett:", err));
        }
        await deleteDish(editingDishId);
        console.log("Matrett slettet.");
    } else {
        dishTemplateEl.classList.add('hide');
        console.log("Ingen matrett redigeringsmodus, skjuler malen.");
    }
    await showDishes();
})

// Denne funksjonen henter alle brukere fra "users"-samlingen og bygger filterlisten dynamisk.
// Alle brukere markeres som "checked" fra start.
async function loadFilterUsers() {
    const usersCol = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    const userList = usersSnapshot.docs.map(doc => doc.data());
    
    const filterPeopleContainer = document.querySelector('.filter-people');
    filterPeopleContainer.innerHTML = ''; // Tøm containeren før oppbygging

    userList.forEach(user => {
        const pElem = document.createElement('p');
        // Legg til både "option" OG "checked" for at alle skal være valgt fra start
        pElem.classList.add('option', 'checked');
        pElem.textContent = user.userName;
        
        // Ved klikk toggles checked-klassen (bruker kan dermed fjerne enkelte brukere fra filteret)
        pElem.addEventListener('click', () => {
            pElem.classList.toggle('checked');
        });
        filterPeopleContainer.appendChild(pElem);
    });
}

// Kall funksjonen når DOM-en er helt lastet inn
window.addEventListener('DOMContentLoaded', () => {
    // Initialiser filterbrukere
    loadFilterUsers();
    
    // Sjekk innloggingsstatus
    loginState();
});

// --- SØKEFUNKSJONALITET ---
document.querySelector('#search-button').addEventListener('click', performSearch);
document.querySelector('#search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Funksjonen som utfører søkingen
async function performSearch() {
    const searchTerm = document.querySelector('#search-input').value.toLowerCase().trim();
    if (searchTerm === '') {
        await showDishes(); // Vis alle retter hvis søkefeltet er tomt
        return;
    }
    
    // Hent alle retter først, og filter lokalt
    const allDishes = await getDishes();
    const filteredDishes = allDishes.filter(dish => 
        dish.title.toLowerCase().includes(searchTerm) || 
        dish.subtitle.toLowerCase().includes(searchTerm)
    );
    
    // Vis resultatet
    const dishesContainer = document.querySelector('.dishes');
    dishesContainer.innerHTML = "";
    
    if (filteredDishes.length === 0) {
        dishesContainer.innerHTML = `<div class="no-results">Ingen retter funnet for "${searchTerm}"</div>`;
        return;
    }
    
    // Vis de filtrerte rettene
    filteredDishes.forEach(dish => {
        const dishDiv = document.createElement('div');
        dishDiv.className = 'dish';
        dishDiv.setAttribute('data-dish-id', dish.id);
        dishDiv.setAttribute('data-dish-meat', dish.meat);

        // Hvis dish.image er satt og ikke er fallback-verdien, bruk den. Ellers benytt standard-bildesti.
        const dishImage = dish.image && dish.image !== "Bildesti" ? dish.image : "./images/rett.jpg";

        dishDiv.innerHTML = `
            <div class="dish-header">
                <div class="dish-header-top">
                    <p class="dish-user">${dish.user}</p>
                    <p class="dish-edit">Rediger</p>
                </div>
                <div class="dish-title">
                    ${dish.title}
                </div>
                <div class="dish-subtitle">
                    ${dish.subtitle}
                </div>
            </div>
            <div class="dish-body" style="background-image: url('${dishImage}');">
                <div class="dish-type">${dish.type}</div>
                <div class="dish-star-div ${dish.favourite ? 'favourite' : ''}">
                    <img src="images/star.svg" class="dish-star ${dish.favourite ? 'favourite' : ''}">
                </div>
                <div class="dish-recipie-div">
                    <a href="${dish.recipieLink}" target="_blank" class="dish-recipie">
                        <img src="images/recipie.svg">
                    </a>
                </div>
            </div>
        `;

        dishesContainer.appendChild(dishDiv);
    });
    
    // Legg til edit-funksjonalitet også til de søkte rettene
    document.querySelectorAll('.dish-edit').forEach(editButton => {
        editButton.addEventListener('click', handleEditClick);
    });
}

// Hjelpefunksjon for å håndtere klikk på rediger-knappen
function handleEditClick(e) {
    const dishDiv = e.target.closest('.dish');
    editingDishId = dishDiv.getAttribute('data-dish-id');
    console.log(`Redigerer rett med ID: ${editingDishId}`);

    const title = dishDiv.querySelector('.dish-title').innerText;
    const subtitle = dishDiv.querySelector('.dish-subtitle').innerText;
    const meat = dishDiv.getAttribute('data-dish-meat');
    const recipieLink = dishDiv.querySelector('.dish-recipie').getAttribute('href')
    const type = dishDiv.querySelector('.dish-type').innerText
    const favourite = dishDiv.querySelector('.dish-star-div').classList.contains('favourite')
    
    // Finn dishList først
    getDishes().then(dishList => {
        const currentDish = dishList.find(d => d.id === editingDishId);
        const imageUrl = currentDish ? currentDish.image : "";
        const imagePath = currentDish ? currentDish.imagePath : "";
        
        changeTemplateValues(title, subtitle, meat, recipieLink, type, favourite, imageUrl, imagePath);
        dishTemplateEl.classList.remove('hide');
    });
}

// --- LASTEINDIKATORFUNKSJONALITET ---
function showLoading(show = false) {
    // Hvis loading-elementet ikke finnes, opprett det
    if (!document.querySelector('.loading-spinner')) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner hide';
        spinner.innerHTML = '<div class="spinner"></div><p>Laster...</p>';
        document.body.appendChild(spinner);
    }
    
    // Vis eller skjul spinnereren
    const spinner = document.querySelector('.loading-spinner');
    if (show) {
        spinner.classList.remove('hide');
    } else {
        spinner.classList.add('hide');
    }
}

