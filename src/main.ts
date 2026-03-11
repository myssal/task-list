import { Task, TaskTag, AppSettings } from './types';

let allTasks: Task[] = [];
let settings: AppSettings = { darkMode: false };

let currentSortOrder: 'asc' | 'desc' = 'asc';
let currentSortDate: 'added' | 'modified' = 'added';
let activeFilters: TaskTag[] = ['Highlight', 'Pending', 'On hold', 'Finished'];
let collapsedGroups: Set<TaskTag> = new Set();

const tasksView = document.getElementById('tasks-view')!;
const settingsView = document.getElementById('settings-view')!;
const navTasks = document.getElementById('nav-tasks')!;
const navSettings = document.getElementById('nav-settings')!;

const sortTrigger = document.getElementById('sort-trigger-btn')!;
const sortPopup = document.getElementById('sort-popup')!;
const fabAdd = document.getElementById('fab-add-task')!;
const addIcon = document.getElementById('add-icon') as HTMLImageElement;

const taskAddModal = document.getElementById('task-add-modal')!;
const taskDetailModal = document.getElementById('task-detail-modal')!;

let currentEditingTag: TaskTag = 'Pending';

// API
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        allTasks = data.tasks || [];
        settings = data.settings || { darkMode: false };
        applySettings();
        renderTasks();
    } catch (e) {
        console.error('Load failed', e);
    }
}

async function saveData() {
    await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: allTasks, settings })
    });
}

function applySettings() {
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        addIcon.src = '/resources/dark_mode/add_white.png';
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        addIcon.src = '/resources/light_mode/add_dark.png';
    }
    (document.getElementById('dark-mode-toggle') as HTMLInputElement).checked = settings.darkMode;
}

// Navigation
navTasks.onclick = () => {
    tasksView.style.display = 'block';
    settingsView.style.display = 'none';
    navTasks.classList.add('active');
    navSettings.classList.remove('active');
};

navSettings.onclick = () => {
    tasksView.style.display = 'none';
    settingsView.style.display = 'block';
    navSettings.classList.add('active');
    navTasks.classList.remove('active');
};

// Sort & Filter
sortTrigger.onclick = () => {
    sortPopup.style.display = sortPopup.style.display === 'block' ? 'none' : 'block';
};

document.querySelectorAll('.sort-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const val = btn.getAttribute('data-val');
        if (type === 'order') currentSortOrder = val as any;
        if (type === 'date') currentSortDate = val as any;
        renderTasks();
        updateSortButtons();
    });
});

function updateSortButtons() {
    document.querySelectorAll('.sort-opt').forEach(btn => {
        const type = btn.getAttribute('data-type');
        const val = btn.getAttribute('data-val');
        if ((type === 'order' && val === currentSortOrder) || (type === 'date' && val === currentSortDate)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

document.querySelectorAll('.filter-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag') as TaskTag;
        if (activeFilters.includes(tag)) {
            activeFilters = activeFilters.filter(t => t !== tag);
            btn.classList.remove('active');
        } else {
            activeFilters.push(tag);
            btn.classList.add('active');
        }
        renderTasks();
    });
});

// Rendering
function renderTasks() {
    const groups: Record<TaskTag, Task[]> = {
        'Highlight': [], 'Pending': [], 'On hold': [], 'Finished': []
    };

    allTasks.forEach(task => {
        if (activeFilters.includes(task.tag)) {
            groups[task.tag].push(task);
        }
    });

    Object.keys(groups).forEach(tagStr => {
        const tag = tagStr as TaskTag;
        const container = document.querySelector(`#group-${tag.replace(' ', '\\ ')} .group-content`)!;
        container.innerHTML = '';
        
        const groupEl = document.getElementById(`group-${tag}`)!;
        if (!activeFilters.includes(tag)) {
            groupEl.style.display = 'none';
            return;
        }
        groupEl.style.display = 'block';

        if (collapsedGroups.has(tag)) {
            container.parentElement!.classList.add('collapsed');
            return;
        }

        let tasks = groups[tag];
        tasks.sort((a, b) => {
            const dateA = new Date(currentSortDate === 'added' ? a.dateAdded : a.dateModified).getTime();
            const dateB = new Date(currentSortDate === 'added' ? b.dateAdded : b.dateModified).getTime();
            return currentSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="task-card-header">
                    <h3>${task.name}</h3>
                </div>
                <div class="task-card-body">
                    <span class="tag-label">${task.tag}</span>
                    <button class="detail-btn" data-id="${task.id}">Detail</button>
                </div>
                <div class="task-card-footer">
                    <small>${new Date(task.dateAdded).toLocaleDateString()}</small>
                </div>
            `;
            container.appendChild(card);
        });
    });

    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLButtonElement).dataset.id!;
            showDetail(id);
        });
    });
}

// Group Collapse
document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', () => {
        const tag = header.getAttribute('data-tag') as TaskTag;
        if (collapsedGroups.has(tag)) collapsedGroups.delete(tag);
        else collapsedGroups.add(tag);
        renderTasks();
    });
});

// Task Add/Edit
fabAdd.onclick = () => {
    (document.getElementById('task-name') as HTMLInputElement).value = '';
    (document.getElementById('task-desc') as HTMLTextAreaElement).value = '';
    (document.getElementById('task-deadline') as HTMLInputElement).value = '';
    currentEditingTag = 'Pending';
    updateTagSelector();
    taskAddModal.style.display = 'block';
};

function updateTagSelector() {
    document.querySelectorAll('.tag-opt').forEach(btn => {
        if (btn.getAttribute('data-tag') === currentEditingTag) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

document.querySelectorAll('.tag-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        currentEditingTag = btn.getAttribute('data-tag') as TaskTag;
        updateTagSelector();
    });
});

document.getElementById('save-task-btn')!.onclick = async () => {
    const name = (document.getElementById('task-name') as HTMLInputElement).value;
    const description = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
    const deadline = (document.getElementById('task-deadline') as HTMLInputElement).value;
    
    const newTask: Task = {
        id: Date.now().toString(),
        name,
        description,
        deadline,
        tag: currentEditingTag,
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString()
    };

    allTasks.push(newTask);
    await saveData();
    taskAddModal.style.display = 'none';
    renderTasks();
};

document.getElementById('cancel-task-btn')!.onclick = () => taskAddModal.style.display = 'none';

// Detail
function showDetail(id: string) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('detail-name-date')!.textContent = `${task.name} - ${new Date(task.dateAdded).toLocaleDateString()}`;
    document.getElementById('detail-desc')!.textContent = task.description;
    document.getElementById('detail-tags')!.textContent = `Tag: ${task.tag} | Deadline: ${task.deadline}`;
    
    document.getElementById('delete-task-btn')!.onclick = async () => {
        allTasks = allTasks.filter(t => t.id !== id);
        await saveData();
        taskDetailModal.style.display = 'none';
        renderTasks();
    };

    taskDetailModal.style.display = 'block';
}

document.getElementById('close-detail-btn')!.onclick = () => taskDetailModal.style.display = 'none';

// Dark Mode
document.getElementById('dark-mode-toggle')!.addEventListener('change', (e) => {
    settings.darkMode = (e.target as HTMLInputElement).checked;
    applySettings();
    saveData();
});

updateSortButtons();
loadData();
