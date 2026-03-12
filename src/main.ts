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
let tempSubTasks: any[] = [];

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
    addIcon.src = '/resources/images/dark_mode/add_dark.png';
}

// Navigation
navTasks.onclick = () => {
    tasksView.style.display = 'block';
    settingsView.style.display = 'none';
    navTasks.classList.add('active');
    navSettings.classList.remove('active');
    fabAdd.style.display = 'flex';
};

navSettings.onclick = () => {
    tasksView.style.display = 'none';
    settingsView.style.display = 'block';
    navSettings.classList.add('active');
    navTasks.classList.remove('active');
    fabAdd.style.display = 'none';
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
            groupEl.classList.add('collapsed');
        } else {
            groupEl.classList.remove('collapsed');
        }

        if (collapsedGroups.has(tag)) {
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
            const subCount = (task.subTasks || []).length;
            const subLabel = subCount < 2 ? 'subtask' : 'subtasks';
            card.innerHTML = `
                <div class="task-card-header">
                    <h3>${task.name} <span class="subtask-count">${subCount} ${subLabel}</span></h3>
                    <div class="task-card-meta">
                        <span class="tag-label" data-tag="${task.tag}">${task.tag}</span>
                        <button class="detail-btn" data-id="${task.id}">Detail</button>
                    </div>
                </div>
                <div class="task-card-date">
                    ${new Date(task.dateAdded).toLocaleDateString()}
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
    tempSubTasks = [];
    renderTempSubTasks();
    updateTagSelector();
    taskAddModal.style.display = 'block';
};

const subtaskFormAddModal = document.getElementById('subtask-form-add-modal')!;
const confirmSubtaskBtnAddModal = document.getElementById('confirm-subtask-btn-add-modal')!;

confirmSubtaskBtnAddModal.onclick = () => {
    const name = (document.getElementById('subtask-name-add-modal') as HTMLInputElement).value;
    const desc = (document.getElementById('subtask-desc-add-modal') as HTMLInputElement).value;
    if (!name) return;

    tempSubTasks.push({
        id: Date.now().toString(),
        name,
        description: desc,
        status: 'Pending'
    });

    (document.getElementById('subtask-name-add-modal') as HTMLInputElement).value = '';
    (document.getElementById('subtask-desc-add-modal') as HTMLInputElement).value = '';
    subtaskFormAddModal.style.display = 'none';
    renderTempSubTasks();
};

function renderTempSubTasks() {
    const list = document.getElementById('subtask-list-add-modal')!;
    list.innerHTML = '';
    tempSubTasks.forEach((sub, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sub.name}</td>
            <td>${sub.description}</td>
            <td><button class="del-temp-sub-btn" data-index="${index}">Delete</button></td>
        `;
        list.appendChild(row);
    });

    document.querySelectorAll('.del-temp-sub-btn').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt((e.target as HTMLButtonElement).dataset.index!);
            tempSubTasks.splice(index, 1);
            renderTempSubTasks();
        };
    });
}

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
        dateModified: new Date().toISOString(),
        subTasks: tempSubTasks
    };

    allTasks.push(newTask);
    await saveData();
    taskAddModal.style.display = 'none';
    renderTasks();
};

document.getElementById('cancel-task-btn')!.onclick = () => {
    if (checkUnsavedAdd()) {
        if (confirm('You have unsaved data. Are you sure you want to close?')) {
            taskAddModal.style.display = 'none';
        }
    } else {
        taskAddModal.style.display = 'none';
    }
};

function checkUnsavedAdd() {
    const name = (document.getElementById('task-name') as HTMLInputElement).value;
    const desc = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
    const deadline = (document.getElementById('task-deadline') as HTMLInputElement).value;
    return name || desc || deadline;
}

function checkUnsavedDetail() {
    const subName = (document.getElementById('subtask-name') as HTMLInputElement).value;
    const subDesc = (document.getElementById('subtask-desc') as HTMLInputElement).value;
    return subName || subDesc;
}

