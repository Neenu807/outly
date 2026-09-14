import pino from "pino";
import env from "./env.js";

/**
 * Pretty in development, structured JSON everywhere else.
 * Secrets and credentials are redacted at the logger, not at each call site —
 * §16 forbids a key ever reaching a log line.
 */
const logger = pino({
  level: env.isTest ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.apiKey",
    ],
    censor: "[redacted]",
  },
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});

export default logger;
