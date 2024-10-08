const dishTemplateEl = document.querySelector('.dish-template')
const dishTitleInput = dishTemplateEl.querySelector('.dish-template-title');
const dishSubtitleInput = dishTemplateEl.querySelector('.dish-template-subtitle');
const dishMeaetInput = dishTemplateEl.querySelector('.dish-template-meat');
const dishRecipieLinkInput = dishTemplateEl.querySelector('.dish-template-recipie-link');
const dishTypeInput = dishTemplateEl.querySelector('.dish-template-type');
const dishImageButtonInput = dishTemplateEl.querySelector('.dish-template-image-button');
const imagePreviewImg = dishTemplateEl.querySelector('.dish-template-image-preview');

/* Filter */
document.querySelector('.filter-title-div').addEventListener('click', () => {
    document.querySelector('.filter-arrow').classList.toggle('rotated')
    document.querySelector('.filter-options-div').classList.toggle('hide')

})

document.querySelector('.add-dish-button').addEventListener('click', () => {
    dishTemplateEl.classList.remove('hide')
})
document.querySelector('.dish-template-x').addEventListener('click', () => {
    dishTemplateEl.classList.add('hide')
})

document.querySelector('.save-dish-button').addEventListener('click', () => {
    const dishData = {
        title: dishTitleInput.value,
        subtitle: dishSubtitleInput.value,
        meat: dishMeaetInput.value,
        recipieLink: dishRecipieLinkInput.value,
        type: dishTypeInput.value,
        image: dishImageButtonInput.files[0],
        user: "Felix"
    };
    console.log(dishData)
})