function closeDetail() {
    if (checkUnsavedDetail()) {
        if (confirm('You have unsaved sub-task data. Are you sure you want to close?')) {
            taskDetailModal.style.display = 'none';
        }
    } else {
        taskDetailModal.style.display = 'none';
    }
}

// Detail
function showDetail(id: string) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('detail-name')!.textContent = task.name;
    const detailTag = document.getElementById('detail-tag')!;
    detailTag.textContent = task.tag;
    detailTag.setAttribute('data-tag', task.tag);
    document.getElementById('detail-added')!.textContent = new Date(task.dateAdded).toLocaleDateString();
    document.getElementById('detail-deadline')!.textContent = task.deadline || 'None';

    // Double-click to edit
    const detailName = document.getElementById('detail-name')!;
    detailName.ondblclick = () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.name;
        input.className = 'edit-inline-input';
        detailName.innerHTML = '';
        detailName.appendChild(input);
        input.focus();
        input.onclick = (e) => e.stopPropagation();

        const save = async () => {
            if (input.value.trim()) {
                task.name = input.value.trim();
                task.dateModified = new Date().toISOString();
                await saveData();
                renderTasks();
            }
            detailName.textContent = task.name;
        };

        input.onblur = save;
        input.onkeydown = (e) => { if (e.key === 'Enter') save(); };
    };

    detailTag.ondblclick = () => {
        const select = document.createElement('select');
        select.className = 'edit-inline-select';
        ['Highlight', 'Pending', 'On hold', 'Finished'].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (t === task.tag) opt.selected = true;
            select.appendChild(opt);
        });
        detailTag.innerHTML = '';
        detailTag.appendChild(select);
        select.focus();
        select.onclick = (e) => e.stopPropagation();

        const save = async () => {
            task.tag = select.value as TaskTag;
            task.dateModified = new Date().toISOString();
            await saveData();
            renderTasks();
            detailTag.textContent = task.tag;
            detailTag.setAttribute('data-tag', task.tag);
        };

        select.onblur = save;
        select.onchange = save;
    };

    const detailDeadline = document.getElementById('detail-deadline')!;
    detailDeadline.ondblclick = () => {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = task.deadline || '';
        input.className = 'edit-inline-input';
        detailDeadline.innerHTML = '';
        detailDeadline.appendChild(input);
        input.focus();
        input.onclick = (e) => e.stopPropagation();

        const save = async () => {
            task.deadline = input.value;
            task.dateModified = new Date().toISOString();
            await saveData();
            renderTasks();
            detailDeadline.textContent = task.deadline || 'None';
        };

        input.onblur = save;
        input.onkeydown = (e) => { if (e.key === 'Enter') save(); };
    };
    
    // Clear subtask inputs
    (document.getElementById('subtask-name') as HTMLInputElement).value = '';
    (document.getElementById('subtask-desc') as HTMLInputElement).value = '';

    renderSubTasks(task);

    document.getElementById('add-subtask-btn')!.onclick = async () => {
        const subName = (document.getElementById('subtask-name') as HTMLInputElement).value;
        const subDesc = (document.getElementById('subtask-desc') as HTMLInputElement).value;
        if (!subName) return;

        if (!task.subTasks) task.subTasks = [];
        task.subTasks.push({
            id: Date.now().toString(),
            name: subName,
            description: subDesc,
            status: 'Pending'
        });
        
        (document.getElementById('subtask-name') as HTMLInputElement).value = '';
        (document.getElementById('subtask-desc') as HTMLInputElement).value = '';
        
        await saveData();
        renderSubTasks(task);
        renderTasks();
    };

    document.getElementById('delete-task-btn')!.onclick = async () => {
        if (confirm('Are you sure you want to delete this task?')) {
            allTasks = allTasks.filter(t => t.id !== id);
            await saveData();
            taskDetailModal.style.display = 'none';
            renderTasks();
        }
    };

    taskDetailModal.style.display = 'block';
}

