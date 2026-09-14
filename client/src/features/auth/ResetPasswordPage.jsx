import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import { useResetPassword } from "@/shared/hooks/usePasswordReset";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { resetPasswordSchema } from "@/shared/lib/validators/auth";
import { clearLinkTokenFromUrl, readLinkToken } from "@/shared/utils/linkToken";

const requestNewLink = (
  <Link to="/forgot-password" className="font-medium underline">
    Request a new link
  </Link>
);

function ResetPasswordPage() {
  // Read once, before the effect below strips it from the address bar.
  const [token] = useState(readLinkToken);
  const reset = useResetPassword();
  const navigate = useNavigate();
  const form = useZodForm(resetPasswordSchema, { password: "", confirmPassword: "" });

  useEffect(clearLinkTokenFromUrl, []);

  const submit = form.handleSubmit(({ password }) =>
    reset.mutate(
      { token, password },
      {
        onSuccess: () =>
          navigate("/login", {
            replace: true,
            state: { notice: "Password updated. You've been signed out everywhere — log in with your new password." },
          }),
        onError: form.applyServerErrors,
      },
    ),
  );

  if (!token) {
    return (
      <AuthLayout title="Reset your password">
        <Alert tone="error">This reset link is incomplete. {requestNewLink}.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="This signs you out on every other device.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {reset.isError && (
          <Alert tone="error">
            {form.errors.token ? (
              <>This link is invalid, already used or expired. {requestNewLink}.</>
            ) : (
              getErrorMessage(reset.error)
            )}
          </Alert>
        )}

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          {...form.field("password")}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          {...form.field("confirmPassword")}
        />

        <Button type="submit" size="lg" className="w-full" disabled={reset.isPending}>
          {reset.isPending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
