import axios from "axios";

/**
 * The single axios instance (ARCHITECTURE §22, §29).
 *
 * No interceptors yet — the bearer attach and the single-flight 401 refresh
 * arrive with auth in Phase 1. `withCredentials` is on from day one because
 * the refresh token lives in an httpOnly cookie.
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
  withCredentials: true,
});

export default axiosClient;
