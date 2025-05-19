import { isUser, makeUser } from './auth.js';
import { getDishes, addDish, updateDish, deleteDish } from './foodManager.js'
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
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
const dishTemplateUserEl = dishTemplateEl.querySelector('.dish-template-user');
const imageDropZoneEl = dishTemplateEl.querySelector('.dish-template-image-drop-zone');
const dishSubtypeInput = dishTemplateEl.querySelector('.dish-template-subtype');
const difficultyKnivesEl = dishTemplateEl.querySelectorAll('.difficulty-knife');
let currentDifficulty = 0;
const dishTemplateCreatedAtEl = dishTemplateEl.querySelector('.dish-template-created-at');

const takePicInput = document.querySelector('.dish-template-image-button-take');
const selectPicInput = document.querySelector('.dish-template-image-button-select');

const saveButton = document.querySelector('.save-dish-button');

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
    if (localStorage.user && localStorage.user !== "null" && localStorage.user !== "undefined") {
        console.log("Logger inn")
        document.querySelector('.username').innerHTML = localStorage.user
        document.querySelector('.user-div').classList.remove('hide')
        document.querySelector(".login-div").classList.add('hide')
        document.querySelector("main").classList.remove('hide')

        // Last inn brukerpreferanser og vis retter
        const { filter, sortOrder, searchTerm } = loadAndApplyUserPreferences();
        await showDishes(filter, sortOrder, searchTerm);

    } else {
        document.querySelector('.dishes').innerHTML = ""
        console.log("Logger ut")
        document.querySelector('.username').innerHTML = "";
        document.querySelector('.user-div').classList.add('hide')
        document.querySelector(".login-div").classList.remove('hide')
        document.querySelector("main").classList.add('hide')

        // Tøm lagrede preferanser ved utlogging
        localStorage.removeItem('maritaUserFilter');
        localStorage.removeItem('maritaUserSortOrder');
        localStorage.removeItem('maritaUserSearchTerm');
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

// --- SORT OPTION SELECTION LOGIC --- (This block can be removed as we now use a select dropdown)
/*
document.querySelectorAll('.sort-date .sort-option').forEach(option => {
    option.addEventListener('click', (e) => {
        // ... (old logic) ...
    });
});
*/

// Event listener for filter-knappen som bygger filter-objektet basert på hvilke filtere som er "checked"
// This button will be renamed to "Søk" and will handle both filtering and searching
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

    // Subtype-filter: (Endret logikk herfra)
    const subtypeNodes = document.querySelectorAll('.filter-subtype .option');
    const tempCheckedSubtypes = [];
    let tempIncludeNoSubtype = false;
    let isIngenKategoriPresentInOptions = false;

    subtypeNodes.forEach(node => {
        const nodeText = node.textContent.trim().toLowerCase();
        if (nodeText === 'ingen kategori') {
            isIngenKategoriPresentInOptions = true;
            if (node.classList.contains('checked')) {
                tempIncludeNoSubtype = true;
            }
        } else if (node.classList.contains('checked')) {
            tempCheckedSubtypes.push(nodeText);
        }
    });

    let numActualSubtypeOptions = subtypeNodes.length;
    if (isIngenKategoriPresentInOptions) {
        numActualSubtypeOptions--;
    }
    // Sikrer at numActualSubtypeOptions ikke er negativ, selv om det ikke bør skje.
    if (numActualSubtypeOptions < 0) numActualSubtypeOptions = 0; 

    if (tempIncludeNoSubtype) {
        filter.includeNoSubtype = true;
        // Hvis "ingen kategori" er krysset av, og det også er andre kategorier krysset av,
        // skal disse andre kategoriene også med i filteret.
        if (tempCheckedSubtypes.length > 0) {
            filter.subtype = tempCheckedSubtypes;
        }
    } else {
        // "ingen kategori" er IKKE krysset av.
        // Bruk subtype-filteret kun hvis noen, men ikke ALLE, faktiske kategorier er valgt.
        if (tempCheckedSubtypes.length > 0 && tempCheckedSubtypes.length < numActualSubtypeOptions) {
            filter.subtype = tempCheckedSubtypes;
        }
        // Hvis tempCheckedSubtypes.length === numActualSubtypeOptions (og "ingen kategori" ikke er valgt),
        // betyr det at alle faktiske kategorier er valgt, så ingen filter.subtype trengs (viser alle).
        // Hvis tempCheckedSubtypes.length === 0 (og "ingen kategori" ikke er valgt), trengs heller ikke filter.
    }
    // (Slutt på endret logikk for subtype)

    // Favoritt-filter: Dersom "Vis bare favoritter" er checked, legg til filter.favourite
    const favOption = document.querySelector('.filter-favorite .option');
    if (favOption && favOption.classList.contains('checked')) {
        filter.favourite = true;
    }

    // Get sort order from the new select dropdown
    const sortOrder = document.getElementById('sort-select').value;

    // Get search term
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    // Lagre innstillinger i localStorage
    localStorage.setItem('maritaUserFilter', JSON.stringify(filter));
    localStorage.setItem('maritaUserSortOrder', sortOrder);
    localStorage.setItem('maritaUserSearchTerm', searchTerm);

    // Hent retter, filtrer OG søk, deretter sorter
    await showDishes(filter, sortOrder, searchTerm); // Pass searchTerm to showDishes

    // Lukk filter-div etter søk
    document.querySelector('.filter-div').classList.add('hide');
    document.querySelector('.filter-arrow').classList.remove('rotated');
});

