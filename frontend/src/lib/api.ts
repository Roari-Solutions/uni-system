import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

// same-origin in dev via the Vite proxy, so the auth cookies stay first-party
const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
	withCredentials: true,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// endpoints that must never trigger a refresh: they define the session themselves
const AUTH_PATHS = ["/auth/login", "/auth/logout", "/auth/refresh"];

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const config = error.config as RetriableConfig | undefined;
		const isAuthPath = AUTH_PATHS.some((path) => config?.url?.startsWith(path));

		// one silent refresh per request; a second 401 means the session is gone
		if (error.response?.status === 401 && config && !config._retried && !isAuthPath) {
			config._retried = true;
			try {
				await api.get("/auth/refresh");
				return await api(config);
			} catch {
				return await Promise.reject(error);
			}
		}

		return Promise.reject(error);
	},
);

export default api;
