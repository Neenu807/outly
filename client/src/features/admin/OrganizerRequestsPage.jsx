import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Alert from "@/shared/components/Alert";
import Button from "@/shared/components/Button";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import Input from "@/shared/components/Input";
import Modal from "@/shared/components/Modal";
import PageLoader from "@/shared/components/PageLoader";
import Pagination from "@/shared/components/Pagination";
import {
  useApproveOrganizer,
  useOrganizerRequests,
  useRejectOrganizer,
} from "@/shared/hooks/useOrganizerRequests";
import useZodForm from "@/shared/hooks/useZodForm";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { rejectReasonSchema } from "@/shared/lib/validators/organizer";
import formatDate from "@/shared/utils/formatDate";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 10;

const EMPTY_COPY = {
  pending: "No requests are waiting for review.",
  approved: "No requests have been approved yet.",
  rejected: "No requests have been rejected.",
};

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

function RejectDialog({ item, onClose }) {
  const reject = useRejectOrganizer();
  const form = useZodForm(rejectReasonSchema, { reason: "" });

  const submit = form.handleSubmit(({ reason }) =>
    reject.mutate(
      { userId: item.userId, reason },
      { onSuccess: onClose, onError: form.applyServerErrors },
    ),
  );

  return (
    <Modal title={`Reject ${item.name}'s request`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">
          They'll receive this reason by email and can apply again after 30 days. Their member
          account isn't affected.
        </p>

        {reject.isError && <Alert tone="error">{getErrorMessage(reject.error)}</Alert>}

        <Input as="textarea" rows={4} label="Reason" {...form.field("reason")} />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={reject.isPending}>
            {reject.isPending ? "Rejecting…" : "Reject request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RequestCard({ item, onReject }) {
  const approve = useApproveOrganizer();
  const pending = item.organizerStatus === "pending";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{item.name}</h2>
          <p className="text-sm break-all text-slate-500">{item.email}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize">
          {item.organizerStatus}
        </span>
      </div>

      {item.request ? (
        <blockquote className="mt-4 border-l-2 border-slate-200 pl-4 text-sm whitespace-pre-line text-slate-700">
          {item.request.message}
        </blockquote>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No request on file.</p>
      )}

      {item.request?.contactLink && (
        <a
          href={item.request.contactLink}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-block text-sm break-all text-brand-700 hover:underline"
        >
          {item.request.contactLink}
        </a>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Detail label="Requested">{formatDate(item.request?.requestedAt)}</Detail>
        <Detail label="Member since">{formatDate(item.accountCreatedAt)}</Detail>
        <Detail label="City">{item.city ?? "—"}</Detail>
        <Detail label="Email">{item.isEmailVerified ? "Verified" : "Not verified"}</Detail>
      </dl>

      {item.interests.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Interests">
          {item.interests.map((interest) => (
            <li key={interest} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {interest}
            </li>
          ))}
        </ul>
      )}

      {item.review?.rejectionReason && (
        <Alert tone={pending ? "info" : "warning"} className="mt-4">
          <span className="font-medium">
            {pending ? "Previously rejected" : "Rejected"} on {formatDate(item.review.reviewedAt)}:
          </span>{" "}
          {item.review.rejectionReason}
        </Alert>
      )}

      {pending && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => approve.mutate({ userId: item.userId })}
            disabled={approve.isPending}
          >
            {approve.isPending ? "Approving…" : "Approve"}
          </Button>
          <Button variant="secondary" onClick={() => onReject(item)}>
            Reject…
          </Button>
        </div>
      )}

      {approve.isError && (
        <Alert tone="error" className="mt-3">
          {getErrorMessage(approve.error)}
        </Alert>
      )}
    </article>
  );
}

function OrganizerRequestsPage() {
  // Filter state lives in the URL (§22), so the queue view is shareable and
  // the back button works.
  const [searchParams, setSearchParams] = useSearchParams();
  const [rejecting, setRejecting] = useState(null);

  const requestedStatus = searchParams.get("status");
  const status = STATUSES.some((s) => s.value === requestedStatus) ? requestedStatus : "pending";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const q = searchParams.get("q") ?? "";

  const requests = useOrganizerRequests({
    status,
    page,
    limit: PAGE_SIZE,
    ...(q ? { q } : {}),
  });

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }

    setSearchParams(next);
  };

  const onSearch = (event) => {
    event.preventDefault();
    updateParams({ q: new FormData(event.currentTarget).get("q").trim(), page: undefined });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organizer requests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Oldest requests first. Approving lets a member publish activities; rejecting never affects
        their member account.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Status">
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => updateParams({ status: option.value, page: undefined })}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                status === option.value
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Uncontrolled and keyed on the URL value, so the URL stays the only copy. */}
        <form onSubmit={onSearch} role="search" className="flex gap-2">
          <label htmlFor="queue-search" className="sr-only">
            Search by name or email
          </label>
          <input
            key={q}
            id="queue-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-2 focus:outline-brand-500"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="mt-6 space-y-4">
        {requests.isPending ? (
          <PageLoader label="Loading requests" />
        ) : requests.isError ? (
          <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
        ) : requests.data.items.length === 0 ? (
          <EmptyState
            title={q ? `Nothing matches “${q}”` : EMPTY_COPY[status]}
            description={q ? "Try a different name or email." : undefined}
            actionLabel={q ? "Clear search" : undefined}
            onAction={q ? () => updateParams({ q: undefined, page: undefined }) : undefined}
          />
        ) : (
          <>
            {requests.data.items.map((item) => (
              <RequestCard key={item.userId} item={item} onReject={setRejecting} />
            ))}

            <Pagination
              page={requests.data.meta.page}
              totalPages={requests.data.meta.totalPages}
              onPageChange={(next) => updateParams({ page: next })}
            />
          </>
        )}
      </div>

      {rejecting && (
        <RejectDialog key={rejecting.userId} item={rejecting} onClose={() => setRejecting(null)} />
      )}
    </main>
  );
}

export default OrganizerRequestsPage;
