// Ключ — имя, под которым список будет храниться в браузере.
const STORAGE_KEY = 'crm-clients';
const EMPLOYEES_STORAGE_KEY = 'crm-employees';
const GENERAL_TASKS_STORAGE_KEY = 'crm-general-tasks';
const MESSAGES_STORAGE_KEY = 'crm-messages';
const CURRENT_USER_STORAGE_KEY = 'crm-current-user-v2';
const DATA_SCHEMA_VERSION = 1;
const defaultEmployees = ['Алексей', 'Мария', 'Иван'];

// Единый слой хранения. Позже его можно заменить на запросы к API,
// не меняя логику экранов и форм CRM.
const crmStorage = {
    get: function(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch (error) {
            console.error('Не удалось прочитать данные CRM:', key, error);
            return fallback;
        }
    },
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Не удалось сохранить данные CRM:', key, error);
            return false;
        }
    }
};

// Начальные примеры показываем только при первом запуске CRM.
const defaultClients = [
    { name: 'Иван Петров', phone: '+7 900 123-45-67', status: 'Активен' },
    { name: 'Мария Смирнова', phone: '+7 900 234-56-78', status: 'Новый' },
    { name: 'Алексей Кузнецов', phone: '+7 900 345-67-89', status: 'В ожидании' }
];

// Загружаем сохранённый список. Если его ещё нет или он повреждён,
// используем начальные примеры, не останавливая работу приложения.
function loadClients() {
    return crmStorage.get(STORAGE_KEY, defaultClients);
}

const clients = loadClients();
let employees = loadEmployees().map(function(employee) {
    return typeof employee === 'string'
        ? { name: employee, position: '', phone: '', email: '', status: 'Активен', note: '', role: employee === defaultEmployees[0] ? 'manager' : 'employee' }
        : {
            name: employee.name || '',
            position: employee.position || '',
            phone: employee.phone || '',
            email: employee.email || '',
            status: employee.status || 'Активен',
            note: employee.note || '',
            role: employee.role === 'manager' ? 'manager' : 'employee'
        };
});
let generalTasks = loadGeneralTasks();
let messages = loadMessages();
let selectedMessageEmployee = '';
const defaultManager = employees.find(function(employee) {
    return employee.role === 'manager';
});
let currentUserName = crmStorage.get(CURRENT_USER_STORAGE_KEY, '')
    || (defaultManager ? defaultManager.name : (employees[0] ? employees[0].name : ''));

if (!employees.some(function(employee) { return employee.name === currentUserName; })) {
    currentUserName = employees[0] ? employees[0].name : '';
}

function getCurrentUser() {
    return employees.find(function(employee) {
        return employee.name === currentUserName;
    }) || null;
}

function isManager() {
    const currentUser = getCurrentUser();
    return Boolean(currentUser && currentUser.role === 'manager');
}

function getRoleLabel(role) {
    return role === 'manager' ? 'Руководитель' : 'Сотрудник';
}

function saveCurrentUser() {
    crmStorage.set(CURRENT_USER_STORAGE_KEY, currentUserName);
}

function renderCurrentUser() {
    const select = document.querySelector('#current-user-select');
    const role = document.querySelector('#current-user-role');
    const accessNotice = document.querySelector('#settings-access-notice');
    select.innerHTML = '';
    employees.forEach(function(employee) {
        const option = document.createElement('option');
        option.value = employee.name;
        option.textContent = employee.name;
        select.appendChild(option);
    });
    select.value = currentUserName;
    const currentUser = getCurrentUser();
    role.textContent = currentUser ? getRoleLabel(currentUser.role) : 'Нет пользователя';
    document.body.classList.toggle('user-is-manager', isManager());
    document.querySelector('[data-nav-target="settings"]').classList.toggle('hidden', !isManager());
    accessNotice.textContent = isManager()
        ? ''
        : 'Режим просмотра. Добавлять, изменять и удалять сотрудников может только руководитель.';
    accessNotice.classList.toggle('hidden', isManager());
}

function ensureSettingsAccess() {
    if (isManager()) {
        return true;
    }
    alert('Настройки сотрудников доступны только руководителю');
    document.body.dataset.view = 'dashboard';
    return false;
}

function loadMessages() {
    return crmStorage.get(MESSAGES_STORAGE_KEY, []);
}

function saveMessages() {
    crmStorage.set(MESSAGES_STORAGE_KEY, messages);
}

function loadGeneralTasks() {
    return crmStorage.get(GENERAL_TASKS_STORAGE_KEY, []);
}

function saveGeneralTasks() {
    crmStorage.set(GENERAL_TASKS_STORAGE_KEY, generalTasks);
}

function loadEmployees() {
    return crmStorage.get(EMPLOYEES_STORAGE_KEY, defaultEmployees.slice());
}

function saveEmployees() {
    crmStorage.set(EMPLOYEES_STORAGE_KEY, employees);
}

