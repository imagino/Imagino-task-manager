import api from './api';

export interface Project {
    id: number;
    name: string;
    description: string | null;
    created_by: number;
    created_at: string;
}

export interface CreateProjectData {
    name: string;
    description?: string;
}

export interface UpdateProjectData {
    name?: string;
    description?: string;
}

export const listProjects = (): Promise<Project[]> =>
    api.get('/api/projects/');

export const getProject = (id: number): Promise<Project> =>
    api.get(`/api/projects/${id}`);

export const createProject = (data: CreateProjectData): Promise<Project> =>
    api.post('/api/projects/', data);

export const updateProject = (id: number, data: UpdateProjectData): Promise<Project> =>
    api.put(`/api/projects/${id}`, data);

export const deleteProject = (id: number): Promise<void> =>
    api.delete(`/api/projects/${id}`);
