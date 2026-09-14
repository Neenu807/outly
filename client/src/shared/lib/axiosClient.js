import axios from "axios";
import {
  clearAccessToken,
  getAccessToken,
  notifySessionExpired,
  setAccessToken,
} from "./tokenStore";

/**
 * The single axios instance (ARCHITECTURE §22, §29).
 */

const baseURL = import.meta.env.VITE_API_URL;

// Fail loudly, for the same reason config/env.js does on the server. Without
// this, a missing VITE_API_URL leaves baseURL undefined, every request resolves
// against the dev server, and the SPA fallback returns index.html with a 200 —
// which surfaces as "can't reach the server" and sends you hunting for a
// network fault that does not exist.
if (!baseURL) {
  throw new Error(
    "VITE_API_URL is not set. Copy client/.env.example to client/.env. " +
      "Note that Vite inlines VITE_* at BUILD time, so a deployed bundle needs " +
      "it set in the build environment, not at runtime.",
  );
}

const axiosClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  // The refresh token is an httpOnly cookie; without this it is never sent.
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// A 401 from these means "wrong credentials" or "bad link", not "your session
// expired" — refreshing would be wrong, and refreshing the refresh call loops.
const NO_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/**
 * Single-flight: however many requests fail with 401 at once, exactly one
 * refresh runs, and every one of them waits on that same promise.
 */
let refreshInFlight = null;

const refreshAccessToken = () => {
  refreshInFlight ??= axiosClient
    .post("/auth/refresh")
    .then(({ data }) => {
      setAccessToken(data.data.accessToken);
      return data.data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const shouldRefresh =
      config &&
      // The retry flag stops a request that still 401s after a fresh token
      // from looping forever.
      !config._retry &&
      response?.status === 401 &&
      !NO_REFRESH.some((path) => config.url?.startsWith(path));

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await refreshAccessToken();
    } catch {
      clearAccessToken();
      notifySessionExpired();

      return Promise.reject(error);
    }

    // The request interceptor attaches the new token on the way back out.
    return axiosClient(config);
  },
);

export default axiosClient;
