const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-10 border-[3px]",
};

/**
 * One of the four states every data view owes (ARCHITECTURE §22).
 * `label` is announced to screen readers; the ring itself is decorative.
 */
function Spinner({ size = "md", label = "Loading", className = "" }) {
  return (
    <span role="status" aria-live="polite" className={`inline-flex ${className}`}>
      <span
        className={[
          "animate-spin rounded-full border-slate-200 border-t-brand-600",
          SIZES[size] ?? SIZES.md,
        ].join(" ")}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default Spinner;
