import Button from "./Button";

/**
 * The empty state (ARCHITECTURE §22) — and it always offers a next action.
 * An empty list with nothing to do next is a dead end, not a state.
 */
function EmptyState({ title, description, actionLabel, onAction, icon = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}

      <h2 className="text-base font-semibold text-slate-900">{title}</h2>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button variant="primary" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
