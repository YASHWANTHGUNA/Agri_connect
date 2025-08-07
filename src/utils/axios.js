import axios from 'axios';
import config from '../config';
 
const axiosInstance = axios.create({
    baseURL: config.backendUrl,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
 });

// Request interceptor
axiosInstance.interceptors.request.use(
    // With HttpOnly cookies, the browser automatically sends the cookie
    // with each request due to `withCredentials: true`. No need to set the Authorization header.
    (config) => config,
    (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
 
        // If error is not 401 or request has already been retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

         try {
            // Get fresh Firebase token
            const currentUser = window.firebase?.auth()?.currentUser;
            if (!currentUser) {
                throw new Error('No authenticated user');
            }
 
            const firebaseToken = await currentUser.getIdToken(true);
            
            // Get new JWT token
            const response = await axios.post(
                `${config.backendUrl}${config.apiEndpoints.auth}/token`,
                { firebaseToken },
                {
                    headers: {
                        'Authorization': `Firebase ${firebaseToken}`
                    }
                    // The backend is expected to set the new JWT as an HttpOnly cookie.
                }
            );
 
            // Retry original request. The browser will automatically send the new cookie.
            return axiosInstance(originalRequest);
        } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear auth state and redirect to login
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
);

 
export default axiosInstance;
