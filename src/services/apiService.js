import { authService } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Get headers with authentication
    async getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth) {
            try {
                const token = await authService.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error('Error getting auth token:', error);
                // Don't throw here, let the request fail naturally if needed
            }
        }

        return headers;
    }

    // Handle API response
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'An error occurred');
        }
        return response.json();
    }

    // GET request
    async get(endpoint, includeAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: await this.getHeaders(includeAuth),
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('GET request error:', error);
            throw error;
        }
    }

    // POST request
    async post(endpoint, data, includeAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: await this.getHeaders(includeAuth),
                body: JSON.stringify(data),
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('POST request error:', error);
            throw error;
        }
    }

    // PUT request
    async put(endpoint, data, includeAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: await this.getHeaders(includeAuth),
                body: JSON.stringify(data),
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('PUT request error:', error);
            throw error;
        }
    }

    // DELETE request
    async delete(endpoint, includeAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: await this.getHeaders(includeAuth),
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('DELETE request error:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
export default apiService; 