function renderMessages() {
    const messageList = document.querySelector('#message-list');
    const emptyMessage = document.querySelector('#empty-message-list');
    const sender = messageCurrentUser.value;
    const recipient = selectedMessageEmployee;
    const conversation = messages.filter(function(message) {
        return (message.from === sender && message.to === recipient)
            || (message.from === recipient && message.to === sender);
    });

    conversation.forEach(function(message) {
        if (message.to === sender) {
            if (!Array.isArray(message.readBy)) {
                message.readBy = [];
            }
            if (!message.readBy.includes(sender)) {
                message.readBy.push(sender);
            }
        }
    });
    saveMessages();

    messageList.innerHTML = '';
    messageChatTitle.textContent = recipient || 'Выберите сотрудника';
    messageChatSubtitle.textContent = recipient
        ? 'Переписка доступна только сотрудникам CRM'
        : 'Чтобы начать переписку';
    messageText.disabled = !sender || !recipient;
    sendMessageBtn.disabled = !sender || !recipient;
    emptyMessage.classList.toggle('hidden', conversation.length > 0);
    conversation.forEach(function(message) {
        const item = document.createElement('article');
        item.className = 'message-item' + (message.from === sender ? ' message-own' : '');
        const author = document.createElement('strong');
        author.textContent = message.from;
        if (message.text) {
            const text = document.createElement('p');
            text.textContent = message.text;
            item.appendChild(text);
        }
        if (message.attachment) {
            const attachment = document.createElement('a');
            attachment.className = 'message-attachment';
            attachment.href = message.attachment.data;
            attachment.download = message.attachment.name;
            attachment.textContent = '📎 ' + message.attachment.name;
            item.appendChild(attachment);
        }
        if (message.sharedItem) {
            const sharedItem = document.createElement('button');
            sharedItem.type = 'button';
            sharedItem.className = 'message-shared-item';
            sharedItem.textContent = (message.sharedItem.type === 'client' ? '👤 ' : '✓ ')
                + message.sharedItem.title + ' · ' + message.sharedItem.subtitle;
            sharedItem.addEventListener('click', function() {
                openSharedMessageItem(message.sharedItem);
            });
            item.appendChild(sharedItem);
        }
        const date = document.createElement('small');
        date.textContent = new Date(message.timestamp).toLocaleString('ru-RU');
        item.insertBefore(author, item.firstChild);
        item.appendChild(date);
        messageList.appendChild(item);
    });
    messageList.scrollTop = messageList.scrollHeight;
    updateMessageNavBadge();
}

function getUnreadMessageCount(employeeName, currentUser) {
    return messages.filter(function(message) {
        return message.to === currentUser
            && message.from === employeeName
            && (!Array.isArray(message.readBy) || !message.readBy.includes(currentUser));
    }).length;
}

function updateMessageNavBadge() {
    const messagesNavButton = document.querySelector('[data-nav-target="messages"]');
    if (!messagesNavButton) {
        return;
    }
    let badge = messagesNavButton.querySelector('.unread-badge');
    const unreadCount = employees.reduce(function(total, employee) {
        return total + getUnreadMessageCount(employee.name, messageCurrentUser.value);
    }, 0);
    if (unreadCount === 0) {
        if (badge) badge.remove();
        return;
    }
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'unread-badge';
        messagesNavButton.appendChild(badge);
    }
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
}

function openSharedMessageItem(sharedItem) {
    if (sharedItem.type === 'client' && Number.isInteger(sharedItem.clientIndex)
        && clients[sharedItem.clientIndex]) {
        openClientDetails(sharedItem.clientIndex);
        return;
    }

    if (sharedItem.type === 'task' && sharedItem.generalIndex !== undefined) {
        alert('Эта общая задача не привязана к карточке клиента');
        return;
    }

    if (sharedItem.type === 'task' && Number.isInteger(sharedItem.clientIndex)
        && Number.isInteger(sharedItem.taskIndex)
        && clients[sharedItem.clientIndex]
        && clients[sharedItem.clientIndex].tasks[sharedItem.taskIndex]) {
        openClientDetails(sharedItem.clientIndex);
        openTaskDetails(sharedItem.taskIndex);
    }
}

