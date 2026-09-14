import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Alert from "@/shared/components/Alert";
import PageLoader from "@/shared/components/PageLoader";
import useAuth from "@/shared/hooks/useAuth";
import { useVerifyEmail } from "@/shared/hooks/useEmailVerification";
import { clearLinkTokenFromUrl, readLinkToken } from "@/shared/utils/linkToken";

const buttonLink =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700";

/**
 * Landing page for the link in the verification email. Works signed in or out:
 * the token alone identifies the account.
 */
function VerifyEmailPage() {
  const [token] = useState(readLinkToken);
  const { user } = useAuth();
  const { mutate, isSuccess, isError } = useVerifyEmail();
  const started = useRef(false);

  useEffect(() => {
    clearLinkTokenFromUrl();

    // StrictMode runs effects twice in development. The server is idempotent,
    // but one request is still the honest number.
    if (token && !started.current) {
      started.current = true;
      mutate(token);
    }
  }, [token, mutate]);

  if (!token) {
    return (
      <AuthLayout title="Verify your email">
        <Alert tone="error">
          This verification link is incomplete. Open the link from your email again, or request a new
          one from the banner once you're logged in.
        </Alert>
      </AuthLayout>
    );
  }

  if (isError) {
    return (
      <AuthLayout title="That link didn't work">
        <Alert tone="error">
          This verification link is invalid or has expired.{" "}
          {user ? "Use “Resend link” in the banner above to get a new one." : "Log in to request a new one."}
        </Alert>
        {!user && (
          <Link to="/login" className={`mt-6 ${buttonLink}`}>
            Log in
          </Link>
        )}
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Your email is verified">
        <p className="text-sm text-slate-600">
          You can now book activities, leave reviews and apply to become an organizer.
        </p>
        <Link to={user ? "/activities" : "/login"} className={`mt-6 ${buttonLink}`}>
          {user ? "Start exploring" : "Log in"}
        </Link>
      </AuthLayout>
    );
  }

  return <PageLoader label="Confirming your email" />;
}

export default VerifyEmailPage;
