// Ключ — имя, под которым список будет храниться в браузере.
const STORAGE_KEY = 'crm-clients';
const EMPLOYEES_STORAGE_KEY = 'crm-employees';
const defaultEmployees = ['Алексей', 'Мария', 'Иван'];

// Начальные примеры показываем только при первом запуске CRM.
const defaultClients = [
    { name: 'Иван Петров', phone: '+7 900 123-45-67', status: 'Активен' },
    { name: 'Мария Смирнова', phone: '+7 900 234-56-78', status: 'Новый' },
    { name: 'Алексей Кузнецов', phone: '+7 900 345-67-89', status: 'В ожидании' }
];

// Загружаем сохранённый список. Если его ещё нет или он повреждён,
// используем начальные примеры, не останавливая работу приложения.
function loadClients() {
    try {
        const savedClients = localStorage.getItem(STORAGE_KEY);
        return savedClients ? JSON.parse(savedClients) : defaultClients;
    } catch (error) {
        console.error('Не удалось загрузить клиентов:', error);
        return defaultClients;
    }
}

const clients = loadClients();
let employees = loadEmployees();

function loadEmployees() {
    try {
        const savedEmployees = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
        return savedEmployees ? JSON.parse(savedEmployees) : defaultEmployees.slice();
    } catch (error) {
        return defaultEmployees.slice();
    }
}

function saveEmployees() {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
}

// У старых клиентов ещё может не быть массива задач.
// Добавляем его, чтобы приложение работало с уже сохранёнными данными.
clients.forEach(function(client) {
    if (!Array.isArray(client.tasks)) {
        client.tasks = [];
    }
    if (typeof client.company !== 'string') {
        client.company = '';
    }
    if (typeof client.email !== 'string') {
        client.email = '';
    }
    if (typeof client.assignee !== 'string') {
        client.assignee = 'Не назначен';
    }
    if (!Array.isArray(client.tags)) {
        client.tags = [];
    }
    if (!Array.isArray(client.documents)) {
        client.documents = [];
    }
    if (!Array.isArray(client.history)) {
        client.history = [];
    }
    client.tasks.forEach(function(task) {
        if (!Array.isArray(task.interactions)) {
            task.interactions = [];
        }
        if (typeof task.dueDate !== 'string') {
            task.dueDate = '';
        }
        if (!['low', 'normal', 'high'].includes(task.priority)) {
            task.priority = 'normal';
        }
        if (typeof task.assignee !== 'string') {
            task.assignee = 'Не назначен';
        }
        if (!['new', 'in-progress', 'paused', 'completed'].includes(task.status)) {
            task.status = task.completed ? 'completed' : 'new';
        }
        task.completed = task.status === 'completed';
    });
});

// Сохраняем текущий список в браузере.
function saveClients() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

