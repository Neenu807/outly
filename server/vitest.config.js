import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    // Suites share one in-memory MongoDB instance per file; running files in
    // parallel against the same connection is how a suite becomes flaky.
    fileParallelism: false,
    testTimeout: 30000,
    // Set before any module is imported, so config/env.js parses these rather
    // than whatever happens to be in .env. MONGODB_URI is replaced at runtime
    // by mongodb-memory-server in tests/setup.js.
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/outly-test",
      JWT_ACCESS_SECRET: "test-access-secret-that-is-long-enough-32",
      JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough-32",
      CLIENT_URL: "http://localhost:5173",
      LOG_LEVEL: "silent",
    },
  },
});
