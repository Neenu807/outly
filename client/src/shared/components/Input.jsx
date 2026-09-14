import { useId } from "react";

/**
 * Label, control, and a hint or error, wired together for assistive tech:
 * the label is bound to the control and the message is announced with it.
 * Pass `as="textarea"` for multi-line input.
 */
function Input({ label, error, hint, as = "input", className = "", ...props }) {
  const id = useId();
  const messageId = `${id}-message`;
  const Control = as;
  const message = error || hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <Control
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={[
          "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs",
          "placeholder:text-slate-400 focus:outline-2 focus:outline-offset-1",
          error
            ? "border-red-400 focus:outline-red-500"
            : "border-slate-300 focus:outline-brand-500",
        ].join(" ")}
        {...props}
      />

      {message && (
        <p id={messageId} className={`mt-1 text-sm ${error ? "text-red-600" : "text-slate-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Input;
