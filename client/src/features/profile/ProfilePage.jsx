import { useNavigate } from "react-router-dom";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import useAuth from "@/shared/hooks/useAuth";
import useChangePassword from "@/shared/hooks/useChangePassword";
import useUpdateProfile from "@/shared/hooks/useUpdateProfile";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { changePasswordSchema } from "@/shared/lib/validators/auth";
import { profileSchema } from "@/shared/lib/validators/profile";

function ChangePasswordForm() {
  const change = useChangePassword();
  const navigate = useNavigate();
  const form = useZodForm(changePasswordSchema, {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const submit = form.handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () =>
          navigate("/login", {
            replace: true,
            state: {
              notice: "Password changed. You've been signed out everywhere — log in with your new password.",
            },
          }),
        onError: form.applyServerErrors,
      },
    ),
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">Change password</h2>
        <p className="mt-1 text-sm text-slate-600">
          This signs you out everywhere, including here.
        </p>
      </div>

      {change.isError && <Alert tone="error">{getErrorMessage(change.error)}</Alert>}

      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        {...form.field("currentPassword")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          {...form.field("newPassword")}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          {...form.field("confirmPassword")}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={change.isPending}>
          {change.isPending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const form = useZodForm(profileSchema, {
    name: user.name,
    city: user.city ?? "",
    avatarUrl: user.avatarUrl ?? "",
    interests: user.interests.join(", "),
    phone: user.phone ?? "",
    smsOptIn: user.smsOptIn,
  });

  const submit = form.handleSubmit((values) =>
    update.mutate(values, { onError: form.applyServerErrors }),
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        Your city and interests shape which activities we suggest first.
      </p>

      <form
        onSubmit={submit}
        noValidate
        className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        {update.isSuccess && <Alert tone="success">Profile saved.</Alert>}
        {update.isError && <Alert tone="error">{getErrorMessage(update.error)}</Alert>}

        <div>
          <p className="text-sm font-medium text-slate-700">Email</p>
          <p className="mt-1 text-sm text-slate-900">
            {user.email}{" "}
            <span className={user.isEmailVerified ? "text-emerald-700" : "text-amber-700"}>
              · {user.isEmailVerified ? "Verified" : "Not verified"}
            </span>
          </p>
        </div>

        <Input label="Name" autoComplete="name" {...form.field("name")} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="City" autoComplete="address-level2" {...form.field("city")} />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            hint="International format."
            {...form.field("phone")}
          />
        </div>

        <Input
          label="Interests"
          placeholder="pottery, hiking, board-games"
          hint="Comma-separated, up to 15."
          {...form.field("interests")}
        />

        <Input
          label="Avatar URL"
          type="url"
          placeholder="https://"
          {...form.field("avatarUrl")}
        />

        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-slate-300 accent-brand-600"
              {...form.checkbox("smsOptIn")}
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">Text me about my bookings</span>
              <span className="block text-sm text-slate-500">
                Confirmations and cancellations only. Needs a phone number.
              </span>
            </span>
          </label>
          {form.errors.smsOptIn && (
            <p className="mt-1 text-sm text-red-600">{form.errors.smsOptIn}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      <ChangePasswordForm />
    </main>
  );
}

export default ProfilePage;
