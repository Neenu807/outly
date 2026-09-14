import Button from "./Button";
import useAuth from "@/shared/hooks/useAuth";
import { useResendVerification } from "@/shared/hooks/useEmailVerification";
import { getErrorMessage } from "@/shared/lib/errorMessages";

/**
 * Shown to a signed-in member whose email is unverified (§22). It explains
 * what verification unlocks rather than just demanding it, and the banner
 * disappears the moment ['auth','me'] reports the address verified.
 */
function VerificationBanner() {
  const { user } = useAuth();
  const resend = useResendVerification();

  if (!user || user.isEmailVerified) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm text-amber-900 sm:px-6">
        <p>
          Verify your email to book activities, leave reviews and apply to organize. We sent a link
          to <span className="font-medium">{user.email}</span>.
        </p>

        {resend.isSuccess ? (
          <span className="font-medium">Sent — check your inbox.</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-900 hover:bg-amber-100"
            disabled={resend.isPending}
            onClick={() => resend.mutate()}
          >
            {resend.isPending ? "Sending…" : "Resend link"}
          </Button>
        )}

        {resend.isError && <p className="w-full text-amber-800">{getErrorMessage(resend.error)}</p>}
      </div>
    </div>
  );
}

export default VerificationBanner;
