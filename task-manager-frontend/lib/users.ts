import api from './api';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
}

export interface ChangePasswordData {
    current_password: string;
    new_password: string;
}

export interface RegisterUserData {
    name: string;
    email: string;
    password: string;
}

// Own profile
export const getMyProfile = (): Promise<User> => api.get('/api/users/me');

export const updateMyProfile = (data: UpdateProfileData): Promise<User> =>
    api.put('/api/users/me', data);

export const changeMyPassword = (data: ChangePasswordData): Promise<void> =>
    api.put('/api/users/me/password', data);

// Admin — user management
export const listUsers = (): Promise<User[]> => api.get('/api/users/');

export const getUserById = (id: number): Promise<User> => api.get(`/api/users/${id}`);

export const registerUser = (data: RegisterUserData): Promise<User> =>
    api.post('/api/auth/register', data);

export const deactivateUser = (id: number): Promise<User> =>
    api.put(`/api/users/${id}/deactivate`, {});

export const activateUser = (id: number): Promise<User> =>
    api.put(`/api/users/${id}/activate`, {});