function renderMessageEmployees() {
    const selectedSender = messageCurrentUser.value;
    const searchText = messageSearch.value.trim().toLowerCase();
    messageCurrentUser.innerHTML = '';
    employees.forEach(function(employee) {
        const option = document.createElement('option');
        option.value = employee.name;
        option.textContent = employee.name;
        messageCurrentUser.appendChild(option);
    });
    if (employees.length > 0) {
        messageCurrentUser.value = employees.some(function(employee) { return employee.name === selectedSender; })
            ? selectedSender : employees[0].name;
    }
    if (selectedMessageEmployee === messageCurrentUser.value) {
        selectedMessageEmployee = '';
    }
    messageEmployeeList.innerHTML = '';
    employees
        .filter(function(employee) {
            return employee.name.toLowerCase().includes(searchText)
                && employee.name !== messageCurrentUser.value;
        })
        .forEach(function(employee) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'message-employee-button'
                + (employee.name === selectedMessageEmployee ? ' active' : '');
            button.textContent = employee.name;
            const unreadCount = getUnreadMessageCount(employee.name, messageCurrentUser.value);
            if (unreadCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'employee-unread-badge';
                badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
                button.appendChild(badge);
            }
            button.addEventListener('click', function() {
                selectedMessageEmployee = employee.name;
                renderMessages();
                renderMessageEmployees();
                messageText.focus();
            });
            messageEmployeeList.appendChild(button);
        });
    renderMessages();
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
    crmStorage.set(STORAGE_KEY, clients);
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

    if (clientSort.value === 'name') {
        filteredClients.sort(function(a, b) {
            return a.name.localeCompare(b.name, 'ru');
        });
    } else if (clientSort.value === 'company') {
        filteredClients.sort(function(a, b) {
            return (a.company || '').localeCompare(b.company || '', 'ru');
        });
    } else if (clientSort.value === 'status') {
        filteredClients.sort(function(a, b) {
            return a.status.localeCompare(b.status, 'ru') || a.name.localeCompare(b.name, 'ru');
        });
    } else if (clientSort.value === 'newest') {
        filteredClients.reverse();
    }

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
        const clientAssignee = card.querySelector('.client-responsible');
        makeEmployeeLink(clientAssignee, client.assignee, function(event) {
            event.stopPropagation();
        });
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

    generalTasks.forEach(function(task, taskIndex) {
        const isOverdue = !task.completed && task.dueDate && task.dueDate < getTodayDate();
        const isDueToday = !task.completed && task.dueDate === getTodayDate();
        const isDueTomorrow = !task.completed && task.dueDate === getTomorrowDate();
        const matchesFilter = selectedFilter === 'all'
            || (selectedFilter === 'open' && task.status !== 'completed')
            || (selectedFilter === 'completed' && task.status === 'completed')
            || (selectedFilter === 'overdue' && isOverdue);
        const matchesAssignee = selectedAssignee === 'all' || task.assignee === selectedAssignee;
        const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
        if (matchesFilter && matchesAssignee && matchesPriority) {
            allTasks.push({ task, taskIndex, isGeneral: true, isOverdue, isDueToday, isDueTomorrow });
        }
    });

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
        taskCard.dataset.generalTaskIndex = item.isGeneral ? item.taskIndex : '';
        if (item.isDueToday) taskCard.classList.add('due-today');
        if (item.isDueTomorrow) taskCard.classList.add('due-tomorrow');

        const title = document.createElement('strong');
        title.textContent = item.task.text;

        const clientName = document.createElement('span');
        clientName.textContent = item.isGeneral ? 'Без клиента' : (item.client.company || item.client.name);

        const details = document.createElement('span');
        const dueLabel = item.isDueToday ? 'Сегодня · срок: '
            : (item.isDueTomorrow ? 'Завтра · срок: ' : 'Срок: ');
        details.textContent = (item.task.dueDate
            ? dueLabel + formatTaskDate(item.task.dueDate) : 'Без срока')
            + ' · ' + getPriorityLabel(item.task.priority);

        const taskAssignee = document.createElement('button');
        taskAssignee.type = 'button';
        taskAssignee.className = 'employee-link task-assignee-link';
        taskAssignee.textContent = item.task.assignee;
        taskAssignee.addEventListener('click', function(event) {
            event.stopPropagation();
            openEmployeeDetails(item.task.assignee);
        });

        const completeButton = document.createElement('button');
        completeButton.type = 'button';
        completeButton.className = 'all-task-complete-button';
        completeButton.textContent = item.task.completed ? 'Вернуть' : 'Завершить';
        completeButton.addEventListener('click', function(event) {
            event.stopPropagation();
            item.task.completed = !item.task.completed;
            item.task.status = item.task.completed ? 'completed' : 'in-progress';
            if (item.isGeneral) {
                saveGeneralTasks();
            } else {
                saveClients();
            }
            renderAllTasks();
        });

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

        taskCard.append(title, clientName, details, taskAssignee, status, completeButton);
        taskCard.addEventListener('click', function() {
            if (!item.isGeneral) {
                openClientDetails(item.clientIndex);
                openTaskDetails(item.taskIndex);
            }
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
    renderTaskAttention();
    renderRecentActivity();
    renderReports();
}

function renderReportBars(elementId, values) {
    const container = document.querySelector('#' + elementId);
    const max = Math.max.apply(null, values.map(function(item) { return item.value; }).concat([1]));
    container.innerHTML = '';
    values.forEach(function(item) {
        const row = document.createElement('div');
        row.className = 'report-bar-row';
        const label = document.createElement('span');
        label.textContent = item.label;
        const track = document.createElement('div');
        track.className = 'report-bar-track';
        const fill = document.createElement('div');
        fill.className = 'report-bar-fill';
        fill.style.width = (item.value / max * 100) + '%';
        track.appendChild(fill);
        const count = document.createElement('strong');
        count.textContent = item.value;
        row.append(label, track, count);
        container.appendChild(row);
    });
}

function renderReports() {
    let openTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    const clientStatuses = { 'Новый': 0, 'Активен': 0, 'В ожидании': 0 };
    const taskStatuses = { 'Открытые': 0, 'Завершённые': 0, 'Просроченные': 0 };
    const activityByEmployee = {};

    clients.forEach(function(client) {
        clientStatuses[client.status] = (clientStatuses[client.status] || 0) + 1;
        client.tasks.forEach(function(task) {
            if (task.completed) {
                completedTasks += 1;
                taskStatuses['Завершённые'] += 1;
            } else {
                openTasks += 1;
                taskStatuses['Открытые'] += 1;
                if (task.dueDate && task.dueDate < getTodayDate()) {
                    overdueTasks += 1;
                    taskStatuses['Просроченные'] += 1;
                }
            }
            if (task.assignee && task.assignee !== 'Не назначен') {
                activityByEmployee[task.assignee] = (activityByEmployee[task.assignee] || 0) + 1;
            }
            task.interactions.forEach(function(interaction) {
                if (interaction.employee && interaction.employee !== 'Не назначен') {
                    activityByEmployee[interaction.employee] = (activityByEmployee[interaction.employee] || 0) + 1;
                }
            });
        });
    });

    document.querySelector('#report-total-clients').textContent = clients.length;
    document.querySelector('#report-open-tasks').textContent = openTasks;
    document.querySelector('#report-completed-tasks').textContent = completedTasks;
    document.querySelector('#report-overdue-tasks').textContent = overdueTasks;
    renderReportBars('client-status-report', Object.keys(clientStatuses).map(function(label) {
        return { label: label, value: clientStatuses[label] };
    }));
    renderReportBars('task-status-report', Object.keys(taskStatuses).map(function(label) {
        return { label: label, value: taskStatuses[label] };
    }));

    const activityList = document.querySelector('#employee-activity-report');
    const emptyActivity = document.querySelector('#empty-employee-report');
    activityList.innerHTML = '';
    const activityEntries = Object.keys(activityByEmployee).sort(function(a, b) {
        return activityByEmployee[b] - activityByEmployee[a];
    });
    emptyActivity.classList.toggle('hidden', activityEntries.length > 0);
    activityEntries.forEach(function(name) {
        const item = document.createElement('div');
        item.className = 'employee-report-item';
        const employee = document.createElement('strong');
        employee.textContent = name;
        const count = document.createElement('span');
        count.textContent = 'Задач и действий: ' + activityByEmployee[name];
        item.append(employee, count);
        activityList.appendChild(item);
    });

    renderChangeHistoryReport();
}

function renderChangeHistoryReport() {
    const list = document.querySelector('#change-history-report');
    const emptyMessage = document.querySelector('#empty-change-history-report');
    const changes = [];
    clients.forEach(function(client) {
        (client.history || []).forEach(function(historyItem) {
            changes.push({
                date: historyItem.date || '',
                text: (client.company || client.name) + ': ' + historyItem.text
            });
        });
        client.tasks.forEach(function(task) {
            (task.interactions || []).forEach(function(interaction) {
                changes.push({
                    date: interaction.date || interaction.timestamp || '',
                    text: (client.company || client.name) + ': ' + interaction.text
                });
            });
        });
    });
    changes.sort(function(a, b) {
        return String(b.date).localeCompare(String(a.date));
    });
    list.innerHTML = '';
    emptyMessage.classList.toggle('hidden', changes.length > 0);
    changes.slice(0, 12).forEach(function(change) {
        const item = document.createElement('div');
        item.className = 'change-history-item';
        const date = document.createElement('time');
        date.textContent = change.date || 'Дата не указана';
        const text = document.createElement('span');
        text.textContent = change.text;
        item.append(date, text);
        list.appendChild(item);
    });
}

function renderTaskAttention() {
    const list = document.querySelector('#task-attention-list');
    const emptyMessage = document.querySelector('#empty-task-attention');
    const attentionTasks = [];

    clients.forEach(function(client, clientIndex) {
        client.tasks.forEach(function(task, taskIndex) {
            if (task.completed || !task.dueDate) {
                return;
            }
            const isOverdue = task.dueDate < getTodayDate();
            const isToday = task.dueDate === getTodayDate();
            if (isOverdue || isToday) {
                attentionTasks.push({
                    client: client,
                    clientIndex: clientIndex,
                    task: task,
                    taskIndex: taskIndex,
                    isOverdue: isOverdue
                });
            }
        });
    });

    attentionTasks.sort(function(a, b) {
        if (a.isOverdue !== b.isOverdue) {
            return a.isOverdue ? -1 : 1;
        }
        return a.task.dueDate.localeCompare(b.task.dueDate);
    });

    list.innerHTML = '';
    emptyMessage.classList.toggle('hidden', attentionTasks.length > 0);
    attentionTasks.slice(0, 8).forEach(function(item) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'task-attention-item' + (item.isOverdue ? '' : ' task-due-today');

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = item.task.text;
        const clientName = document.createElement('span');
        clientName.textContent = item.client.company || item.client.name;
        info.append(title, clientName);

        const label = document.createElement('small');
        label.textContent = item.isOverdue ? 'Просрочена' : 'Сегодня';
        button.append(info, label);
        button.addEventListener('click', function() {
            openClientDetails(item.clientIndex);
            openTaskDetails(item.taskIndex);
        });
        list.appendChild(button);
    });
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
    makeEmployeeLink(detailsClientAssignee, client.assignee);
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
        deleteButton.addEventListener('click', function(event) {
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
        assignee.className = 'task-assignee employee-link';
        assignee.textContent = task.assignee;
        assignee.addEventListener('click', function(event) {
            event.stopPropagation();
            openEmployeeDetails(task.assignee);
        });
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

        taskElement.append(checkbox, taskText, taskMeta, completeButton);
        taskList.appendChild(taskElement);
    });
}

