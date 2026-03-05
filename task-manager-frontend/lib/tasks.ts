import api from './api';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export interface Task {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    assigned_to: number | null;
    project_id: number | null;
    created_by: number;
    created_at: string;
    updated_at: string | null;
    assigned_to_name: string | null;
    created_by_name: string | null;
    project_name: string | null;
}

export interface CreateTaskData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
    assigned_to?: number | null;
    project_id?: number | null;
}

export interface UpdateTaskData {
    title?: string;
    description?: string;
    due_date?: string | null;
    assigned_to?: number | null;
    project_id?: number | null;
}

export interface TaskFilters {
    project_id?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_to?: number;
}

export const listTasks = (filters: TaskFilters = {}): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters.project_id) params.set('project_id', String(filters.project_id));
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.assigned_to) params.set('assigned_to', String(filters.assigned_to));
    const qs = params.toString();
    return api.get(`/api/tasks/${qs ? '?' + qs : ''}`);
};

export const getTask = (id: number): Promise<Task> => api.get(`/api/tasks/${id}`);

export const createTask = (data: CreateTaskData): Promise<Task> =>
    api.post('/api/tasks/', data);

export const updateTask = (id: number, data: UpdateTaskData): Promise<Task> =>
    api.put(`/api/tasks/${id}`, data);

export const changeStatus = (id: number, status: TaskStatus): Promise<Task> =>
    api.patch(`/api/tasks/${id}/status`, { status });

export const changePriority = (id: number, priority: TaskPriority): Promise<Task> =>
    api.patch(`/api/tasks/${id}/priority`, { priority });

export const assignTask = (id: number, user_id: number | null): Promise<Task> =>
    api.patch(`/api/tasks/${id}/assign`, { assigned_to: user_id });


export const deleteTask = (id: number): Promise<void> => api.delete(`/api/tasks/${id}`);