// 2. Функция, которая рисует всех клиентов на странице
function renderClients() {
    const list = document.querySelector('#clients');
    renderDashboardStats();
    renderAllTasks();
    const searchText = clientSearch.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const filteredClients = clients.filter(function(client) {
        const clientText = [client.name, client.company, client.phone, client.email, client.tags.join(' ')]
            .join(' ')
            .toLowerCase();
        const matchesSearch = clientText.includes(searchText);
        const matchesStatus = selectedStatus === 'all' || client.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    list.innerHTML = ''; // очищаем перед перерисовкой
    clientsCount.textContent = 'Найдено клиентов: ' + filteredClients.length;

    filteredClients.forEach(function(client) {
        const clientIndex = clients.indexOf(client);
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <div class="client-main-info">
                <strong class="client-name">${client.name}</strong>
                <span class="client-company">${client.company || 'Компания не указана'}</span>
            </div>
            <div class="client-contact-info">
                <span class="client-phone">${client.phone}</span>
                <span class="client-responsible">Ответственный: ${client.assignee}</span>
            </div>
            <div class="client-card-tags">
                ${client.tags.length > 0
                    ? client.tags.map(function(tag) {
                        return '<span class="client-tag">' + tag + '</span>';
                    }).join('')
                    : '<span class="client-no-tags">Без меток</span>'}
            </div>
            <span class="client-status">${client.status}</span>
        `;
        card.addEventListener('click', function() {
            openClientDetails(clientIndex);
        });
        list.appendChild(card);
    });

    if (filteredClients.length === 0) {
        const emptyResult = document.createElement('p');
        emptyResult.className = 'empty-message';
        emptyResult.textContent = 'Клиенты не найдены';
        list.appendChild(emptyResult);
    }
}

function renderAllTasks() {
    const taskList = document.querySelector('#all-tasks-list');
    const emptyMessage = document.querySelector('#empty-all-tasks');
    const selectedFilter = allTasksFilter.value;
    const selectedAssignee = allTasksAssigneeFilter.value;
    const selectedPriority = allTasksPriorityFilter.value;
    const allTasks = [];

    clients.forEach(function(client, clientIndex) {
        client.tasks.forEach(function(task, taskIndex) {
            const isOverdue = !task.completed && task.dueDate && task.dueDate < getTodayDate();
            const isDueToday = !task.completed && task.dueDate === getTodayDate();
            const isDueTomorrow = !task.completed && task.dueDate === getTomorrowDate();
            const matchesFilter = selectedFilter === 'all'
                || (selectedFilter === 'open' && task.status !== 'completed')
                || (selectedFilter === 'completed' && task.status === 'completed')
                || (selectedFilter === 'overdue' && isOverdue);
            const matchesAssignee = selectedAssignee === 'all'
                || task.assignee === selectedAssignee;
            const matchesPriority = selectedPriority === 'all'
                || task.priority === selectedPriority;

            if (matchesFilter && matchesAssignee && matchesPriority) {
                allTasks.push({ client, clientIndex, task, taskIndex, isOverdue, isDueToday, isDueTomorrow });
            }
        });
    });

    taskList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', allTasks.length > 0);

    if (allTasksSort.value === 'due-date') {
        allTasks.sort(function(a, b) {
            return (a.task.dueDate || '9999-12-31').localeCompare(b.task.dueDate || '9999-12-31');
        });
    } else if (allTasksSort.value === 'priority') {
        const order = { high: 1, normal: 2, low: 3 };
        allTasks.sort(function(a, b) {
            return order[a.task.priority] - order[b.task.priority];
        });
    } else if (allTasksSort.value === 'name') {
        allTasks.sort(function(a, b) {
            return a.task.text.localeCompare(b.task.text, 'ru');
        });
    }

    allTasks.forEach(function(item) {
        const taskCard = document.createElement('button');
        taskCard.type = 'button';
        taskCard.className = 'all-task-card';
        if (item.isDueToday) taskCard.classList.add('due-today');
        if (item.isDueTomorrow) taskCard.classList.add('due-tomorrow');

        const title = document.createElement('strong');
        title.textContent = item.task.text;

        const clientName = document.createElement('span');
        clientName.textContent = item.client.company || item.client.name;

        const details = document.createElement('span');
        const dueLabel = item.isDueToday ? 'Сегодня · срок: '
            : (item.isDueTomorrow ? 'Завтра · срок: ' : 'Срок: ');
        details.textContent = (item.task.dueDate
            ? dueLabel + formatTaskDate(item.task.dueDate) : 'Без срока')
            + ' · ' + getPriorityLabel(item.task.priority)
            + ' · ' + item.task.assignee;

        const status = document.createElement('span');
        status.className = 'all-task-status';
        if (item.task.completed) {
            status.classList.add('completed');
        } else if (item.isOverdue) {
            status.classList.add('overdue');
        } else if (item.task.status === 'new') {
            status.classList.add('new');
        }
        status.textContent = item.task.status === 'completed'
            ? 'Завершена' : (item.isOverdue ? 'Просрочена' : getTaskStatusLabel(item.task.status));

        taskCard.append(title, clientName, details, status);
        taskCard.addEventListener('click', function() {
            openClientDetails(item.clientIndex);
            openTaskDetails(item.taskIndex);
        });
        taskList.appendChild(taskCard);
    });
}

function renderDashboardStats() {
    let openTasks = 0;
    let overdueTasks = 0;

    clients.forEach(function(client) {
        client.tasks.forEach(function(task) {
            if (!task.completed) {
                openTasks += 1;

                if (task.dueDate && task.dueDate < getTodayDate()) {
                    overdueTasks += 1;
                }
            }
        });
    });

    document.querySelector('#total-clients-count').textContent = clients.length;
    document.querySelector('#active-clients-count').textContent = clients.filter(function(client) {
        return client.status === 'Активен';
    }).length;
    document.querySelector('#open-tasks-count').textContent = openTasks;
    document.querySelector('#overdue-tasks-count').textContent = overdueTasks;
    renderRecentActivity();
}

function renderRecentActivity() {
    const activityList = document.querySelector('#recent-activity-list');
    const emptyMessage = document.querySelector('#empty-recent-activity');
    const activities = [];

    clients.forEach(function(client, clientIndex) {
        client.tasks.forEach(function(task, taskIndex) {
            task.interactions.forEach(function(interaction, interactionIndex) {
                activities.push({
                    client: client,
                    clientIndex: clientIndex,
                    task: task,
                    taskIndex: taskIndex,
                    interaction: interaction,
                    interactionIndex: interactionIndex
                });
            });
        });
    });

    activities.sort(function(a, b) {
        const aTime = a.interaction.timestamp || a.interaction.date;
        const bTime = b.interaction.timestamp || b.interaction.date;
        return bTime.localeCompare(aTime);
    });

    activityList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', activities.length > 0);

    activities.slice(0, 8).forEach(function(activity) {
        const activityButton = document.createElement('button');
        activityButton.type = 'button';
        activityButton.className = 'recent-activity-item';

        const type = document.createElement('strong');
        type.textContent = activity.interaction.type;

        const description = document.createElement('span');
        description.textContent = activity.interaction.text;

        const context = document.createElement('small');
        context.textContent = (activity.client.company || activity.client.name)
            + ' · ' + activity.task.text
            + ' · ' + formatInteractionDate(activity.interaction);

        activityButton.append(type, description, context);
        activityButton.addEventListener('click', function() {
            openClientDetails(activity.clientIndex);
            openTaskDetails(activity.taskIndex);
        });
        activityList.appendChild(activityButton);
    });
}

function openClientDetails(clientIndex) {
    const client = clients[clientIndex];
    currentClientIndex = clientIndex;
    detailsClientName.textContent = client.name;
    detailsClientCompany.textContent = client.company || 'Не указана';
    detailsClientPhone.textContent = client.phone;
    detailsClientEmail.textContent = client.email || 'Не указан';
    detailsClientStatus.textContent = client.status;
    detailsClientAssignee.textContent = client.assignee;
    renderClientTags(client.tags);
    renderClientHistory();
    renderDocuments();
    clientEditForm.classList.add('hidden');
    editClientBtn.classList.remove('hidden');
    renderTasks();
    detailsModal.classList.remove('hidden');
}

function addClientHistory(client, text) {
    if (!Array.isArray(client.history)) {
        client.history = [];
    }

    client.history.unshift({
        text: text,
        date: new Date().toLocaleString('ru-RU')
    });
}

function renderClientHistory() {
    const historyList = document.querySelector('#client-history-list');
    const emptyMessage = document.querySelector('#empty-client-history');
    const client = clients[currentClientIndex];

    historyList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', client.history.length > 0);

    client.history.forEach(function(historyItem) {
        const item = document.createElement('div');
        item.className = 'client-history-item';

        const text = document.createElement('span');
        text.textContent = historyItem.text;

        const date = document.createElement('small');
        date.textContent = historyItem.date;

        item.append(text, date);
        historyList.appendChild(item);
    });
}

function renderClientTags(tags) {
    const tagsContainer = document.querySelector('#details-client-tags');
    tagsContainer.innerHTML = '';

    if (tags.length === 0) {
        tagsContainer.textContent = 'Нет меток';
        return;
    }

    tags.forEach(function(tag) {
        const tagElement = document.createElement('span');
        tagElement.className = 'client-tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
    });
}

function renderDocuments() {
    const documentList = document.querySelector('#document-list');
    const emptyMessage = document.querySelector('#empty-document-message');
    const client = clients[currentClientIndex];

    if (!Array.isArray(client.documents)) {
        client.documents = [];
    }

    documentList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', client.documents.length > 0);

    client.documents.forEach(function(documentFile, documentIndex) {
        const documentItem = document.createElement('div');
        documentItem.className = 'document-item';

        const downloadLink = document.createElement('a');
        downloadLink.href = documentFile.data;
        downloadLink.download = documentFile.name;
        downloadLink.textContent = documentFile.name;

        const documentDate = document.createElement('span');
        documentDate.textContent = documentFile.date;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function() {
            client.documents.splice(documentIndex, 1);
            addClientHistory(client, 'Удалён документ: ' + documentFile.name);
            saveClients();
            renderDocuments();
            renderAllDocuments();
        });

        documentItem.append(downloadLink, documentDate, deleteButton);
        documentList.appendChild(documentItem);
    });
}

function renderAllDocuments() {
    const documentList = document.querySelector('#all-documents-list');
    const emptyMessage = document.querySelector('#empty-all-documents');
    renderDocumentClientOptions();
    const searchText = documentSearch.value.trim().toLowerCase();
    const selectedClient = documentClientFilter.value;
    const selectedType = documentTypeFilter.value;
    const allDocuments = [];

    clients.forEach(function(client, clientIndex) {
        client.documents.forEach(function(documentFile, documentIndex) {
            const matchesSearch = documentFile.name.toLowerCase().includes(searchText);
            const matchesClient = selectedClient === 'all' || selectedClient === String(clientIndex);
            const matchesType = selectedType === 'all' || getDocumentType(documentFile) === selectedType;
            if (matchesSearch && matchesClient && matchesType) {
                allDocuments.push({ client, clientIndex, documentFile, documentIndex });
            }
        });
    });

    documentList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', allDocuments.length > 0);

    allDocuments.forEach(function(item) {
        const documentItem = document.createElement('div');
        documentItem.className = 'all-document-item';

        const downloadLink = document.createElement('a');
        downloadLink.href = item.documentFile.data;
        downloadLink.download = item.documentFile.name;
        downloadLink.textContent = item.documentFile.name;

        const clientLink = document.createElement('button');
        clientLink.type = 'button';
        clientLink.className = 'document-client-link';
        clientLink.textContent = item.client.company || item.client.name;
        clientLink.addEventListener('click', function() {
            openClientDetails(item.clientIndex);
        });

        const documentDate = document.createElement('span');
        documentDate.textContent = item.documentFile.date;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'document-delete-button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function() {
            item.client.documents.splice(item.documentIndex, 1);
            saveClients();
            renderAllDocuments();
        });

        documentItem.append(downloadLink, clientLink, documentDate, deleteButton);
        documentList.appendChild(documentItem);
    });
}

function getDocumentType(documentFile) {
    const name = documentFile.name.toLowerCase();
    const type = documentFile.type || '';

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
        return 'pdf';
    }
    if (type.startsWith('image/')) {
        return 'image';
    }
    if (type.includes('word') || /\.(doc|docx)$/.test(name)) {
        return 'word';
    }
    if (type.includes('excel') || type.includes('spreadsheet') || /\.(xls|xlsx|csv)$/.test(name)) {
        return 'excel';
    }
    return 'other';
}

function renderDocumentClientOptions() {
    const selectedValue = documentClientFilter.value;
    documentClientFilter.innerHTML = '<option value="all">Все клиенты</option>';

    clients.forEach(function(client, clientIndex) {
        const option = document.createElement('option');
        option.value = clientIndex;
        option.textContent = client.company || client.name;
        documentClientFilter.appendChild(option);
    });

    documentClientFilter.value = selectedValue;
}

function renderTasks() {
    const taskList = document.querySelector('#task-list');
    const emptyMessage = document.querySelector('#empty-task-message');
    const client = clients[currentClientIndex];

    taskList.innerHTML = '';
    renderDashboardStats();
    renderAllTasks();
    renderAllDocuments();
    renderEmployeeOptions();
    emptyMessage.classList.toggle('hidden', client.tasks.length > 0);

    const tasksWithIndexes = client.tasks.map(function(task, taskIndex) {
        return { task: task, taskIndex: taskIndex };
    });

    sortTasks(tasksWithIndexes, taskSort.value);

    tasksWithIndexes.forEach(function(item) {
        const task = item.task;
        const taskIndex = item.taskIndex;
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', function() {
            task.completed = checkbox.checked;
            task.status = task.completed ? 'completed' : 'in-progress';
            saveClients();
            renderTasks();
        });

        const taskText = document.createElement('span');
        taskText.textContent = task.text;
        taskText.className = task.completed ? 'task-completed' : '';
        taskText.addEventListener('click', function() {
            openTaskDetails(taskIndex);
        });

        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';

        const dueDate = document.createElement('span');
        dueDate.className = 'task-due-date';
        dueDate.textContent = task.dueDate ? 'До ' + formatTaskDate(task.dueDate) : 'Без срока';
        if (task.dueDate && task.dueDate < getTodayDate() && !task.completed) {
            dueDate.classList.add('task-overdue');
        } else if (task.dueDate === getTodayDate() && !task.completed) {
            dueDate.classList.add('task-due-today');
            dueDate.textContent = 'Сегодня · ' + formatTaskDate(task.dueDate);
        } else if (task.dueDate === getTomorrowDate() && !task.completed) {
            dueDate.classList.add('task-due-tomorrow');
            dueDate.textContent = 'Завтра · ' + formatTaskDate(task.dueDate);
        }

        const priority = document.createElement('span');
        priority.className = 'task-priority priority-' + task.priority;
        priority.textContent = getPriorityLabel(task.priority);
        taskMeta.append(dueDate, priority);

        const assignee = document.createElement('span');
        assignee.className = 'task-assignee';
        assignee.textContent = task.assignee;
        taskMeta.append(assignee);

        const status = document.createElement('span');
        status.className = 'task-status task-status-' + task.status;
        if (!task.completed && task.dueDate && task.dueDate < getTodayDate()) {
            status.classList.add('task-status-overdue');
        }
        status.textContent = getTaskStatusLabel(task.status);
        taskMeta.append(status);

        const completeButton = document.createElement('button');
        completeButton.type = 'button';
        completeButton.className = 'complete-task-button';
        completeButton.textContent = task.completed ? 'Вернуть в работу' : 'Завершить';
        completeButton.addEventListener('click', function(event) {
            event.stopPropagation();
            task.completed = !task.completed;
            task.status = task.completed ? 'completed' : 'in-progress';
            saveClients();
            renderTasks();
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function() {
            client.tasks.splice(taskIndex, 1);
            saveClients();
            renderTasks();
        });

        taskElement.append(checkbox, taskText, taskMeta, completeButton, deleteButton);
        taskList.appendChild(taskElement);
    });
}

function renderEmployeeOptions() {
    const selectIds = ['client-assignee', 'edit-client-assignee', 'task-assignee', 'edit-task-assignee'];

    selectIds.forEach(function(selectId) {
        const select = document.querySelector('#' + selectId);
        const selectedValue = select.value;
        select.innerHTML = '<option value="Не назначен">Не назначен</option>';

        employees.forEach(function(employee) {
            const option = document.createElement('option');
            option.value = employee;
            option.textContent = employee;
            select.appendChild(option);
        });

        select.value = employees.includes(selectedValue) ? selectedValue : 'Не назначен';
    });

    const assigneeFilter = document.querySelector('#all-tasks-assignee-filter');
    const selectedFilter = assigneeFilter.value;
    assigneeFilter.innerHTML = '<option value="all">Все ответственные</option>'
        + '<option value="Не назначен">Не назначен</option>';
    const taskAssignees = clients.flatMap(function(client) {
        return client.tasks.map(function(task) { return task.assignee; });
    });
    const availableAssignees = Array.from(new Set(employees.concat(taskAssignees)))
        .filter(function(name) { return name && name !== 'Не назначен'; })
        .sort(function(a, b) { return a.localeCompare(b, 'ru'); });

    availableAssignees.forEach(function(employee) {
        const option = document.createElement('option');
        option.value = employee;
        option.textContent = employee;
        assigneeFilter.appendChild(option);
    });
    assigneeFilter.value = Array.from(assigneeFilter.options)
        .some(function(option) { return option.value === selectedFilter; })
        ? selectedFilter : 'all';

}

function renderEmployees() {
    const employeeList = document.querySelector('#employee-list');
    employeeList.innerHTML = '';

    employees.forEach(function(employee, employeeIndex) {
        const item = document.createElement('div');
        item.className = 'employee-item';

        const name = document.createElement('span');
        name.textContent = employee;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function() {
            if (!confirm('Удалить сотрудника «' + employee + '» из списка?')) {
                return;
            }
            employees.splice(employeeIndex, 1);
            saveEmployees();
            renderEmployees();
            renderEmployeeOptions();
        });

        item.append(name, deleteButton);
        employeeList.appendChild(item);
    });
}

function sortTasks(tasks, sortType) {
    if (sortType === 'overdue') {
        tasks.sort(function(a, b) {
            const aOverdue = !a.task.completed && a.task.dueDate && a.task.dueDate < getTodayDate();
            const bOverdue = !b.task.completed && b.task.dueDate && b.task.dueDate < getTodayDate();
            return Number(bOverdue) - Number(aOverdue);
        });
    }

    if (sortType === 'priority') {
        const priorityOrder = { high: 1, normal: 2, low: 3 };
        tasks.sort(function(a, b) {
            return priorityOrder[a.task.priority] - priorityOrder[b.task.priority];
        });
    }

    if (sortType === 'due-date') {
        tasks.sort(function(a, b) {
            return (a.task.dueDate || '9999-12-31').localeCompare(b.task.dueDate || '9999-12-31');
        });
    }

    if (sortType === 'open') {
        tasks.sort(function(a, b) {
            return Number(a.task.completed) - Number(b.task.completed);
        });
    }
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatTaskDate(dateValue) {
    const parts = dateValue.split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : dateValue;
}

function getPriorityLabel(priority) {
    const labels = {
        low: 'Низкий',
        normal: 'Обычный',
        high: 'Высокий'
    };
    return labels[priority] || labels.normal;
}

function getTaskStatusLabel(status) {
    const labels = {
        new: 'Новая',
        'in-progress': 'В работе',
        paused: 'На паузе',
        completed: 'Завершена'
    };
    return labels[status] || labels.new;
}

function renderTaskInteractions() {
    const interactionList = document.querySelector('#interaction-list');
    const emptyMessage = document.querySelector('#empty-task-interaction-message');
    const task = clients[currentClientIndex].tasks[currentTaskIndex];

    interactionList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', task.interactions.length > 0);

    task.interactions.forEach(function(interaction, interactionIndex) {
        const interactionElement = document.createElement('div');
        interactionElement.className = 'interaction-item';

        const heading = document.createElement('div');
        heading.className = 'interaction-heading';
        heading.textContent = interaction.type + ' — ' + formatInteractionDate(interaction);

        const text = document.createElement('p');
        text.textContent = interaction.text;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function() {
            task.interactions.splice(interactionIndex, 1);
            saveClients();
            renderTaskInteractions();
        });

        interactionElement.append(heading, text, deleteButton);
        interactionList.appendChild(interactionElement);
    });
}

function formatInteractionDate(interaction) {
    if (interaction.timestamp) {
        return new Date(interaction.timestamp).toLocaleString('ru-RU');
    }

    const dateParts = (interaction.date || '').split('-');
    return dateParts.length === 3
        ? dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0]
        : interaction.date;
}

function openTaskDetails(taskIndex) {
    currentTaskIndex = taskIndex;
    const task = clients[currentClientIndex].tasks[taskIndex];
    detailsTaskName.textContent = task.text;
    const dueDateText = task.dueDate ? 'Срок: ' + formatTaskDate(task.dueDate) : 'Без срока';
    detailsTaskMeta.textContent = dueDateText + ' · Статус: ' + getTaskStatusLabel(task.status)
        + ' · Приоритет: ' + getPriorityLabel(task.priority)
        + ' · Ответственный: ' + task.assignee;
    editTaskText.value = task.text;
    editTaskDueDate.value = task.dueDate;
    editTaskPriority.value = task.priority;
    editTaskAssignee.value = task.assignee;
    editTaskStatus.value = task.status;
    renderTaskInteractions();
    taskDetailsModal.classList.remove('hidden');
}

function closeTaskDetails() {
    taskDetailsModal.classList.add('hidden');
}

function closeClientDetails() {
    detailsModal.classList.add('hidden');
}

// 3. Работа с формой
const form = document.querySelector('#add-client-form');
const addBtn = document.querySelector('#add-client-btn');
const saveBtn = document.querySelector('#save-client-btn');
const cancelBtn = document.querySelector('#cancel-client-btn');
const nameInput = document.querySelector('#client-name');
const phoneInput = document.querySelector('#client-phone');
const companyInput = document.querySelector('#client-company');
const emailInput = document.querySelector('#client-email');
const clientAssigneeInput = document.querySelector('#client-assignee');
const detailsModal = document.querySelector('#client-details');
const closeDetailsBtn = document.querySelector('#close-details-btn');
const detailsClientName = document.querySelector('#details-client-name');
const detailsClientCompany = document.querySelector('#details-client-company');
const detailsClientPhone = document.querySelector('#details-client-phone');
const detailsClientEmail = document.querySelector('#details-client-email');
const detailsClientStatus = document.querySelector('#details-client-status');
const detailsClientAssignee = document.querySelector('#details-client-assignee');
const documentFileInput = document.querySelector('#document-file-input');
const uploadDocumentBtn = document.querySelector('#upload-document-btn');
const deleteClientBtn = document.querySelector('#delete-client-btn');
const editClientBtn = document.querySelector('#edit-client-btn');
const clientEditForm = document.querySelector('#client-edit-form');
const editClientName = document.querySelector('#edit-client-name');
const editClientCompany = document.querySelector('#edit-client-company');
const editClientPhone = document.querySelector('#edit-client-phone');
const editClientEmail = document.querySelector('#edit-client-email');
const editClientStatus = document.querySelector('#edit-client-status');
const editClientAssignee = document.querySelector('#edit-client-assignee');
const editClientTags = document.querySelector('#edit-client-tags');
const detailsClientTags = document.querySelector('#details-client-tags');
const saveClientChangesBtn = document.querySelector('#save-client-changes-btn');
const cancelClientEditBtn = document.querySelector('#cancel-client-edit-btn');
const taskInput = document.querySelector('#task-input');
const taskDueDateInput = document.querySelector('#task-due-date');
const taskPriorityInput = document.querySelector('#task-priority');
const taskAssigneeInput = document.querySelector('#task-assignee');
const addTaskBtn = document.querySelector('#add-task-btn');
const taskSort = document.querySelector('#task-sort');
const taskDetailsModal = document.querySelector('#task-details');
const closeTaskDetailsBtn = document.querySelector('#close-task-details-btn');
const detailsTaskName = document.querySelector('#details-task-name');
const detailsTaskMeta = document.querySelector('#details-task-meta');
const editTaskText = document.querySelector('#edit-task-text');
const editTaskDueDate = document.querySelector('#edit-task-due-date');
const editTaskPriority = document.querySelector('#edit-task-priority');
const editTaskAssignee = document.querySelector('#edit-task-assignee');
const editTaskStatus = document.querySelector('#edit-task-status');
const saveTaskChangesBtn = document.querySelector('#save-task-changes-btn');
const interactionText = document.querySelector('#interaction-text');
const addInteractionBtn = document.querySelector('#add-interaction-btn');
const exportDataBtn = document.querySelector('#export-data-btn');
const importDataBtn = document.querySelector('#import-data-btn');
const importFileInput = document.querySelector('#import-file-input');
const clientSearch = document.querySelector('#client-search');
const statusFilter = document.querySelector('#status-filter');
const clientsCount = document.querySelector('#clients-count');
const allTasksFilter = document.querySelector('#all-tasks-filter');
const allTasksAssigneeFilter = document.querySelector('#all-tasks-assignee-filter');
const allTasksPriorityFilter = document.querySelector('#all-tasks-priority-filter');
const allTasksSort = document.querySelector('#all-tasks-sort');
const documentSearch = document.querySelector('#document-search');
const documentClientFilter = document.querySelector('#document-client-filter');
const documentTypeFilter = document.querySelector('#document-type-filter');
const sidebar = document.querySelector('#sidebar');
const sidebarBackdrop = document.querySelector('#sidebar-backdrop');
const menuToggle = document.querySelector('#menu-toggle');
const sidebarClose = document.querySelector('#sidebar-close');
const employeeNameInput = document.querySelector('#employee-name-input');
const addEmployeeBtn = document.querySelector('#add-employee-btn');
let currentClientIndex = null;
let currentTaskIndex = null;

addEmployeeBtn.addEventListener('click', function() {
    const employeeName = employeeNameInput.value.trim();

    if (employeeName === '') {
        alert('Введи имя сотрудника');
        return;
    }

    if (employees.includes(employeeName)) {
        alert('Такой сотрудник уже есть');
        return;
    }

    employees.push(employeeName);
    saveEmployees();
    employeeNameInput.value = '';
    renderEmployees();
    renderEmployeeOptions();
});


uploadDocumentBtn.addEventListener('click', function() {
    const file = documentFileInput.files[0];

    if (!file) {
        alert('Сначала выбери файл');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert('Для текущей версии можно загрузить файл размером до 2 МБ');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const client = clients[currentClientIndex];

        if (!Array.isArray(client.documents)) {
            client.documents = [];
        }

        client.documents.push({
            name: file.name,
            type: file.type,
            size: file.size,
            date: new Date().toLocaleDateString('ru-RU'),
            data: event.target.result
        });
        addClientHistory(client, 'Добавлен документ: ' + file.name);

        saveClients();
        documentFileInput.value = '';
        renderDocuments();
        renderAllDocuments();
    };

    reader.readAsDataURL(file);
});

function setSidebarOpen(isOpen) {
    sidebar.classList.toggle('sidebar-open', isOpen);
    sidebarBackdrop.classList.toggle('backdrop-visible', isOpen);
    sidebar.setAttribute('aria-hidden', String(!isOpen));
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('sidebar-is-open', isOpen);
}

menuToggle.addEventListener('click', function() {
    setSidebarOpen(true);
});

sidebarClose.addEventListener('click', function() {
    setSidebarOpen(false);
});

sidebarBackdrop.addEventListener('click', function() {
    setSidebarOpen(false);
});

document.querySelectorAll('[data-nav-target]').forEach(function(button) {
    button.addEventListener('click', function() {
        const targetName = button.dataset.navTarget;
        const view = targetName === 'data-tools'
            ? 'clients'
            : (targetName === 'all-tasks' ? 'tasks' : targetName);
        document.body.dataset.view = view;
        if (view === 'dashboard') {
            allTasksFilter.value = 'all';
            allTasksAssigneeFilter.value = 'all';
            allTasksPriorityFilter.value = 'all';
            allTasksSort.value = 'default';
            renderAllTasks();
        }
        document.querySelectorAll('[data-nav-target]').forEach(function(navButton) {
            navButton.classList.toggle('nav-active', navButton === button);
        });
        if (view === 'settings') {
            renderEmployees();
        }
        setSidebarOpen(false);
        if (targetName === 'data-tools') {
            document.querySelector('#data-tools').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
});

document.body.dataset.view = 'dashboard';

document.querySelectorAll('[data-open-task-filter]').forEach(function(card) {
    card.addEventListener('click', function() {
        document.body.dataset.view = 'tasks';
        allTasksFilter.value = card.dataset.openTaskFilter;
        renderAllTasks();
        document.querySelectorAll('[data-nav-target]').forEach(function(button) {
            button.classList.toggle('nav-active', button.dataset.navTarget === 'all-tasks');
        });
    });
});

document.querySelectorAll('[data-open-client-status]').forEach(function(card) {
    card.addEventListener('click', function() {
        document.body.dataset.view = 'clients';
        statusFilter.value = card.dataset.openClientStatus;
        renderClients();
        document.querySelectorAll('[data-nav-target]').forEach(function(button) {
            button.classList.toggle('nav-active', button.dataset.navTarget === 'clients');
        });
    });
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        setSidebarOpen(false);
    }
});

taskSort.addEventListener('change', renderTasks);

clientSearch.addEventListener('input', renderClients);
statusFilter.addEventListener('change', renderClients);
allTasksFilter.addEventListener('change', renderAllTasks);
allTasksAssigneeFilter.addEventListener('change', renderAllTasks);
allTasksPriorityFilter.addEventListener('change', renderAllTasks);
allTasksSort.addEventListener('change', renderAllTasks);
documentSearch.addEventListener('input', renderAllDocuments);
documentClientFilter.addEventListener('change', renderAllDocuments);
documentTypeFilter.addEventListener('change', renderAllDocuments);

// Рисуем начальный список после того, как подключили поля поиска и фильтр.
statusFilter.value = 'all';
renderEmployeeOptions();
renderClients();
renderAllTasks();

editClientBtn.addEventListener('click', function() {
    const client = clients[currentClientIndex];

    editClientName.value = client.name;
    editClientCompany.value = client.company || '';
    editClientPhone.value = client.phone;
    editClientEmail.value = client.email || '';
    editClientStatus.value = client.status;
    editClientAssignee.value = client.assignee;
    editClientTags.value = client.tags.join(', ');
    clientEditForm.classList.remove('hidden');
    editClientBtn.classList.add('hidden');
});

cancelClientEditBtn.addEventListener('click', function() {
    clientEditForm.classList.add('hidden');
    editClientBtn.classList.remove('hidden');
});

saveClientChangesBtn.addEventListener('click', function() {
    const name = editClientName.value.trim();
    const phone = editClientPhone.value.trim();

    if (name === '' || phone === '') {
        alert('Имя и телефон не могут быть пустыми');
        return;
    }

    const client = clients[currentClientIndex];
    client.name = name;
    client.company = editClientCompany.value.trim();
    client.phone = phone;
    client.email = editClientEmail.value.trim();
    client.status = editClientStatus.value;
    client.assignee = editClientAssignee.value;
    client.tags = editClientTags.value.split(',')
        .map(function(tag) { return tag.trim(); })
        .filter(function(tag, index, tags) { return tag !== '' && tags.indexOf(tag) === index; });
    addClientHistory(client, 'Изменены данные клиента');

    saveClients();
    openClientDetails(currentClientIndex);
    renderClients();
});

addBtn.addEventListener('click', function() {
    form.classList.remove('hidden');
});

cancelBtn.addEventListener('click', function() {
    form.classList.add('hidden');
    nameInput.value = '';
    phoneInput.value = '';
    companyInput.value = '';
    emailInput.value = '';
    clientAssigneeInput.value = 'Не назначен';
});

saveBtn.addEventListener('click', function() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (name === '' || phone === '') {
        alert('Заполни имя и телефон');
        return;
    }

    clients.push({
        name: name,
        phone: phone,
        company: companyInput.value.trim(),
        email: emailInput.value.trim(),
        assignee: clientAssigneeInput.value,
        tags: [],
        history: [{
            text: 'Клиент создан',
            date: new Date().toLocaleString('ru-RU')
        }],
        status: 'Новый',
        tasks: []
    });
    saveClients();
    renderClients();

    form.classList.add('hidden');
    nameInput.value = '';
    phoneInput.value = '';
    companyInput.value = '';
    emailInput.value = '';
    clientAssigneeInput.value = 'Не назначен';
});

closeDetailsBtn.addEventListener('click', closeClientDetails);

deleteClientBtn.addEventListener('click', function() {
    const client = clients[currentClientIndex];
    const confirmed = confirm('Удалить клиента «' + client.name + '» вместе с его задачами и историей?');

    if (!confirmed) {
        return;
    }

    clients.splice(currentClientIndex, 1);
    saveClients();
    closeClientDetails();
    renderClients();
});

detailsModal.addEventListener('click', function(event) {
    if (event.target === detailsModal) {
        closeClientDetails();
    }
});

addTaskBtn.addEventListener('click', function() {
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        alert('Напиши текст задачи');
        return;
    }

    clients[currentClientIndex].tasks.push({
        text: taskText,
        completed: false,
        dueDate: taskDueDateInput.value,
        priority: taskPriorityInput.value,
        assignee: taskAssigneeInput.value,
        status: 'new',
        interactions: []
    });
    addClientHistory(clients[currentClientIndex], 'Добавлена задача: ' + taskText);

    saveClients();
    taskInput.value = '';
    taskDueDateInput.value = '';
    taskPriorityInput.value = 'normal';
    taskAssigneeInput.value = 'Не назначен';
    renderTasks();
});

addInteractionBtn.addEventListener('click', function() {
    const text = interactionText.value.trim();

    if (text === '') {
        alert('Напиши комментарий');
        return;
    }

    const now = new Date();
    clients[currentClientIndex].tasks[currentTaskIndex].interactions.unshift({
        type: 'Комментарий',
        date: now.toISOString().slice(0, 10),
        timestamp: now.toISOString(),
        text: text
    });
    addClientHistory(clients[currentClientIndex], 'Добавлен комментарий к задаче');

    saveClients();
    interactionText.value = '';
    renderTaskInteractions();
});

closeTaskDetailsBtn.addEventListener('click', closeTaskDetails);

taskDetailsModal.addEventListener('click', function(event) {
    if (event.target === taskDetailsModal) {
        closeTaskDetails();
    }
});

saveTaskChangesBtn.addEventListener('click', function() {
    const taskText = editTaskText.value.trim();

    if (taskText === '') {
        alert('Название задачи не может быть пустым');
        return;
    }

    const task = clients[currentClientIndex].tasks[currentTaskIndex];
    task.text = taskText;
    task.dueDate = editTaskDueDate.value;
    task.priority = editTaskPriority.value;
    task.assignee = editTaskAssignee.value;
    task.status = editTaskStatus.value;
    task.completed = task.status === 'completed';
    addClientHistory(clients[currentClientIndex], 'Изменена задача: ' + task.text);

    saveClients();
    openTaskDetails(currentTaskIndex);
    renderTasks();
});

// Сохраняем всех клиентов в отдельный JSON-файл.
exportDataBtn.addEventListener('click', function() {
    const data = JSON.stringify(clients, null, 2);
    const file = new Blob([data], { type: 'application/json' });
    const downloadLink = document.createElement('a');

    downloadLink.href = URL.createObjectURL(file);
    downloadLink.download = 'crm-clients.json';
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
});

// Открываем системное окно выбора файла.
importDataBtn.addEventListener('click', function() {
    importFileInput.click();
});

// Читаем выбранный JSON-файл и заменяем им текущий список клиентов.
importFileInput.addEventListener('change', function() {
    const file = importFileInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const importedClients = JSON.parse(event.target.result);

            if (!Array.isArray(importedClients)) {
                throw new Error('Файл должен содержать список клиентов');
            }

            const validClients = importedClients.every(function(client) {
                return client && typeof client.name === 'string'
                    && typeof client.phone === 'string'
                    && typeof client.status === 'string';
            });

            if (!validClients) {
                throw new Error('У клиентов должны быть имя, телефон и статус');
            }

            clients.length = 0;
            importedClients.forEach(function(client) {
                clients.push({
                    name: client.name,
                    phone: client.phone,
                    company: typeof client.company === 'string' ? client.company : '',
                    email: typeof client.email === 'string' ? client.email : '',
                    assignee: typeof client.assignee === 'string' ? client.assignee : 'Не назначен',
                    tags: Array.isArray(client.tags) ? client.tags : [],
                    history: Array.isArray(client.history) ? client.history : [],
                    documents: Array.isArray(client.documents) ? client.documents : [],
                    status: client.status,
                    tasks: Array.isArray(client.tasks) ? client.tasks
                        .filter(function(task) {
                            return task && typeof task.text === 'string';
                        })
                        .map(function(task) {
                            return {
                                text: task.text,
                                completed: Boolean(task.completed),
                                dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
                                priority: ['low', 'normal', 'high'].includes(task.priority)
                                    ? task.priority : 'normal',
                                assignee: typeof task.assignee === 'string' ? task.assignee : 'Не назначен',
                                status: ['new', 'in-progress', 'paused', 'completed'].includes(task.status)
                                    ? task.status : (task.completed ? 'completed' : 'new'),
                                interactions: Array.isArray(task.interactions) ? task.interactions : []
                            };
                        }) : []
                });
            });

            saveClients();
            renderClients();
            alert('Данные успешно загружены');
        } catch (error) {
            alert('Не удалось загрузить файл: ' + error.message);
        }

        // Позволяем снова выбрать тот же файл.
        importFileInput.value = '';
    };

    reader.readAsText(file);
});
