import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import { useForgotPassword } from "@/shared/hooks/usePasswordReset";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { forgotPasswordSchema } from "@/shared/lib/validators/auth";

function ForgotPasswordPage() {
  const request = useForgotPassword();
  const form = useZodForm(forgotPasswordSchema, { email: "" });

  const submit = form.handleSubmit(({ email }) =>
    request.mutate(email, { onError: form.applyServerErrors }),
  );

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Back to log in
        </Link>
      }
    >
      {request.isSuccess ? (
        // The same words whether or not an account exists, because the API
        // answers identically in both cases (§18).
        <Alert tone="success">
          If an account exists for <span className="font-medium">{form.values.email.trim()}</span>, a
          reset link is on its way. It works once and expires in 1 hour.
        </Alert>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {request.isError && <Alert tone="error">{getErrorMessage(request.error)}</Alert>}

          <Input label="Email" type="email" autoComplete="email" {...form.field("email")} />

          <Button type="submit" size="lg" className="w-full" disabled={request.isPending}>
            {request.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
