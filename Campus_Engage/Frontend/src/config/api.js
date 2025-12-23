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
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        // 🛑 FIX: Check if the failed request was for Login or Register
        // If yes, we reject immediately. We don't want to refresh tokens for a login attempt.
        if (originalRequest.url.includes("/login") || originalRequest.url.includes("/register")) {
            return Promise.reject(error);
        }
        // IF 401 (Unauthorized) AND we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // ✅ 1. Use RAW axios (Not 'api')
                // This prevents an infinite loop if the refresh endpoint itself fails.
                // We must include { withCredentials: true } so the cookie is sent!
                await axios.post("http://localhost:8000/api/users/refresh-token", {}, {
                    withCredentials: true
                });

                // 🛑 NO extraction needed (Token is in httpOnly cookie)
                // 🛑 NO localStorage.setItem needed
                // 🛑 NO header setting needed

                // ✅ 2. Retry the original request
                // The browser has ALREADY updated the cookie jar. 
                // When we call api(), it automatically grabs the new cookie.
                return api(originalRequest);

            } catch (refreshError) {
                // ❌ REFRESH FAILED
                console.log("Session expired.\n", refreshError);

                // Cleanup local storage just in case you use it for other things
                localStorage.removeItem('token');

                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;