/* Add dish */

document.querySelector('.add-dish-button').addEventListener('click', () => {
    editingDishId = "null"
    changeTemplateValues("", "", "kjøtt", "", "Middag", false, "", "", localStorage.user, "", 0, "")
    dishTemplateEl.classList.remove('hide')
})
document.querySelector('.dish-template-x').addEventListener('click', () => {
    dishTemplateEl.classList.add('hide')
    if (document.activeElement) {
        document.activeElement.blur();
    }
})

favouriteInput.addEventListener('click', () => {
    favouriteInput.classList.toggle('favourite');
    // Toggle SVG source based on favourite state
    if (favouriteInput.classList.contains('favourite')) {
        favouriteInput.src = './images/star-filled-yellow.svg';
    } else {
        favouriteInput.src = './images/star-outline.svg';
    }
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
    // console.log("processImage: Started processing image file:", file);
    showLoading(true); // Vis lasteindikatoren
    
    try {
        // Sjekk om filen er en HEIC-fil
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
            // console.log("processImage: Detected HEIC file, attempting conversion.");
            try {
                const conversionResult = await heic2any({ 
                    blob: file, 
                    toType: "image/jpeg", 
                    quality: COMPRESSION_QUALITY 
                });
                file = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                // console.log("processImage: HEIC conversion successful!");
            } catch (error) {
                // console.error("processImage: Error during HEIC conversion:", error);
                showLoading(false); // Skjul lasteindikatoren ved feil
                alert("Kunne ikke konvertere HEIC-bildet. Prøv et annet bilde.");
                return;
            }
        }
        
        // Hvis i redigeringsmodus og bilde allerede finnes, slett det gamle
        if (editingDishId !== "null" && currentDishImagePath !== "") {
            // console.log("processImage: Editing mode - Deleting old image from Storage:", currentDishImagePath);
            const oldImageRef = ref(storage, currentDishImagePath);
            try {
                await deleteObject(oldImageRef);
                // console.log("processImage: Old image deleted successfully.");
            } catch (err) {
                // console.error("processImage: Error deleting old image:", err);
            }
            currentDishImagePath = "";
        }
        
        // console.log("processImage: Compressing image...");
        const compressedFile = await compressImage(file);
        // console.log("processImage: Image compression complete.");
        
        const filename = `${Date.now()}.jpg`;
        dishImagePath = `images/${filename}`;
        // console.log("processImage: Starting upload to Storage with path:", dishImagePath);
        
        const storageRef = ref(storage, dishImagePath);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(snapshot.ref);
        
        // console.log("processImage: Upload successful! Download URL:", url);
        imagePreviewImg.src = url;
        // console.log("processImage: Set imagePreviewImg.src to:", imagePreviewImg.src);
        imagePreviewImg.style.display = 'block'; // Make sure it's visible
        // console.log("processImage: Set imagePreviewImg.style.display to 'block'.");
        dishImageURL = url;
        showLoading(false); 
        
    } catch (error) {
        // console.error("processImage: Error during image processing:", error);
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

// Drag and drop for imageDropZoneEl
if (imageDropZoneEl) {
    imageDropZoneEl.addEventListener('dragenter', (e) => {
        e.preventDefault();
        imageDropZoneEl.classList.add('drag-over');
    });

    imageDropZoneEl.addEventListener('dragover', (e) => {
        e.preventDefault(); // Viktig for å tillate drop
        imageDropZoneEl.classList.add('drag-over'); // Sørg for at klassen er der underveis
    });

    imageDropZoneEl.addEventListener('dragleave', (e) => {
        e.preventDefault();
        // Sjekk om man forlater til et child element, i så fall ikke fjern klassen
        if (e.relatedTarget && imageDropZoneEl.contains(e.relatedTarget)) {
            return;
        }
        imageDropZoneEl.classList.remove('drag-over');
    });

    imageDropZoneEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        imageDropZoneEl.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            // Her antar vi at processImage er definert et annet sted og håndterer filen
            // For eksempel: displayImagePreview(file); og lagre filen for opplasting
            if (typeof processImage === 'function') {
                await processImage(file); 
            }
            // Sørg for at filinput-feltet tømmes hvis det skulle vært brukt
            if(takePicInput) takePicInput.value = '';
            if(selectPicInput) selectPicInput.value = '';
        }
    });
}

