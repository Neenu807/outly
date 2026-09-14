import nodemailer from "nodemailer";
import env from "../../config/env.js";
import logger from "../../config/logger.js";

/**
 * The email transport (ARCHITECTURE §16). It knows how to send and nothing
 * else — what to send, and to whom, is notification.service.js's job.
 *
 * Nodemailer speaks SMTP, not HTTP, so it does not go through the shared HTTP
 * client §16 describes; it applies the same policy directly instead: a 10 s
 * timeout, no retry (a send that may already have been delivered is not
 * idempotent), and logs that never carry a body or a credential.
 *
 * Without SMTP configured — local development only; config/env.js refuses to
 * boot production that way — the message is written to the log instead, so the
 * verification link can be copied from the terminal.
 */

const TIMEOUT_MS = 10_000;

let transport;

const isConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_PORT);

const getTransport = () => {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });

  return transport;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    logger.info(
      { to, subject },
      `Email NOT sent — SMTP is not configured. Contents:\n\n${text}\n`,
    );

    return { delivered: false };
  }

  const startedAt = Date.now();

  try {
    await getTransport().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });

    logger.info(
      { host: env.SMTP_HOST, durationMs: Date.now() - startedAt },
      "Email sent",
    );

    return { delivered: true };
  } catch (error) {
    // Code and timing only: a provider's message can echo the recipient.
    logger.warn(
      {
        host: env.SMTP_HOST,
        durationMs: Date.now() - startedAt,
        code: error?.code,
        responseCode: error?.responseCode,
      },
      "Email delivery failed",
    );

    throw error;
  }
};

export { sendEmail };
