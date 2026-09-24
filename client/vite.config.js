import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Refuse to start rather than silently moving to the next free port. The
    // API trusts one origin (CORS_ORIGINS), so a client that quietly lands on
    // 5174 has every request rejected — which surfaces in the browser as an
    // opaque CORS error, far from its cause.
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
