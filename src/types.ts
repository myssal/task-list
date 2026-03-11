export type TaskTag = 'Highlight' | 'Pending' | 'On hold' | 'Finished';

export interface Task {
    id: string;
    name: string;
    description: string;
    tag: TaskTag;
    dateAdded: string;
    dateModified: string;
    deadline: string;
}

export interface AppSettings {
    darkMode: boolean;
}

export interface AppData {
    tasks: Task[];
    settings: AppSettings;
}