function renderEmployeeOptions() {
    const selectIds = ['client-assignee', 'edit-client-assignee', 'task-assignee', 'edit-task-assignee', 'general-task-assignee'];

    selectIds.forEach(function(selectId) {
        const select = document.querySelector('#' + selectId);
        const selectedValue = select.value;
        select.innerHTML = '<option value="Не назначен">Не назначен</option>';

        employees.forEach(function(employee) {
            const option = document.createElement('option');
            option.value = employee.name;
            option.textContent = employee.name;
            select.appendChild(option);
        });

        select.value = employees.some(function(employee) { return employee.name === selectedValue; })
            ? selectedValue : 'Не назначен';
    });

    const assigneeFilter = document.querySelector('#all-tasks-assignee-filter');
    const selectedFilter = assigneeFilter.value;
    assigneeFilter.innerHTML = '<option value="all">Все ответственные</option>'
        + '<option value="Не назначен">Не назначен</option>';
    const taskAssignees = clients.flatMap(function(client) {
        return client.tasks.map(function(task) { return task.assignee; });
    });
    generalTasks.forEach(function(task) {
        taskAssignees.push(task.assignee);
    });
    const employeeNames = employees.map(function(employee) { return employee.name; });
    const availableAssignees = Array.from(new Set(employeeNames.concat(taskAssignees)))
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
    if (!isManager()) {
        return;
    }
    const employeeList = document.querySelector('#employee-list');
    employeeList.innerHTML = '';

    employees.forEach(function(employee, employeeIndex) {
        const item = document.createElement('div');
        item.className = 'employee-item';
        item.addEventListener('click', function() {
            openEmployeeDetails(employee.name);
        });

        const information = document.createElement('div');
        information.className = 'employee-information';

        const name = document.createElement('strong');
        name.textContent = employee.name;

        const details = document.createElement('span');
        details.textContent = [employee.position, employee.phone, employee.email]
            .filter(Boolean).join(' · ') || 'Контактные данные не заполнены';

        const note = document.createElement('small');
        note.textContent = employee.note || 'Без заметки';

        const status = document.createElement('span');
        status.className = 'employee-status employee-status-' + (employee.status === 'Активен' ? 'active' : 'inactive');
        status.textContent = employee.status;

        information.append(name, details, note);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', function(event) {
            event.stopPropagation();
            if (!confirm('Удалить сотрудника «' + employee.name + '» из списка?')) {
                return;
            }
            employees.splice(employeeIndex, 1);
            if (employee.name === currentUserName) {
                currentUserName = employees[0] ? employees[0].name : '';
                saveCurrentUser();
            }
            saveEmployees();
            renderEmployees();
            renderEmployeeOptions();
            renderMessageEmployees();
            renderCurrentUser();
        });

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Изменить';
        editButton.addEventListener('click', function(event) {
            event.stopPropagation();
            employeeNameInput.value = employee.name;
            employeePositionInput.value = employee.position;
            employeePhoneInput.value = employee.phone;
            employeeEmailInput.value = employee.email;
            employeeRoleInput.value = employee.role;
            employeeStatusInput.value = employee.status;
            employeeNoteInput.value = employee.note;
            editingEmployeeIndex = employeeIndex;
            addEmployeeBtn.textContent = 'Сохранить изменения';
            cancelEmployeeEditBtn.classList.remove('hidden');
            employeeNameInput.focus();
        });

        const actions = document.createElement('div');
        actions.className = 'employee-actions';
        actions.append(editButton, deleteButton);
        item.append(information, status, actions);
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
        + ' · Приоритет: ' + getPriorityLabel(task.priority);
    makeEmployeeLink(detailsTaskAssignee, task.assignee);
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

function makeEmployeeLink(element, employeeName, extraHandler) {
    element.textContent = employeeName;
    element.classList.add('employee-link');
    element.onclick = function(event) {
        event.stopPropagation();
        if (extraHandler) {
            extraHandler(event);
        }
        openEmployeeDetails(employeeName);
    };
}

function openEmployeeDetails(employeeName) {
    const employee = employees.find(function(item) {
        return item.name === employeeName;
    });

    if (!employee) {
        return;
    }

    detailsEmployeeName.textContent = employee.name;
    detailsEmployeePosition.textContent = employee.position || 'Не указана';
    detailsEmployeePhone.textContent = employee.phone || 'Не указан';
    detailsEmployeeEmail.textContent = employee.email || 'Не указан';
    detailsEmployeeStatus.textContent = employee.status || 'Не указан';
    detailsEmployeeNote.textContent = employee.note || 'Нет заметки';
    employeeDetailsModal.classList.remove('hidden');
}

function closeEmployeeDetails() {
    employeeDetailsModal.classList.add('hidden');
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
const detailsTaskAssignee = document.querySelector('#details-task-assignee');
const employeeDetailsModal = document.querySelector('#employee-details');
const closeEmployeeDetailsBtn = document.querySelector('#close-employee-details-btn');
const detailsEmployeeName = document.querySelector('#details-employee-name');
const detailsEmployeePosition = document.querySelector('#details-employee-position');
const detailsEmployeePhone = document.querySelector('#details-employee-phone');
const detailsEmployeeEmail = document.querySelector('#details-employee-email');
const detailsEmployeeStatus = document.querySelector('#details-employee-status');
const detailsEmployeeNote = document.querySelector('#details-employee-note');
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
const clientSort = document.querySelector('#client-sort');
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
const globalSearch = document.querySelector('#global-search');
const globalSearchResults = document.querySelector('#global-search-results');
const employeeNameInput = document.querySelector('#employee-name-input');
const employeePositionInput = document.querySelector('#employee-position-input');
const employeePhoneInput = document.querySelector('#employee-phone-input');
const employeeEmailInput = document.querySelector('#employee-email-input');
const employeeRoleInput = document.querySelector('#employee-role-input');
const employeeStatusInput = document.querySelector('#employee-status-input');
const employeeNoteInput = document.querySelector('#employee-note-input');
const addEmployeeBtn = document.querySelector('#add-employee-btn');
const addGeneralTaskBtn = document.querySelector('#add-general-task-btn');
const generalTaskModal = document.querySelector('#general-task-form');
const closeGeneralTaskBtn = document.querySelector('#close-general-task-btn');
const cancelGeneralTaskBtn = document.querySelector('#cancel-general-task-btn');
const saveGeneralTaskBtn = document.querySelector('#save-general-task-btn');
const generalTaskText = document.querySelector('#general-task-text');
const generalTaskDueDate = document.querySelector('#general-task-due-date');
const generalTaskPriority = document.querySelector('#general-task-priority');
const generalTaskAssignee = document.querySelector('#general-task-assignee');
const messageCurrentUser = document.querySelector('#message-current-user');
const messageSearch = document.querySelector('#message-search');
const messageEmployeeList = document.querySelector('#message-employee-list');
const messageChatTitle = document.querySelector('#message-chat-title');
const messageChatSubtitle = document.querySelector('#message-chat-subtitle');
const messageText = document.querySelector('#message-text');
const sendMessageBtn = document.querySelector('#send-message-btn');
const attachMessageFileBtn = document.querySelector('#attach-message-file-btn');
const messageFileInput = document.querySelector('#message-file-input');
const shareMessageItemBtn = document.querySelector('#share-message-item-btn');
const shareMessageModal = document.querySelector('#share-message-modal');
const closeShareMessageBtn = document.querySelector('#close-share-message-btn');
const cancelShareMessageBtn = document.querySelector('#cancel-share-message-btn');
const confirmShareMessageBtn = document.querySelector('#confirm-share-message-btn');
const shareMessageType = document.querySelector('#share-message-type');
const shareMessageItem = document.querySelector('#share-message-item');
const cancelEmployeeEditBtn = document.querySelector('#cancel-employee-edit-btn');
let currentClientIndex = null;
let currentTaskIndex = null;

function closeGlobalSearch() {
    globalSearchResults.classList.add('hidden');
}

function addGlobalSearchResult(results, type, title, subtitle, openResult) {
    results.push({ type: type, title: title, subtitle: subtitle, open: openResult });
}

function renderGlobalSearchResults() {
    const query = globalSearch.value.trim().toLowerCase();
    globalSearchResults.innerHTML = '';
    if (query === '') {
        closeGlobalSearch();
        return;
    }

    const results = [];
    clients.forEach(function(client, clientIndex) {
        const clientText = [client.name, client.company, client.phone, client.email].join(' ').toLowerCase();
        if (clientText.includes(query)) {
            addGlobalSearchResult(results, 'client', client.company || client.name,
                'Клиент · ' + client.name, function() {
                    openClientDetails(clientIndex);
                });
        }
        client.tasks.forEach(function(task, taskIndex) {
            if ((task.text + ' ' + (client.company || client.name)).toLowerCase().includes(query)) {
                addGlobalSearchResult(results, 'task', task.text,
                    'Задача · ' + (client.company || client.name), function() {
                        openClientDetails(clientIndex);
                        openTaskDetails(taskIndex);
                    });
            }
        });
    });
    generalTasks.forEach(function(task, taskIndex) {
        if (task.text.toLowerCase().includes(query)) {
            addGlobalSearchResult(results, 'task', task.text, 'Общая задача', function() {
                alert('Эта задача не привязана к карточке клиента');
            });
        }
    });
    employees.forEach(function(employee) {
        if ([employee.name, employee.position, employee.email].join(' ').toLowerCase().includes(query)) {
            addGlobalSearchResult(results, 'employee', employee.name,
                'Сотрудник · ' + (employee.position || 'Должность не указана'), function() {
                    openEmployeeDetails(employee.name);
                });
        }
    });
    messages.forEach(function(message) {
        if ((message.text + ' ' + message.from + ' ' + message.to).toLowerCase().includes(query)) {
            addGlobalSearchResult(results, 'message', message.text || 'Вложение или запись',
                'Сообщение · ' + message.from + ' → ' + message.to, function() {
                    document.body.dataset.view = 'messages';
                    messageCurrentUser.value = message.from;
                    selectedMessageEmployee = message.to;
                    renderMessageEmployees();
                    renderMessages();
                });
        }
    });

    if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'global-search-empty';
        empty.textContent = 'Ничего не найдено';
        globalSearchResults.appendChild(empty);
    } else {
        results.slice(0, 30).forEach(function(result) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'global-search-result';
            const title = document.createElement('strong');
            title.textContent = result.title;
            const subtitle = document.createElement('span');
            subtitle.textContent = result.subtitle;
            button.append(title, subtitle);
            button.addEventListener('click', function() {
                result.open();
                globalSearch.value = '';
                closeGlobalSearch();
            });
            globalSearchResults.appendChild(button);
        });
    }
    globalSearchResults.classList.remove('hidden');
}

