import { useState } from "react";

/**
 * A small form state helper built on the shared Zod mirrors.
 *
 * Errors are keyed by top-level field. Client-side issues and the server's
 * field-keyed `details` (§20) land in the same place, so a field shows one
 * message whichever side caught the problem.
 */

const byTopLevelField = (entries) => {
  const errors = {};

  for (const [path, message] of entries) {
    const field = String(path).split(".")[0] || "_form";

    errors[field] ??= message;
  }

  return errors;
};

export default function useZodForm(schema, initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const field = (name) => ({
    name,
    value: values[name] ?? "",
    error: errors[name],
    onChange: (event) => setValue(name, event.target.value),
  });

  const checkbox = (name) => ({
    name,
    checked: Boolean(values[name]),
    onChange: (event) => setValue(name, event.target.checked),
  });

  const handleSubmit = (onValid) => (event) => {
    event.preventDefault();

    const result = schema.safeParse(values);

    if (!result.success) {
      setErrors(byTopLevelField(result.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      return;
    }

    setErrors({});
    onValid(result.data);
  };

  const applyServerErrors = (error) => {
    const details = error?.response?.data?.error?.details;

    if (details && typeof details === "object") {
      setErrors(byTopLevelField(Object.entries(details)));
    }
  };

  return { values, errors, field, checkbox, handleSubmit, applyServerErrors };
}