// --- DIFFICULTY SELECTION LOGIC ---
difficultyKnivesEl.forEach(knife => {
    knife.addEventListener('click', () => {
        const value = parseInt(knife.dataset.value);
        currentDifficulty = currentDifficulty === value ? 0 : value; // Toggle if same knife clicked, or set new value
        updateDifficultyDisplay();
    });
});

function updateDifficultyDisplay() {
    difficultyKnivesEl.forEach(k => {
        const val = parseInt(k.dataset.value);
        if (val <= currentDifficulty) {
            k.classList.add('selected');
        } else {
            k.classList.remove('selected');
        }
    });
}

function generateDifficultyIcons(difficulty) {
    if (!difficulty || difficulty < 1) return '';
    let iconsHTML = '';
    for (let i = 0; i < difficulty; i++) {
        // Assuming you have knife.svg in mat/images/
        iconsHTML += `<img src="./images/knife.svg" class="card-knife-icon" alt="Difficulty">`; 
    }
    return iconsHTML;
}

// --- EVENTLISTENER FOR "FJERN BILDE" ---
const removeImageButton = document.querySelector('.remove-image-button');
if (removeImageButton) {
    removeImageButton.addEventListener('click', () => {
        let imagePathToDelete = editingDishId !== "null" ? currentDishImagePath : dishImagePath;
        // console.log("removeImageButton: Clicked. Attempting to remove image. Path to delete:", imagePathToDelete);
        if (imagePathToDelete) {
            // console.log("removeImageButton: Proceeding to delete image from storage:", imagePathToDelete);
            deleteObject(ref(storage, imagePathToDelete))
                .then(() => {
                    // console.log("removeImageButton: Image deleted successfully from storage.");
                    dishImageURL = "";
                    dishImagePath = "";
                    currentDishImagePath = "";
                    imagePreviewImg.src = "";
                    imagePreviewImg.style.display = 'none'; // Hide preview
                    // console.log("removeImageButton: Cleared image URLs, paths, and hid preview.");
                })
                .catch(err => {
                    // console.error("removeImageButton: Error deleting image from storage:", err);
                });
        } else {
            // console.log("removeImageButton: No image path found to delete.");
            imagePreviewImg.src = "";
            imagePreviewImg.style.display = 'none';
            dishImageURL = ""; 
            // console.log("removeImageButton: No image path, ensured preview is hidden and URL is cleared.");
        }
    });
}

