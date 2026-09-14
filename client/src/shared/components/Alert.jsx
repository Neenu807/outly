const TONES = {
  info: "border-brand-100 bg-brand-50 text-brand-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

/** Inline message. Errors interrupt a screen reader; everything else waits its turn. */
function Alert({ tone = "info", className = "", children }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone] ?? TONES.info} ${className}`}
    >
      {children}
    </div>
  );
}

export default Alert;
