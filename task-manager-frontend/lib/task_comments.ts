import api from './api';

export interface TaskComment {
    id: number;
    task_id: number;
    author_id: number;
    content: string;
    created_at: string;
    updated_at: string | null;
    author_name: string | null;
    author_email: string | null;
}

export const listComments = (taskId: number): Promise<TaskComment[]> =>
    api.get(`/api/tasks/${taskId}/comments/`);

export const addComment = (taskId: number, content: string): Promise<TaskComment> =>
    api.post(`/api/tasks/${taskId}/comments/`, { content });

export const editComment = (taskId: number, commentId: number, content: string): Promise<TaskComment> =>
    api.put(`/api/tasks/${taskId}/comments/${commentId}`, { content });

export const deleteComment = (taskId: number, commentId: number): Promise<void> =>
    api.delete(`/api/tasks/${taskId}/comments/${commentId}`);
