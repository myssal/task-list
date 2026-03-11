export type Status = 'pending' | 'on hold' | 'finished';

export interface Task {
    id: string;
    name: string;
    description: string;
    tags: string[];
    dateCreated: string;
    status: Status;
    highlighted: boolean;
}

export interface AppData {
    tasks: Task[];
    tags: string[];
}
