/* Этап 0: только каркас экрана, без логики */
// 1. Массив с тестовыми клиентами
const clients = [
    { name: 'Иван Петров', phone: '+7 900 123-45-67', status: 'Активен' },
    { name: 'Мария Смирнова', phone: '+7 900 234-56-78', status: 'Новый' },
    { name: 'Алексей Кузнецов', phone: '+7 900 345-67-89', status: 'В ожидании' }
];

// 2. Функция, которая рисует всех клиентов на странице
function renderClients() {
    const list = document.querySelector('#client-list');
    list.innerHTML = ''; // очищаем перед перерисовкой

    clients.forEach(function(client) {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <span class="client-name">${client.name}</span>
            <span class="client-phone">${client.phone}</span>
            <span class="client-status">${client.status}</span>
        `;
        list.appendChild(card);
    });
}

renderClients(); // рисуем сразу при загрузке страницы

// 3. Работа с формой
const form = document.querySelector('#add-client-form');
const addBtn = document.querySelector('#add-client-btn');
const saveBtn = document.querySelector('#save-client-btn');
const cancelBtn = document.querySelector('#cancel-client-btn');
const nameInput = document.querySelector('#client-name');
const phoneInput = document.querySelector('#client-phone');

addBtn.addEventListener('click', function() {
    form.classList.remove('hidden');
});

cancelBtn.addEventListener('click', function() {
    form.classList.add('hidden');
    nameInput.value = '';
    phoneInput.value = '';
});

saveBtn.addEventListener('click', function() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (name === '' || phone === '') {
        alert('Заполни имя и телефон');
        return;
    }

    clients.push({ name: name, phone: phone, status: 'Новый' });
    renderClients();

    form.classList.add('hidden');
    nameInput.value = '';
    phoneInput.value = '';
});