globalSearch.addEventListener('input', renderGlobalSearchResults);
document.addEventListener('click', function(event) {
    if (!event.target.closest('.global-search-wrap')) {
        closeGlobalSearch();
    }
});

function closeGeneralTaskForm() {
    generalTaskModal.classList.add('hidden');
}

addGeneralTaskBtn.addEventListener('click', function() {
    renderEmployeeOptions();
    generalTaskModal.classList.remove('hidden');
    generalTaskText.focus();
});

messageCurrentUser.addEventListener('change', function() {
    renderMessageEmployees();
});
messageSearch.addEventListener('input', renderMessageEmployees);

sendMessageBtn.addEventListener('click', function() {
    const text = messageText.value.trim();

    if (messageCurrentUser.value === '' || selectedMessageEmployee === '') {
        alert('Добавьте сотрудников в разделе «Настройки»');
        return;
    }

    if (text === '') {
        alert('Напишите сообщение');
        messageText.focus();
        return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage
        && lastMessage.from === messageCurrentUser.value
        && lastMessage.to === selectedMessageEmployee
        && lastMessage.text === text
        && Date.now() - new Date(lastMessage.timestamp).getTime() < 5000) {
        alert('Такое сообщение уже было отправлено');
        return;
    }

    messages.push({
        from: messageCurrentUser.value,
        to: selectedMessageEmployee,
        text: text,
        timestamp: new Date().toISOString()
    });
    saveMessages();
    messageText.value = '';
    renderMessages();
    messageText.focus();
});

