import Button from "./Button";
import { getErrorMessage } from "@/shared/lib/errorMessages";

/**
 * The error state (ARCHITECTURE §22), with a retry wired to `refetch`.
 *
 * Copy is resolved through errorMessages.js so a raw server message or bare
 * error code never reaches a user.
 */
function ErrorState({ error, onRetry, title = "That didn't work" }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <h2 className="text-base font-semibold text-red-900">{title}</h2>

      <p className="mt-1 max-w-sm text-sm text-red-700">
        {getErrorMessage(error)}
      </p>

      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
