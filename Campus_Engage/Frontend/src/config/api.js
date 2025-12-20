import axios from 'axios';
import { backendURL } from '../constants.js';

// 1. Create the specific instance
const api = axios.create({
    baseURL: backendURL,
    withCredentials: true // 👈 CRITICAL: Allows sending/receiving cookies
});

// 2. Request Interceptor: Attach Access Token to every outgoing request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor: Handle 401 errors (Token Expiry)
api.interceptors.response.use(
    (response) => response, // If success, just return data
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 (Unauthorized) AND we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Mark as retried to prevent infinite loops

            try {
                // 🛑 Hit the Refresh Endpoint
                // We use raw 'axios' here to avoid using the 'api' interceptors again
                const response = await axios.post(
                    `${backendURL}/api/users/refresh-token`,
                    {}, // Empty body
                    { withCredentials: true } // Must send cookies!
                );

                // 🛑 Extract new token (Matches your ApiResponse structure)
                const newAccessToken = response.data.data.accessToken;

                // 🛑 Save and Retry
                localStorage.setItem('token', newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Retry the original failed request with the new token
                return api(originalRequest);

            } catch (refreshError) {
                // If refresh fails (Refresh Token also expired or invalid), Logout user
                console.error("Session expired. Logging out...", refreshError);
                localStorage.removeItem('token');
                window.location.href = '/login'; // Redirect to login
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;