messageText.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessageBtn.click();
    }
});

function canSendMessage() {
    if (!messageCurrentUser.value || !selectedMessageEmployee) {
        alert('Сначала выберите сотрудника для переписки');
        return false;
    }
    return true;
}

function sendChatMessage(extraData) {
    if (!canSendMessage()) {
        return;
    }
    messages.push(Object.assign({
        from: messageCurrentUser.value,
        to: selectedMessageEmployee,
        text: '',
        timestamp: new Date().toISOString()
    }, extraData));
    saveMessages();
    renderMessages();
}

attachMessageFileBtn.addEventListener('click', function() {
    if (canSendMessage()) {
        messageFileInput.click();
    }
});

messageFileInput.addEventListener('change', function() {
    const file = messageFileInput.files[0];
    if (!file) {
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert('Размер файла не должен превышать 2 МБ');
        messageFileInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
        sendChatMessage({
            attachment: {
                name: file.name,
                type: file.type || 'application/octet-stream',
                data: event.target.result
            }
        });
        messageFileInput.value = '';
    };
    reader.readAsDataURL(file);
});

function renderShareMessageOptions() {
    const selectedType = shareMessageType.value;
    shareMessageItem.innerHTML = '';
    if (selectedType === 'client') {
        clients.forEach(function(client, index) {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = client.company ? client.company + ' — ' + client.name : client.name;
            shareMessageItem.appendChild(option);
        });
    } else {
        clients.forEach(function(client, clientIndex) {
            client.tasks.forEach(function(task, taskIndex) {
                const option = document.createElement('option');
                option.value = clientIndex + ':' + taskIndex;
                option.textContent = task.text + ' — ' + (client.company || client.name);
                shareMessageItem.appendChild(option);
            });
        });
        generalTasks.forEach(function(task, taskIndex) {
            const option = document.createElement('option');
            option.value = 'general:' + taskIndex;
            option.textContent = task.text + ' — без клиента';
            shareMessageItem.appendChild(option);
        });
    }
    confirmShareMessageBtn.disabled = shareMessageItem.options.length === 0;
}

