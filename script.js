import { isUser, makeUser } from './auth.js';
import { getDishes, addDish, updateDish, deleteDish } from './foodManager.js'
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase.js';

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
loginState()

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

document.querySelector('.save-dish-button').addEventListener('click', async () => {
    const favourite = favouriteInput.classList.contains('favourite');
    const dishData = {
        title: dishTitleInput.value,
        subtitle: dishSubtitleInput.value,
        meat: dishMeatInput.value,
        recipieLink: dishRecipieLinkInput.value,
        type: dishTypeInput.value,
        /*         image: dishImageButtonInput.files[0], */
        image: "Bildesti",
        user: localStorage.user,
        favourite: favourite
    };
    if (editingDishId !== "null") {
        await updateDish(editingDishId, dishData)
    } else {
        await addDish(dishData)
    }
    await showDishes()
    dishTemplateEl.classList.add('hide')
})



/* Show dishes */
async function showDishes(filter) {
    if (localStorage.user != "null") {
        const dishList = await getDishes(filter)
        console.log(dishList)
        document.querySelector('.dishes').innerHTML = ""
        dishList.forEach(dish => {
            const dishDiv = document.createElement('div');
            dishDiv.className = 'dish';
            dishDiv.setAttribute('data-dish-id', dish.id);
            dishDiv.setAttribute('data-dish-meat', dish.meat);
            dishDiv.innerHTML += `
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
                <div class="dish-body">
                    <div class="dish-type">${dish.type}</div>
                    <div class="dish-star-div">
                        <img src="images/star.svg" class="dish-star">
                    </div>
                    <div class="dish-recipie-div">
                        <a href="https://${dish.recipieLink}" class="dish-recipie">
                            <img src="images/recipie.svg">
                        </a>
                    </div>
                </div>
            </div>
            `
            if (!dish.recipieLink) {
                dishDiv.querySelector('.dish-recipie-div').style.display = "none"
            }

            let divColor
            switch (dish.meat) {
                case "kjøtt":
                    divColor = '#AF1740';
                    break;
                case "fisk":
                    divColor = '#78B3CE';
                    break;
                case "kylling":
                    divColor = '#FFB0B0';
                    break;
                case "vegetar":
                    divColor = '#C2FFC7'
                    break
            }
            if (dish.favourite) {
                dishDiv.querySelector('.dish-star-div').classList.add('favourite')
            }
            dishDiv.querySelector('.dish-user').style.borderBottom = `2px solid ${divColor}`
            dishDiv.querySelector('.dish-edit').style.borderBottom = `2px solid ${divColor}`
            dishDiv.querySelector('.dish-title').style.borderBottom = `2px solid ${divColor}`
            dishDiv.querySelector('.dish-subtitle').style.borderBottom = `2px solid ${divColor}`
            document.querySelector('.dishes').appendChild(dishDiv)
        })
        document.querySelectorAll('.dish-edit').forEach(editButton => {
            editButton.addEventListener('click', (e) => {
                const dishDiv = e.target.closest('.dish');
                editingDishId = dishDiv.getAttribute('data-dish-id');
                console.log(`Redigerer rett med ID: ${editingDishId}`);

                const title = dishDiv.querySelector('.dish-title').innerText;
                const subtitle = dishDiv.querySelector('.dish-subtitle').innerText;
                const meat = dishDiv.getAttribute('data-dish-meat');
                const recipieLink = dishDiv.querySelector('.dish-recipie').getAttribute('href')
                const type = dishDiv.querySelector('.dish-type').innerText
                const favourite = dishDiv.querySelector('.dish-star-div').classList.contains('favourite')

                changeTemplateValues(title, subtitle, meat, recipieLink, type, favourite);

                dishTemplateEl.classList.remove('hide');
            })
        })
    }
}

/* Edit dish */
let editingDishId = "null"

async function changeTemplateValues(title="", subtitle="", meat="kjøtt", recipieLink="", type="Middag", favourite=false) {
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

}

/* Delete dish */
document.querySelector('.delete-dish-button').addEventListener('click', async () => {
    if (editingDishId !== "null") {
        await deleteDish(editingDishId)
    } else {
        dishTemplateEl.classList.add('hide')
    }
    await showDishes()
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
    loadFilterUsers(); 
    // Andre init-funksjoner (f.eks. loginState) kjøres etter behov.
});

// Funksjon for å konvertere og komprimere bildet
async function processImage(file) {
    // Sjekk om filen er en HEIC-fil
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            const conversionResult = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
            // heic2any returnerer enten et array med én blob eller en enkelt blob
            file = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        } catch (error) {
            console.error("Feil under konvertering av HEIC:", error);
            return;
        }
    }
    
    // Opprett et Image-objekt for komprimering via canvas
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement("canvas");
        // Angi maks bredde til 800px (du kan justere om ønskelig)
        const maxWidth = 800;
        const ratio = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
        // Konverter canvas til en Blob med JPEG-format og ønsket kvalitet (0.7)
        canvas.toBlob(function(blob) {
            // Lag en lokal URL for forhåndsvisning
            const url = URL.createObjectURL(blob);
            imagePreviewImg.src = url;
            // Her kan du lagre 'blob' i en variabel for å laste opp bildet til serveren eller Firebase
            // f.eks.: dishImageBlob = blob;
        }, 'image/jpeg', 0.7);
    };
    
    // Les filen som DataURL slik at den kan settes inn i img.src
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Lytt på endringer for inputen som åpner kamera (Ta bilde)
takePicInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0]);
    }
});

// Lytt på endringer for inputen som velger bilde fra galleri
selectPicInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0]);
    }
});

// Kobler knappene til de skjulte file-inputene
const takePicButton = document.querySelector('.take-pic-button');
const selectPicButton = document.querySelector('.select-pic-button');

takePicButton.addEventListener('click', () => {
    takePicInput.click();
});

selectPicButton.addEventListener('click', () => {
    selectPicInput.click();
});
