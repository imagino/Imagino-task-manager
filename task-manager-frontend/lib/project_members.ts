import api from './api';

export interface ProjectMember {
    id: number;
    project_id: number;
    user_id: number;
    role: 'viewer' | 'editor' | 'admin';
    joined_at: string;
    user_name: string | null;
    user_email: string | null;
}

export const ROLES = ['viewer', 'editor', 'admin'] as const;
export type MemberRole = typeof ROLES[number];

export const listMembers = (projectId: number): Promise<ProjectMember[]> =>
    api.get(`/api/projects/${projectId}/members/`);

export const addMember = (projectId: number, userId: number, role: MemberRole): Promise<ProjectMember> =>
    api.post(`/api/projects/${projectId}/members/`, { user_id: userId, role });

export const updateMemberRole = (projectId: number, userId: number, role: MemberRole): Promise<ProjectMember> =>
    api.put(`/api/projects/${projectId}/members/${userId}`, { role });

export const removeMember = (projectId: number, userId: number): Promise<void> =>
    api.delete(`/api/projects/${projectId}/members/${userId}`);
