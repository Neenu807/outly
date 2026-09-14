import { Link, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import useAuth from "@/shared/hooks/useAuth";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { registerSchema } from "@/shared/lib/validators/auth";

function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const form = useZodForm(registerSchema, { name: "", email: "", password: "" });

  const submit = form.handleSubmit((values) =>
    register.mutate(values, { onError: form.applyServerErrors }),
  );

  return (
    <AuthLayout
      title="Find something to do"
      subtitle="Create an account to browse now. Verify your email when you're ready to book."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {register.isError && <Alert tone="error">{getErrorMessage(register.error)}</Alert>}

        <Input label="Name" autoComplete="name" {...form.field("name")} />
        <Input label="Email" type="email" autoComplete="email" {...form.field("email")} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          {...form.field("password")}
        />

        <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
          {register.isPending ? "Creating your account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
