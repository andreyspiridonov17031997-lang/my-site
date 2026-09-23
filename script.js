const button = document.querySelector('.my-button');
const heading = document.querySelector('h1');

let clicked = false;

button.addEventListener('click', function() {
    if (clicked === false) {
        heading.textContent = 'Ты нажал на кнопку!';
        clicked = true;
    } else {
        heading.textContent = 'Привет, мир!';
        clicked = false;
    }
});