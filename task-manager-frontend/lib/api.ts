import { getToken, removeToken } from './auth';

// Assuming the API is running on localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface RequestOptions extends RequestInit {
    data?: unknown;
}

const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
    const { data, headers: customHeaders, ...customOptions } = options;
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(customHeaders as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...customOptions,
        headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Only attempt JSON parsing when the server says it's JSON.
        // If the backend is down, Next.js (or a proxy) returns an HTML 404/error
        // page which crashes JSON.parse with the confusing "Unexpected token '<'" error.
        const contentType = response.headers.get('content-type') ?? '';
        const isJson = contentType.includes('application/json');

        const responseData = await response.text();
        const parsedData = isJson && responseData ? JSON.parse(responseData) : null;

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
            }

            // If we didn't get JSON back the backend is likely down or unreachable
            if (!isJson) {
                throw new Error(`Server returned ${response.status} — is the backend running at ${API_BASE_URL}?`);
            }

            const errorMessage = parsedData?.message || parsedData?.detail || 'An error occurred';
            throw new Error(errorMessage);
        }

        return parsedData;
    } catch (error) {
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
            // Network-level failure — backend not reachable at all
            throw new Error(`Cannot reach backend at ${API_BASE_URL}. Please make sure it is running.`);
        }
        throw error;
    }

};

const api = {
    get: (endpoint: string, options?: RequestOptions) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint: string, data: unknown, options?: RequestOptions) => apiRequest(endpoint, { ...options, method: 'POST', data }),
    put: (endpoint: string, data: unknown, options?: RequestOptions) => apiRequest(endpoint, { ...options, method: 'PUT', data }),
    patch: (endpoint: string, data: unknown, options?: RequestOptions) => apiRequest(endpoint, { ...options, method: 'PATCH', data }),
    delete: (endpoint: string, options?: RequestOptions) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
