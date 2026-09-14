import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import Input from "@/shared/components/Input";
import PageLoader from "@/shared/components/PageLoader";
import useAuth from "@/shared/hooks/useAuth";
import { useOrganizerRequest, useSubmitOrganizerRequest } from "@/shared/hooks/useOrganizerRequest";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { organizerRequestSchema } from "@/shared/lib/validators/organizer";
import formatDate from "@/shared/utils/formatDate";

function RequestForm({ reapplying }) {
  const submit = useSubmitOrganizerRequest();
  const form = useZodForm(organizerRequestSchema, { message: "", contactLink: "" });

  const onSubmit = form.handleSubmit((values) =>
    submit.mutate(values, { onError: form.applyServerErrors }),
  );

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold text-slate-900">
        {reapplying ? "Apply again" : "Tell us what you'd like to run"}
      </h2>

      {submit.isError && <Alert tone="error">{getErrorMessage(submit.error)}</Alert>}

      <div>
        <Input
          as="textarea"
          rows={5}
          label="What will you run?"
          hint="The kind of activities, where they happen, and how often."
          {...form.field("message")}
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {form.values.message.trim().length} / 500
        </p>
      </div>

      <Input
        label="Link (optional)"
        type="url"
        placeholder="https://"
        hint="A studio page, Instagram or website helps us review your request."
        {...form.field("contactLink")}
      />

      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}

function SubmittedRequest({ request }) {
  if (!request) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        Your request · {formatDate(request.requestedAt)}
      </p>
      <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{request.message}</p>
      {request.contactLink && (
        <p className="mt-2 text-sm break-all text-slate-500">{request.contactLink}</p>
      )}
    </div>
  );
}

function OrganizerRequestPage() {
  const { user } = useAuth();
  const status = useOrganizerRequest();

  if (status.isPending) {
    return <PageLoader label="Loading your organizer status" />;
  }

  if (status.isError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <ErrorState error={status.error} onRetry={() => status.refetch()} />
      </main>
    );
  }

  const request = status.data;

  const content = (() => {
    if (user.role === "admin") {
      return <Alert tone="info">Administrators can already publish activities.</Alert>;
    }

    if (request.organizerStatus === "approved") {
      return (
        <Alert tone="success">
          You're an approved organizer. Tools for creating and publishing activities are on their way.
        </Alert>
      );
    }

    if (request.organizerStatus === "pending") {
      return (
        <>
          <Alert tone="info">
            Your request is under review. We'll email you when there's a decision — you can keep
            browsing and booking in the meantime.
          </Alert>
          <SubmittedRequest request={request.request} />
        </>
      );
    }

    const rejected = request.organizerStatus === "rejected";

    return (
      <div className="space-y-4">
        {rejected && (
          <Alert tone="warning">
            <p>
              <span className="font-medium">Your last request wasn't approved.</span>{" "}
              {request.rejectionReason}
            </p>
            {!request.canApply && request.canReapplyAt && (
              <p className="mt-1">You can apply again from {formatDate(request.canReapplyAt)}.</p>
            )}
          </Alert>
        )}

        {request.canApply &&
          (user.isEmailVerified ? (
            <RequestForm reapplying={rejected} />
          ) : (
            <Alert tone="warning">
              Verify your email before applying — use “Resend link” in the banner above if you need a
              new one.
            </Alert>
          ))}
      </div>
    );
  })();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organize on Outly</h1>
      <p className="mt-1 text-sm text-slate-600">
        Organizers publish activities and welcome the people who book them, so every organizer is
        reviewed by our team first. Your member account is unaffected either way.
      </p>

      <div className="mt-8">{content}</div>
    </main>
  );
}

export default OrganizerRequestPage;
