export type TaskTag = 'Highlight' | 'Pending' | 'On hold' | 'Finished';

export interface SubTask {
    id: string;
    name: string;
    description: string;
    status: 'Pending' | 'Finished';
}

export interface Task {
    id: string;
    name: string;
    description: string;
    tag: TaskTag;
    dateAdded: string;
    dateModified: string;
    deadline: string;
    subTasks: SubTask[];
}

export interface AppSettings {
    // Other settings if any
}

export interface AppData {
    tasks: Task[];
    settings: AppSettings;
}
