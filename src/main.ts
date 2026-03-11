import { Task, Status } from './types';

let allTasks: Task[] = [];
let allTags: string[] = [];
let currentEditingTags: string[] = [];

const taskList = document.getElementById('task-list')!;
const addTaskBtn = document.getElementById('add-task-btn')!;
const modal = document.getElementById('task-modal')!;
const closeBtn = document.querySelector('.close')!;
const taskForm = document.getElementById('task-form') as HTMLFormElement;
const tagInput = document.getElementById('new-tag-input') as HTMLInputElement;
const addTagBtnInner = document.getElementById('add-tag-btn-inner')!;
const currentTagsContainer = document.getElementById('current-tags')!;
const existingTagsList = document.getElementById('existing-tags-list')!;
const tagsListManager = document.getElementById('tags-list')!;

// API calls
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        allTasks = data.tasks || [];
        allTags = data.tags || [];
        renderTasks();
        renderTagsManager();
        updateDatalist();
    } catch (e) {
        console.error('Failed to load data', e);
    }
}

async function saveData() {
    try {
        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: allTasks, tags: allTags })
        });
    } catch (e) {
        console.error('Failed to save data', e);
    }
}

function renderTasks() {
    taskList.innerHTML = '';
    // Sort: highlighted first, then by date
    const sortedTasks = [...allTasks].sort((a, b) => {
        if (a.highlighted && !b.highlighted) return -1;
        if (!a.highlighted && b.highlighted) return 1;
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
    });

    sortedTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.status.replace(' ', '-')} ${task.highlighted ? 'highlighted' : ''}`;
        card.innerHTML = `
            <div class="task-header">
                <h3>${task.name}</h3>
                <div class="actions">
                    <button class="edit-btn" data-id="${task.id}">Edit</button>
                    <button class="delete-btn" data-id="${task.id}">Delete</button>
                </div>
            </div>
            <p>${task.description}</p>
            <div class="task-tags">
                ${task.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
            <div class="task-footer">
                <small>Created: ${new Date(task.dateCreated).toLocaleString()}</small>
                <select class="status-select" data-id="${task.id}">
                    <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="on hold" ${task.status === 'on hold' ? 'selected' : ''}>On Hold</option>
                    <option value="finished" ${task.status === 'finished' ? 'selected' : ''}>Finished</option>
                </select>
            </div>
        `;
        taskList.appendChild(card);
    });

    // Add event listeners to buttons and selects
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLButtonElement).dataset.id!;
            openEditModal(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.target as HTMLButtonElement).dataset.id!;
            deleteTask(id);
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = (e.target as HTMLSelectElement).dataset.id!;
            const status = (e.target as HTMLSelectElement).value as Status;
            updateTaskStatus(id, status);
        });
    });
}

function renderTagsManager() {
    tagsListManager.innerHTML = '';
    allTags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `
            <span>${tag}</span>
            <div class="tag-actions">
                <button class="rename-tag-btn" data-tag="${tag}">Rename</button>
                <button class="delete-tag-btn" data-tag="${tag}">x</button>
            </div>
        `;
        tagsListManager.appendChild(tagEl);
    });

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = (e.target as HTMLButtonElement).dataset.tag!;
            deleteTag(tag);
        });
    });

    document.querySelectorAll('.rename-tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = (e.target as HTMLButtonElement).dataset.tag!;
            renameTag(tag);
        });
    });
}

async function renameTag(oldTag: string) {
    const newTag = prompt(`Rename tag "${oldTag}" to:`, oldTag);
    if (newTag && newTag.trim() !== '' && newTag !== oldTag) {
        const trimmedNewTag = newTag.trim();
        if (allTags.includes(trimmedNewTag)) {
            alert('Tag already exists!');
            return;
        }
        allTags = allTags.map(t => t === oldTag ? trimmedNewTag : t);
        allTasks.forEach(task => {
            task.tags = task.tags.map(t => t === oldTag ? trimmedNewTag : t);
        });
        await saveData();
        renderTasks();
        renderTagsManager();
        updateDatalist();
    }
}

function updateDatalist() {
    existingTagsList.innerHTML = '';
    allTags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        existingTagsList.appendChild(opt);
    });
}

function openEditModal(id?: string) {
    const task = id ? allTasks.find(t => t.id === id) : null;
    const modalTitle = document.getElementById('modal-title')!;
    const taskIdInput = document.getElementById('task-id') as HTMLInputElement;
    const nameInput = document.getElementById('task-name') as HTMLInputElement;
    const descInput = document.getElementById('task-desc') as HTMLTextAreaElement;
    const statusSelect = document.getElementById('task-status') as HTMLSelectElement;
    const highlightCheck = document.getElementById('task-highlight') as HTMLInputElement;

    if (task) {
        modalTitle.textContent = 'Edit Task';
        taskIdInput.value = task.id;
        nameInput.value = task.name;
        descInput.value = task.description;
        statusSelect.value = task.status;
        highlightCheck.checked = task.highlighted;
        currentEditingTags = [...task.tags];
    } else {
        modalTitle.textContent = 'Add New Task';
        taskForm.reset();
        taskIdInput.value = '';
        currentEditingTags = [];
    }
    renderCurrentEditingTags();
    modal.style.display = 'block';
}

function renderCurrentEditingTags() {
    currentTagsContainer.innerHTML = '';
    currentEditingTags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `${tag} <button type="button" data-tag="${tag}">&times;</button>`;
        currentTagsContainer.appendChild(badge);
        badge.querySelector('button')!.addEventListener('click', () => {
            currentEditingTags = currentEditingTags.filter(t => t !== tag);
            renderCurrentEditingTags();
        });
    });
}

addTaskBtn.onclick = () => openEditModal();
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

addTagBtnInner.onclick = () => {
    const tag = tagInput.value.trim();
    if (tag && !currentEditingTags.includes(tag)) {
        currentEditingTags.push(tag);
        if (!allTags.includes(tag)) {
            allTags.push(tag);
            saveData();
            updateDatalist();
            renderTagsManager();
        }
        tagInput.value = '';
        renderCurrentEditingTags();
    }
};

taskForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = (document.getElementById('task-id') as HTMLInputElement).value;
    const name = (document.getElementById('task-name') as HTMLInputElement).value;
    const description = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
    const status = (document.getElementById('task-status') as HTMLSelectElement).value as Status;
    const highlighted = (document.getElementById('task-highlight') as HTMLInputElement).checked;

    if (id) {
        const index = allTasks.findIndex(t => t.id === id);
        allTasks[index] = { ...allTasks[index], name, description, status, highlighted, tags: [...currentEditingTags] };
    } else {
        const newTask: Task = {
            id: Date.now().toString(),
            name,
            description,
            status,
            highlighted,
            tags: [...currentEditingTags],
            dateCreated: new Date().toISOString()
        };
        allTasks.push(newTask);
    }

    await saveData();
    modal.style.display = 'none';
    renderTasks();
};

async function deleteTask(id: string) {
    if (confirm('Are you sure?')) {
        allTasks = allTasks.filter(t => t.id !== id);
        await saveData();
        renderTasks();
    }
}

async function updateTaskStatus(id: string, status: Status) {
    const task = allTasks.find(t => t.id === id);
    if (task) {
        task.status = status;
        await saveData();
        renderTasks();
    }
}

async function deleteTag(tag: string) {
    if (confirm(`Delete tag "${tag}" and remove it from all tasks?`)) {
        allTags = allTags.filter(t => t !== tag);
        allTasks.forEach(task => {
            task.tags = task.tags.filter(t => t !== tag);
        });
        await saveData();
        renderTasks();
        renderTagsManager();
        updateDatalist();
    }
}

loadData();
