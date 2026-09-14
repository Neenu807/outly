import useHealth from "@/shared/hooks/useHealth";
import Spinner from "@/shared/components/Spinner";
import ErrorState from "@/shared/components/ErrorState";

/**
 * Phase 0's vertical slice (ARCHITECTURE §29): live data from `/health`,
 * rendering loading and error states EXPLICITLY.
 *
 * Stop the backend and this renders the error state — not a blank page. That
 * is the whole reason the slice exists.
 */
function ApiStatus() {
  const { data, isPending, isError, error, refetch, isFetching } = useHealth();

  if (isPending) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-8">
        <Spinner label="Checking API status" />
        <span className="text-sm text-slate-500">Checking API status…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Can't reach the API"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
      {[
        { label: "API", value: data.status },
        { label: "Database", value: data.db },
        { label: "Uptime", value: `${data.uptime}s` },
      ].map((item) => (
        <div key={item.label} className="bg-white px-4 py-5 sm:px-6">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {item.label}
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {item.value}
          </dd>
        </div>
      ))}

      <div className="col-span-3 bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-slate-400">
          {isFetching ? "Refreshing…" : "Live from GET /api/v1/health"}
        </p>
      </div>
    </dl>
  );
}

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Welcome to Outly
      </h1>

      <p className="mt-2 text-slate-600">
        Discover activities happening around you.
      </p>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          System status
        </h2>
        <ApiStatus />
      </section>
    </main>
  );
}

export default Home;