// --- LAGRING AV MATRETT ---
saveButton.addEventListener('click', async () => {
    console.log("Starter lagring av matrett...");
    const favourite = favouriteInput.classList.contains('favourite');
    const dishData = {
        title: dishTitleInput.value,
        subtitle: dishSubtitleInput.value,
        meat: dishMeatInput.value,
        recipieLink: dishRecipieLinkInput.value,
        type: dishTypeInput.value,
        subtype: dishSubtypeInput.value,
        difficulty: currentDifficulty,
        favourite: favourite,
        imageUrl: dishImageURL,
        imagePath: (dishImageURL ? (dishImagePath || currentDishImagePath) : ""),
        user: localStorage.user,
        createdAt: new Date().toISOString()
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
    if (document.activeElement) {
        document.activeElement.blur();
    }
});

// Global Enter-lytter for redigeringsvindu
document.addEventListener('keydown', function(event) {
    // Sjekk for redigeringsvindu først
    if (dishTemplateEl && !dishTemplateEl.classList.contains('hide') && event.key === 'Enter') {
        event.preventDefault(); 
        if (saveButton) {
           console.log("Global Enter trykket mens redigeringsmal er åpen. Lagrer...");
           saveButton.click();
        }
        return; // Avslutt her hvis Enter var for redigeringsvinduet
    }

    // Sjekk deretter for filtervindu
    const filterDiv = document.querySelector('.filter-div');
    const filterButton = document.querySelector('#filter-button');

    if (filterDiv && !filterDiv.classList.contains('hide') && event.key === 'Enter') {
        // Forhindre standard Enter-oppførsel (f.eks. hvis et input er i fokus i filteret)
        event.preventDefault();
        
        if (filterButton) {
            console.log("Global Enter trykket mens filtervindu er åpent. Utfører søk/filter...");
            filterButton.click();
        }
    }
});

/* Show dishes */
async function showDishes(filter, sortOrder, searchTerm) {
    if (localStorage.user !== "null") {
        showLoading(true); // Vis lasteindikatoren
        let dishes;
        try {
            // Prøv å hente filter- og sorteringspreferanser hvis de ikke er sendt med
            if (!filter && !sortOrder && !searchTerm) {
                const preferences = loadAndApplyUserPreferences();
                filter = preferences.filter;
                sortOrder = preferences.sortOrder;
                searchTerm = preferences.searchTerm;
            }
            
            dishes = await getDishes(filter); // Initial fetch with filters

            // Apply search term if provided
            if (searchTerm) {
                dishes = dishes.filter(dish => 
                    (dish.title && dish.title.toLowerCase().includes(searchTerm)) || 
                    (dish.subtitle && dish.subtitle.toLowerCase().includes(searchTerm))
                );
            }

            // Klientside-filter for "subtype"
            if (filter && ( (filter.subtype && filter.subtype.length > 0) || filter.includeNoSubtype) ) {
                dishes = dishes.filter(dish => {
                    const dishSubtypeLower = dish.subtype ? dish.subtype.toLowerCase() : null;
                    let matchesSelectedSubtype = false;
                    if (filter.subtype && filter.subtype.length > 0) {
                        matchesSelectedSubtype = dishSubtypeLower && filter.subtype.includes(dishSubtypeLower);
                    }
                    let matchesNoSubtypeCondition = false;
                    if (filter.includeNoSubtype) {
                        matchesNoSubtypeCondition = !dishSubtypeLower || dishSubtypeLower === '';
                    }
                    return matchesSelectedSubtype || matchesNoSubtypeCondition;
                });
            }
        } catch (error) {
            console.error("Feil under henting eller filtrering av retter:", error);
            dishes = []; // Sett til tomt array for å unngå videre feil
        }

        const dishesContainer = document.querySelector('.dishes');
        dishesContainer.innerHTML = ""; // Tøm containeren

        // Sort dishes if sortOrder is provided
        if (sortOrder && dishes && dishes.length > 0) { // Sjekk at dishes er definert
            dishes.sort((a, b) => {
                switch (sortOrder) {
                    case 'newest':
                        if (!a.createdAt || !b.createdAt) return 0;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    case 'oldest':
                        if (!a.createdAt || !b.createdAt) return 0;
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    case 'alpha-asc':
                        return (a.title || "").localeCompare(b.title || "", 'nb', { sensitivity: 'base' });
                    case 'alpha-desc':
                        return (b.title || "").localeCompare(a.title || "", 'nb', { sensitivity: 'base' });
                    default:
                        return 0;
                }
            });
        }
        
        if (dishes && dishes.length > 0) { // Sjekk at dishes er definert
            dishes.forEach(dish => {
                const dishEl = document.createElement('div');
                dishEl.classList.add('dish');
                dishEl.dataset.dishId = dish.id;
                if (dish.meat) {
                    dishEl.dataset.dishMeat = dish.meat.toLowerCase();
                }
                if (dish.subtype) {
                    dishEl.dataset.dishSubtype = dish.subtype.toLowerCase();
                }

                // Icon mappings
                const meatIconMap = {
                    'kjøtt': './images/meat.svg',
                    'fisk': './images/fish.svg',
                    'kylling': './images/chicken.svg',
                    'vegetar': './images/vegetable.svg'
                };
                const subtypeIconMap = {
                    'pasta': './images/pasta.svg',
                    'nudler': './images/noodles.svg',
                    'ris': './images/rice.svg',
                    'gryte': './images/stew.svg',
                    'bowl': './images/bowl.svg',
                    'suppe': './images/soup.svg',
                    'ingen kategori': '' 
                };

                let bottomLeftIconsHTML = '';
                if (dish.meat && meatIconMap[dish.meat.toLowerCase()]) {
                    bottomLeftIconsHTML += `<img src="${meatIconMap[dish.meat.toLowerCase()]}" alt="${dish.meat}" class="icon-meat">`;
                }
                // Kun vis subtype-ikon hvis det er en subtype og den har et ikon definert
                if (dish.subtype && subtypeIconMap[dish.subtype.toLowerCase()] && subtypeIconMap[dish.subtype.toLowerCase()] !== '') {
                    bottomLeftIconsHTML += `<img src="${subtypeIconMap[dish.subtype.toLowerCase()]}" alt="${dish.subtype}" class="icon-subtype">`;
                }

                const currentImageUrl = dish.imageUrl || dish.image;
                let imageTagHTML = '';
                let bodyClasses = 'dish-body';
                if (currentImageUrl) {
                    imageTagHTML = `<img src="${currentImageUrl}" class="dish-image" alt="${dish.title || 'Bilde av matrett'}">`;
                } else {
                    bodyClasses += ' no-image-present';
                }

                let difficultyHTML = '';
                if (dish.difficulty && dish.difficulty > 0) {
                    difficultyHTML = `<div class="dish-difficulty-display">${generateDifficultyIcons(dish.difficulty)}</div>`;
                }

                const starIconSrc = dish.favourite ? './images/star-filled-yellow.svg' : './images/star-outline.svg';
                
                let editButtonHTML = '';
                // Vis "Rediger" kun hvis brukeren er logget inn og er eieren av retten
                if (localStorage.user && dish.user === localStorage.user) {
                    editButtonHTML = '<p class="dish-edit">Rediger</p>';
                }

                dishEl.innerHTML = `
                    <div class="dish-header">
                        <div class="dish-header-top">
                            <p class="dish-user">${dish.user || "Ukjent bruker"}</p>
                            ${editButtonHTML}
                        </div>
                        <div class="dish-title">
                            ${dish.title || "Uten tittel"}
                        </div>
                        <div class="dish-subtitle">
                            ${dish.subtitle || ""}
                        </div>
                    </div>
                    <div class="${bodyClasses}">
                        ${imageTagHTML}
                        <div class="dish-top-left-indicators">
                            <div class="dish-type">${dish.type || "Ukjent type"}</div>
                            ${difficultyHTML}
                        </div>
                        
                        <div class="dish-bottom-left-icons">
                            ${bottomLeftIconsHTML}
                        </div>

                        <div class="dish-star-div">
                            <img src="${starIconSrc}" class="dish-star" alt="Favorittstjerne">
                        </div>
                        <div class="dish-recipie-div">
                            <a href="${dish.recipieLink || '#'}" target="_blank" class="dish-recipie ${dish.recipieLink ? '' : 'hide'}" aria-label="Link til oppskrift">
                                <img src="./images/recipie.svg" alt="Oppskriftsikon">
                            </a>
                        </div>
                    </div>
                `;
                
                // Legg til event listener for stjerne-ikonet
                const starDivEl = dishEl.querySelector('.dish-star-div');
                const starImgEl = dishEl.querySelector('.dish-star');

                if (starDivEl && starImgEl) {
                    starDivEl.addEventListener('click', async (event) => {
                        event.stopPropagation(); 

                        const newFavouriteStatus = !(dish.favourite === true); // Sikrer boolean

                        starImgEl.src = newFavouriteStatus ? './images/star-filled-yellow.svg' : './images/star-outline.svg';

                        try {
                            await updateDish(dish.id, { favourite: newFavouriteStatus });
                            dish.favourite = newFavouriteStatus; // Oppdater lokalt objekt
                            console.log(`Matrett ${dish.id} favorittstatus oppdatert til ${newFavouriteStatus}`);
                        } catch (error) {
                            console.error("Feil ved oppdatering av favorittstatus for matrett:", dish.id, error);
                            starImgEl.src = dish.favourite ? './images/star-filled-yellow.svg' : './images/star-outline.svg'; // Tilbakestill
                            alert("Kunne ikke oppdatere favorittstatus. Prøv igjen.");
                        }
                    });
                }
                
                // FIKS: Kun legg til event listener hvis .dish-edit elementet finnes
                const editButtonElement = dishEl.querySelector('.dish-edit');
                if (editButtonElement) {
                    editButtonElement.addEventListener('click', (e) => handleEditClick(e, dish));
                }

                dishesContainer.appendChild(dishEl);

                // Setup subtitle expansion
                const subtitleEl = dishEl.querySelector('.dish-subtitle');
                // Sjekk om subtitleEl finnes før du prøver å lese egenskaper
                if (subtitleEl) {
                    requestAnimationFrame(() => {
                        // Ekstra sjekk for scrollHeight og clientHeight, da de kan være 0 hvis elementet er skjult
                        if (subtitleEl.scrollHeight > subtitleEl.clientHeight && subtitleEl.clientHeight > 0) {
                            subtitleEl.classList.add('is-clamped');
                            subtitleEl.style.cursor = 'pointer';
                            subtitleEl.onclick = () => {
                                subtitleEl.classList.toggle('expanded');
                                subtitleEl.style.cursor = subtitleEl.classList.contains('expanded') ? 'default' : 'pointer';
                            };
                        } else {
                            subtitleEl.classList.remove('is-clamped', 'expanded'); // Fjern begge klasser
                            subtitleEl.style.cursor = 'default';
                            subtitleEl.onclick = null;
                        }
                    });
                }
            });
        } else {
            dishesContainer.innerHTML = '<p class="no-dishes">Ingen retter funnet som passer søket ditt.</p>';
        }
        showLoading(false); // Skjul lasteindikatoren
    } else {
        // Håndter tilfellet der localStorage.user er "null" (bruker ikke logget inn)
        document.querySelector('.dishes').innerHTML = '<p class="no-dishes">Vennligst logg inn for å se retter.</p>';
        showLoading(false);
    }
}

/* Edit dish */
let editingDishId = "null"

async function changeTemplateValues(title="", subtitle="", meat="kjøtt", recipieLink="", type="Middag", favourite=false, imageUrlFromArgs="", imagePathFromArgs="", user="", subtype="", difficulty=0, createdAt="") {
    // console.log("changeTemplateValues: Called with imageUrlFromArgs:", imageUrlFromArgs, "and imagePathFromArgs:", imagePathFromArgs);
    dishTitleInput.value = title;
    dishSubtitleInput.value = subtitle;
    dishMeatInput.value = meat;
    dishRecipieLinkInput.value = recipieLink;
    dishTypeInput.value = type;
    dishTemplateUserEl.textContent = user;
    dishSubtypeInput.value = subtype;
    currentDifficulty = difficulty;
    updateDifficultyDisplay();

    // Set star icon and class in modal
    if (favourite) {
        favouriteInput.classList.add('favourite');
        favouriteInput.src = './images/star-filled-yellow.svg';
    } else {
        favouriteInput.classList.remove('favourite');
        favouriteInput.src = './images/star-outline.svg';
    }
    
    if (createdAt) {
        const dateObj = new Date(createdAt);
        // nb-NO typically uses DD.MM.YYYY
        const dateString = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${dateObj.getFullYear()}`;
        const timeString = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

        dishTemplateCreatedAtEl.innerHTML = `<span class="timestamp-date">${dateString}</span> <span class="timestamp-time">${timeString}</span>`;
    } else {
        dishTemplateCreatedAtEl.innerHTML = ''; // Clear content if no date
    }
    
    // Oppdater bildevisning ved redigering
    if (imageUrlFromArgs) { // imageUrlFromArgs is dish.imageUrl or dish.image
        // console.log("changeTemplateValues: Setting image preview. URL:", imageUrlFromArgs);
        imagePreviewImg.src = imageUrlFromArgs;
        imagePreviewImg.style.display = 'block';
        // console.log("changeTemplateValues: Set imagePreviewImg.src to:", imagePreviewImg.src, "and display to 'block'.");
        dishImageURL = imageUrlFromArgs; // Set global for potential re-save if unchanged
        currentDishImagePath = imagePathFromArgs || ""; // Set global path for potential deletion
    } else {
        // console.log("changeTemplateValues: No imageUrlFromArgs. Hiding image preview.");
        imagePreviewImg.src = ""; // No fallback, just empty src for preview
        imagePreviewImg.style.display = 'none';
        // console.log("changeTemplateValues: Set imagePreviewImg.src to empty and display to 'none'.");
        dishImageURL = "";
        currentDishImagePath = "";
    }
}

/* Delete dish */
document.querySelector('.delete-dish-button').addEventListener('click', async () => {
    console.log("Starter sletting av matrett...");
    if (editingDishId !== "null") {
        // Determine the correct path to delete. Prioritize dishImagePath if available (new upload during edit)
        // otherwise use currentDishImagePath (existing image path when edit started).
        const imagePathToDelete = dishImagePath || currentDishImagePath;
        
        if (imagePathToDelete && imagePathToDelete !== "Bildesti") { // Ensure we have a valid path
            console.log("Prøver å slette tilknyttet bilde med sti:", imagePathToDelete);
            try {
                await deleteObject(ref(storage, imagePathToDelete));
                console.log("Bilde slettet fra Storage.");
            } catch (err) {
                 // Check if the error is 'object-not-found'
                 if (err.code === 'storage/object-not-found') {
                    console.warn("Bildet fantes ikke i Storage (muligens allerede slettet?):", imagePathToDelete);
                 } else {
                    // Log other potential errors
                    console.error("Feil ved sletting av bilde fra Storage:", err);
                 }
            }
        } else {
            console.log("Ingen gyldig bildesti funnet for sletting.");
        }

        // Proceed to delete the dish data from Firestore regardless of image deletion result
        try {
            await deleteDish(editingDishId);
            console.log("Matrett slettet fra Firestore.");
            dishTemplateEl.classList.add('hide'); // Hide the edit window after successful deletion
            await showDishes(); // Refresh the dish list
        } catch (firestoreError) {
            console.error("Feil ved sletting av matrett fra Firestore:", firestoreError);
            // Optionally, inform the user that the dish couldn't be deleted
            alert("Kunne ikke slette matretten. Prøv igjen.");
        }

    } else {
        // If not in editing mode (e.g., template was opened for adding, then delete clicked), just hide the template
        dishTemplateEl.classList.add('hide');
        console.log("Ingen matrett i redigeringsmodus, skjuler malen.");
    }
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

// Funksjon for å laste og anvende brukerpreferanser fra localStorage
function loadAndApplyUserPreferences() {
    let activeFilter = {};
    let activeSortOrder = 'newest'; // Standard sortering
    let activeSearchTerm = '';    // Standard søketerm

    const savedFilterJSON = localStorage.getItem('maritaUserFilter');
    if (savedFilterJSON) {
        try {
            activeFilter = JSON.parse(savedFilterJSON) || {};
        } catch (e) {
            console.error("Feil ved parsing av lagret filter:", e);
            localStorage.removeItem('maritaUserFilter'); // Fjern ugyldig data
            activeFilter = {}; // Gå tilbake til tomt filterobjekt
        }
    }

    activeSortOrder = localStorage.getItem('maritaUserSortOrder') || 'newest';
    activeSearchTerm = localStorage.getItem('maritaUserSearchTerm') || '';

    // Hjelpefunksjon for å oppdatere UI-checkboxes basert på lagret filter
    const updateUICheckboxes = (selector, filterCategoryKey, valueExtractor = el => el.textContent.trim()) => {
        const nodes = document.querySelectorAll(selector);
        if (nodes.length === 0) return;

        const specificSelection = activeFilter[filterCategoryKey];

        // Hvis en spesifikk seleksjon er lagret (og det ikke er "alle")
        if (specificSelection && Array.isArray(specificSelection) && specificSelection.length > 0 && specificSelection.length < nodes.length) {
            nodes.forEach(node => node.classList.remove('checked')); // Fjern hake fra alle
            nodes.forEach(node => {
                if (specificSelection.includes(valueExtractor(node))) {
                    node.classList.add('checked'); // Legg til hake på de lagrede
                }
            });
        } else if (!activeFilter.hasOwnProperty(filterCategoryKey) || (specificSelection && specificSelection.length === 0) || (specificSelection && specificSelection.length === nodes.length)) {
            // Hvis kategorien ikke finnes i filteret, eller er et tomt array, eller velger alle => alle skal være huket av
            // (Stoler på at loadFilterUsers har huket av alle personer, og HTML har huket av de andre)
            nodes.forEach(node => node.classList.add('checked'));
        }
    };

    // Anvend på UI
    // Personer (loadFilterUsers setter alle til checked først)
    updateUICheckboxes('.filter-people .option', 'persons', el => el.textContent.trim().toLowerCase());
    updateUICheckboxes('.filter-type .option', 'type');
    updateUICheckboxes('.filter-meat .option', 'meat', el => el.textContent.trim().toLowerCase());
    // updateUICheckboxes('.filter-subtype .option', 'subtype', el => el.textContent.trim().toLowerCase()); // Gammel linje for subtype

    // Manuell håndtering for subtype-filteret inkludert "Ikke valgt"
    const subtypeNodes = document.querySelectorAll('.filter-subtype .option');
    if (subtypeNodes.length > 0) {
        const savedSubtypes = activeFilter.subtype || []; // Faktiske subtyper
        const includeNoSubtype = activeFilter.includeNoSubtype || false;
        let allSubtypesCheckedByDefault = true; // Anta at alle skal sjekkes hvis ingen spesifikk info finnes

        // Sjekk om det finnes en lagret tilstand for subtyper eller "includeNoSubtype"
        if (activeFilter.hasOwnProperty('subtype') || activeFilter.hasOwnProperty('includeNoSubtype')) {
            allSubtypesCheckedByDefault = false;
        }

        subtypeNodes.forEach(node => {
            const nodeValue = node.textContent.trim().toLowerCase();
            if (allSubtypesCheckedByDefault) {
                node.classList.add('checked');
            } else {
                node.classList.remove('checked'); // Fjern først, legg så til om nødvendig
                if (nodeValue === 'ingen kategori' && includeNoSubtype) {
                    node.classList.add('checked');
                } else if (nodeValue !== 'ingen kategori' && savedSubtypes.includes(nodeValue)) {
                    node.classList.add('checked');
                }
            }
        });
    }

    const favOption = document.querySelector('.filter-favorite .option');
    if (favOption) {
        if (activeFilter.favourite) { // Sjekk om favourite-egenskapen eksisterer og er true
            favOption.classList.add('checked');
        } else {
            favOption.classList.remove('checked'); // Fjern haken eksplisitt hvis ikke true eller ikke til stede
        }
    }

    document.getElementById('sort-select').value = activeSortOrder;
    document.getElementById('search-input').value = activeSearchTerm;

    return { filter: activeFilter, sortOrder: activeSortOrder, searchTerm: activeSearchTerm };
}

// Kall funksjonen når DOM-en er helt lastet inn
window.addEventListener('DOMContentLoaded', async () => {
    // Initialiser localStorage.user hvis det ikke finnes
    if (!localStorage.user) {
        localStorage.user = "null";
    }
    
    // Initialiser filterbrukere (vent på at disse er lastet før loginState kalles)
    await loadFilterUsers(); 
    
    // Sjekk innloggingsstatus (som nå vil kalle loadAndApplyUserPreferences og showDishes)
    loginState();
});

// --- SØKEFUNKSJONALITET ---
// Funksjonen som utfører søkingen (This function can be removed as its logic is merged into #filter-button listener and showDishes)
/*
async function performSearch() {
    // ... (old search logic) ...
}
document.querySelector('#search-button').addEventListener('click', performSearch);
document.querySelector('#search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});
*/

// Update event listener for search input to trigger the combined search/filter button
document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('filter-button').click(); // Trigger the main button
    }
});

// Funksjon som kalles når brukeren klikker på "Rediger"
async function handleEditClick(e, dish) {
    // Sikkerhetssjekk: Kun eier kan redigere
    if (!localStorage.user || dish.user !== localStorage.user) {
        console.warn(`Uautorisert redigeringsforsøk av bruker '${localStorage.user}' på rett '${dish.id}' eid av '${dish.user}'.`);
        alert("Du kan kun redigere dine egne retter.");
        return; // Avbryt redigering
    }

    editingDishId = dish.id;
    const imageUrlForEdit = dish.imageUrl || dish.image;
    const imagePathForEdit = dish.imagePath; // Assumes dish.imagePath contains the storage path
    await changeTemplateValues(
        dish.title, dish.subtitle, dish.meat, dish.recipieLink, 
        dish.type, dish.favourite, imageUrlForEdit, imagePathForEdit, 
        dish.user, dish.subtype || "", dish.difficulty || 0, dish.createdAt || ""
    );
    dishTemplateEl.classList.remove('hide');
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
