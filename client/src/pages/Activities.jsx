import EmptyState from "@/shared/components/EmptyState";

/**
 * Placeholder. The activity feed, filters, sorting and pagination are Phase 2
 * (ARCHITECTURE §24) and will be composed from `features/activities/`.
 */
function Activities() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Activities
      </h1>

      <div className="mt-8">
        <EmptyState
          title="Nothing here yet"
          description="Browsing, search, filters and sorting arrive in Phase 2."
        />
      </div>
    </main>
  );
}

export default Activities;
