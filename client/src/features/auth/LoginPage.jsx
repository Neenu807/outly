import { Link, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import useAuth from "@/shared/hooks/useAuth";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { loginSchema } from "@/shared/lib/validators/auth";

const textLink = "font-medium text-brand-700 hover:underline";

function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const form = useZodForm(loginSchema, { email: "", password: "" });

  // GuestRoute redirects once the session exists, so success needs no handler.
  const submit = form.handleSubmit((values) =>
    login.mutate(values, { onError: form.applyServerErrors }),
  );

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to book and manage your activities."
      footer={
        <>
          New to Outly?{" "}
          <Link to="/register" state={location.state} className={textLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {location.state?.notice && <Alert tone="success">{location.state.notice}</Alert>}
        {login.isError && <Alert tone="error">{getErrorMessage(login.error)}</Alert>}

        <Input label="Email" type="email" autoComplete="email" {...form.field("email")} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          {...form.field("password")}
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className={`text-sm ${textLink}`}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
