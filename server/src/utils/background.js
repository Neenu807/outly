import logger from "../config/logger.js";

/**
 * Work that happens after the response is sent — notifications, and the
 * forgot-password lookup (§17, §18). A failure is logged and never reaches the
 * request that triggered it.
 *
 * Pending tasks are tracked so tests (and a graceful shutdown) can wait for
 * them deterministically instead of sleeping and hoping.
 */

const pending = new Set();

const runInBackground = (label, task) => {
  const promise = Promise.resolve()
    .then(task)
    .catch((err) => logger.error({ err, task: label }, "Background task failed"))
    .finally(() => pending.delete(promise));

  pending.add(promise);

  return promise;
};

/** Resolves once every background task — including ones they start — has settled. */
const whenIdle = async () => {
  while (pending.size > 0) {
    await Promise.allSettled([...pending]);
  }
};

export { runInBackground, whenIdle };
