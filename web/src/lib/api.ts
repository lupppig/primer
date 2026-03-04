import axios from 'axios';

// Create a configured Axios instance
// Base URL is intentionally empty or standard /api to rely on Vite's proxy during dev.
// In production, this would be the fully qualified domain of the backend.
export const api = axios.create({
	baseURL: '/api/v1',
	withCredentials: true, // IMPORTANT: Allows sending HTTP-Only cookies (JWTs) in requests
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request Interceptor: Attach CSRF Token if necessary (Phase 2 extension)
api.interceptors.request.use(
	(config) => {
		// Logic for injecting CSRF tokens or dynamic auth could go here if cookies weren't used
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response Interceptor: Global Error Handling
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// We can universally handle 401 Unauthorized errors here by wiping frontend state
		// and pushing to /login, but React Router's hooks are better suited inside the components.

		// Extract sanitized error message from FastAPI if it exists
		const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
		console.error(`[API Error] ${error.config?.url}:`, message);

		return Promise.reject(error);
	}
);