function renderSubTasks(task: Task) {
    const container = document.getElementById('subtask-list')!;
    container.innerHTML = '';
    
    if (!task.subTasks) task.subTasks = [];

    task.subTasks.forEach(sub => {
        const row = document.createElement('tr');
        row.setAttribute('data-sub-id', sub.id);
        row.innerHTML = `
            <td class="sub-name">${sub.name}</td>
            <td class="sub-desc">${sub.description}</td>
            <td><button class="toggle-sub-btn" data-sub-id="${sub.id}">${sub.status}</button></td>
            <td>
                <button class="edit-sub-btn" data-sub-id="${sub.id}">Update</button>
                <button class="del-sub-btn" data-sub-id="${sub.id}">Delete</button>
            </td>
        `;
        container.appendChild(row);
    });

    document.querySelectorAll('.toggle-sub-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const subId = (e.target as HTMLButtonElement).dataset.subId!;
            const sub = task.subTasks.find(s => s.id === subId);
            if (sub) {
                sub.status = sub.status === 'Pending' ? 'Finished' : 'Pending';
                await saveData();
                renderSubTasks(task);
            }
        });
    });

    document.querySelectorAll('.edit-sub-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subId = (e.target as HTMLButtonElement).dataset.subId!;
            const row = (e.target as HTMLElement).closest('tr')!;
            const nameTd = row.querySelector('.sub-name')!;
            const descTd = row.querySelector('.sub-desc')!;
            
            if (row.classList.contains('editing')) return;
            row.classList.add('editing');

            const nameVal = nameTd.textContent!;
            const descVal = descTd.textContent!;

            nameTd.innerHTML = `<input type="text" class="edit-name-input" value="${nameVal}">`;
            descTd.innerHTML = `<input type="text" class="edit-desc-input" value="${descVal}">`;

            const nameInput = nameTd.querySelector('input')!;
            const descInput = descTd.querySelector('input')!;

            const saveEdit = async () => {
                const sub = task.subTasks.find(s => s.id === subId);
                if (sub) {
                    sub.name = nameInput.value;
                    sub.description = descInput.value;
                    await saveData();
                }
                renderSubTasks(task);
            };

            const handleOutsideClick = (event: MouseEvent) => {
                if (!row.contains(event.target as Node)) {
                    saveEdit();
                    document.removeEventListener('mousedown', handleOutsideClick);
                }
            };

            // Delay adding the listener to avoid immediate trigger from the edit button click
            setTimeout(() => {
                document.addEventListener('mousedown', handleOutsideClick);
            }, 0);

            // Also save on Enter key
            const handleEnter = (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                    saveEdit();
                    document.removeEventListener('mousedown', handleOutsideClick);
                }
            };
            nameInput.addEventListener('keypress', handleEnter);
            descInput.addEventListener('keypress', handleEnter);
            
            nameInput.focus();
        });
    });

    document.querySelectorAll('.del-sub-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Delete sub-task?')) {
                const subId = (e.target as HTMLButtonElement).dataset.subId!;
                task.subTasks = task.subTasks.filter(s => s.id !== subId);
                await saveData();
                renderSubTasks(task);
                renderTasks();
            }
        });
    });
}

document.getElementById('close-detail-btn')!.onclick = () => closeDetail();

// Click outside modals to close
window.onclick = (event) => {
    if (event.target === taskAddModal) {
        if (checkUnsavedAdd()) {
            if (confirm('You have unsaved data. Are you sure you want to close?')) {
                taskAddModal.style.display = 'none';
            }
        } else {
            taskAddModal.style.display = 'none';
        }
    } else if (event.target === taskDetailModal) {
        closeDetail();
    }
};

// Settings view update
updateSortButtons();
loadData().then(() => {
    applySettings();
});