shareMessageItemBtn.addEventListener('click', function() {
    if (!canSendMessage()) {
        return;
    }
    renderShareMessageOptions();
    shareMessageModal.classList.remove('hidden');
});

shareMessageType.addEventListener('change', renderShareMessageOptions);
closeShareMessageBtn.addEventListener('click', function() {
    shareMessageModal.classList.add('hidden');
});
cancelShareMessageBtn.addEventListener('click', function() {
    shareMessageModal.classList.add('hidden');
});
shareMessageModal.addEventListener('click', function(event) {
    if (event.target === shareMessageModal) {
        shareMessageModal.classList.add('hidden');
    }
});

confirmShareMessageBtn.addEventListener('click', function() {
    if (!shareMessageItem.value) {
        return;
    }
    const type = shareMessageType.value;
    let sharedItem;
    if (type === 'client') {
        const client = clients[Number(shareMessageItem.value)];
        sharedItem = { type: 'client', clientIndex: Number(shareMessageItem.value), title: client.company || client.name, subtitle: client.company ? client.name : client.phone };
    } else if (shareMessageItem.value.indexOf('general:') === 0) {
        const task = generalTasks[Number(shareMessageItem.value.replace('general:', ''))];
        sharedItem = { type: 'task', generalIndex: Number(shareMessageItem.value.replace('general:', '')), title: task.text, subtitle: 'Общая задача' };
    } else {
        const indexes = shareMessageItem.value.split(':').map(Number);
        const task = clients[indexes[0]].tasks[indexes[1]];
        const client = clients[indexes[0]];
        sharedItem = { type: 'task', clientIndex: indexes[0], taskIndex: indexes[1], title: task.text, subtitle: client.company || client.name };
    }
    sendChatMessage({ sharedItem: sharedItem });
    shareMessageModal.classList.add('hidden');
});

closeGeneralTaskBtn.addEventListener('click', closeGeneralTaskForm);
cancelGeneralTaskBtn.addEventListener('click', closeGeneralTaskForm);
generalTaskModal.addEventListener('click', function(event) {
    if (event.target === generalTaskModal) closeGeneralTaskForm();
});

saveGeneralTaskBtn.addEventListener('click', function() {
    const text = generalTaskText.value.trim();
    if (text === '') {
        alert('Напиши текст задачи');
        return;
    }
    if (generalTasks.some(function(task) {
        return !task.completed && task.text.trim().toLowerCase() === text.toLowerCase();
    })) {
        alert('Такая открытая общая задача уже существует');
        return;
    }
    generalTasks.push({
        text: text,
        completed: false,
        dueDate: generalTaskDueDate.value,
        priority: generalTaskPriority.value,
        assignee: generalTaskAssignee.value,
        status: 'new',
        interactions: []
    });
    saveGeneralTasks();
    generalTaskText.value = '';
    generalTaskDueDate.value = '';
    generalTaskPriority.value = 'normal';
    generalTaskAssignee.value = 'Не назначен';
    closeGeneralTaskForm();
    renderAllTasks();
});
let editingEmployeeIndex = null;

addEmployeeBtn.addEventListener('click', function() {
    if (!ensureSettingsAccess()) {
        return;
    }
    const employeeName = employeeNameInput.value.trim();

    if (employeeName === '') {
        alert('Введи имя сотрудника');
        return;
    }

    if (employees.some(function(employee, index) {
        return employee.name === employeeName && index !== editingEmployeeIndex;
    })) {
        alert('Такой сотрудник уже есть');
        return;
    }

    const employeeData = {
        name: employeeName,
        position: employeePositionInput.value.trim(),
        phone: employeePhoneInput.value.trim(),
        email: employeeEmailInput.value.trim(),
        role: employeeRoleInput.value,
        status: employeeStatusInput.value,
        note: employeeNoteInput.value.trim()
    };

    if (editingEmployeeIndex === null) {
        employees.push(employeeData);
    } else {
        employees[editingEmployeeIndex] = employeeData;
    }
    saveEmployees();
    resetEmployeeForm();
    renderEmployees();
    renderEmployeeOptions();
    renderMessageEmployees();
    renderCurrentUser();
});

function resetEmployeeForm() {
    employeeNameInput.value = '';
    employeePositionInput.value = '';
    employeePhoneInput.value = '';
    employeeEmailInput.value = '';
    employeeRoleInput.value = 'employee';
    employeeStatusInput.value = 'Активен';
    employeeNoteInput.value = '';
    editingEmployeeIndex = null;
    addEmployeeBtn.textContent = 'Добавить сотрудника';
    cancelEmployeeEditBtn.classList.add('hidden');
}

cancelEmployeeEditBtn.addEventListener('click', resetEmployeeForm);


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
        if (targetName === 'settings' && !ensureSettingsAccess()) {
            return;
        }
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
renderCurrentUser();

document.querySelector('#current-user-select').addEventListener('change', function(event) {
    currentUserName = event.target.value;
    saveCurrentUser();
    renderCurrentUser();
    if (document.body.dataset.view === 'settings' && !isManager()) {
        document.body.dataset.view = 'dashboard';
    }
});

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
clientSort.addEventListener('change', renderClients);
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
renderMessageEmployees();
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

    const duplicateClient = clients.some(function(existingClient, index) {
        if (index === currentClientIndex) {
            return false;
        }
        const samePhone = existingClient.phone.trim() === phone;
        const sameEmail = editClientEmail.value.trim() !== ''
            && existingClient.email.trim().toLowerCase() === editClientEmail.value.trim().toLowerCase();
        return samePhone || sameEmail;
    });
    if (duplicateClient) {
        alert('Клиент с таким телефоном или email уже существует');
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

    if (clients[currentClientIndex].tasks.some(function(task) {
        return !task.completed && task.text.trim().toLowerCase() === taskText.toLowerCase();
    })) {
        alert('Такая открытая задача у этого клиента уже существует');
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

closeEmployeeDetailsBtn.addEventListener('click', closeEmployeeDetails);

employeeDetailsModal.addEventListener('click', function(event) {
    if (event.target === employeeDetailsModal) {
        closeEmployeeDetails();
    }
});

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

    const duplicateTask = clients[currentClientIndex].tasks.some(function(existingTask, index) {
        return index !== currentTaskIndex
            && !existingTask.completed
            && existingTask.text.trim().toLowerCase() === taskText.toLowerCase();
    });
    if (duplicateTask) {
        alert('Такая открытая задача у этого клиента уже существует');
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

function createBackupData() {
    return {
        format: 'crm-local-backup',
        version: DATA_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        clients: clients,
        employees: employees,
        generalTasks: generalTasks,
        messages: messages
    };
}

function downloadBackup(data, fileName) {
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.download = fileName;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
}

function normalizeImportedClients(importedClients) {
    if (!Array.isArray(importedClients)) {
        throw new Error('Список клиентов отсутствует или имеет неверный формат');
    }
    return importedClients.map(function(client) {
        if (!client || typeof client.name !== 'string'
            || typeof client.phone !== 'string' || typeof client.status !== 'string') {
            throw new Error('У каждого клиента должны быть имя, телефон и статус');
        }
        return {
            name: client.name.trim(),
            phone: client.phone.trim(),
            company: typeof client.company === 'string' ? client.company : '',
            email: typeof client.email === 'string' ? client.email : '',
            assignee: typeof client.assignee === 'string' ? client.assignee : 'Не назначен',
            tags: Array.isArray(client.tags) ? client.tags : [],
            history: Array.isArray(client.history) ? client.history : [],
            documents: Array.isArray(client.documents) ? client.documents : [],
            status: client.status,
            tasks: Array.isArray(client.tasks) ? client.tasks.filter(function(task) {
                return task && typeof task.text === 'string';
            }).map(function(task) {
                return {
                    text: task.text,
                    completed: Boolean(task.completed),
                    dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
                    priority: ['low', 'normal', 'high'].includes(task.priority) ? task.priority : 'normal',
                    assignee: typeof task.assignee === 'string' ? task.assignee : 'Не назначен',
                    status: ['new', 'in-progress', 'paused', 'completed'].includes(task.status)
                        ? task.status : (task.completed ? 'completed' : 'new'),
                    interactions: Array.isArray(task.interactions) ? task.interactions : []
                };
            }) : []
        };
    });
}

function normalizeImportedEmployees(importedEmployees) {
    if (!Array.isArray(importedEmployees)) {
        return defaultEmployees.map(function(name) {
            return {
                name: name,
                position: '',
                phone: '',
                email: '',
                status: 'Активен',
                note: '',
                role: name === defaultEmployees[0] ? 'manager' : 'employee'
            };
        });
    }
    return importedEmployees.filter(function(employee) {
        return employee && typeof employee.name === 'string' && employee.name.trim() !== '';
    }).map(function(employee) {
        return {
            name: employee.name.trim(),
            position: typeof employee.position === 'string' ? employee.position : '',
            phone: typeof employee.phone === 'string' ? employee.phone : '',
            email: typeof employee.email === 'string' ? employee.email : '',
            role: employee.role === 'manager' || employee.name === defaultEmployees[0] ? 'manager' : 'employee',
            status: typeof employee.status === 'string' ? employee.status : 'Активен',
            note: typeof employee.note === 'string' ? employee.note : ''
        };
    });
}

// Сохраняем все локальные данные CRM в одном резервном файле.
exportDataBtn.addEventListener('click', function() {
    downloadBackup(createBackupData(), 'crm-backup-' + new Date().toISOString().slice(0, 10) + '.json');
});

// Открываем системное окно выбора файла.
importDataBtn.addEventListener('click', function() {
    importFileInput.click();
});

// Читаем резервную копию и заменяем локальные данные после подтверждения.
importFileInput.addEventListener('change', function() {
    const file = importFileInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            const backup = Array.isArray(importedData) ? { clients: importedData } : importedData;
            const importedClients = normalizeImportedClients(backup.clients);
            const importedEmployees = normalizeImportedEmployees(backup.employees);
            const importedGeneralTasks = Array.isArray(backup.generalTasks) ? backup.generalTasks : [];
            const importedMessages = Array.isArray(backup.messages) ? backup.messages : [];

            if (!confirm('Текущие локальные данные будут заменены данными из файла. Продолжить?')) {
                return;
            }

            clients.length = 0;
            importedClients.forEach(function(client) { clients.push(client); });
            employees = importedEmployees;
            generalTasks = importedGeneralTasks;
            messages = importedMessages;

            saveClients();
            saveEmployees();
            saveGeneralTasks();
            saveMessages();
            renderClients();
            renderEmployeeOptions();
            renderMessageEmployees();
            renderAllTasks();
            alert('Резервная копия успешно восстановлена');
        } catch (error) {
            alert('Не удалось загрузить файл: ' + error.message);
        }

        // Позволяем снова выбрать тот же файл.
        importFileInput.value = '';
    };

    reader.readAsText(file);
});
