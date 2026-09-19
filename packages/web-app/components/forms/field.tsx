"use client";
import {
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import "./forms.css";
type Shared = { name: string; label: string; errors?: string[] };
export function Field({
  label,
  errors,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={errors?.length ? `${id}-errors` : undefined}
      />
      <Errors id={id} errors={errors} />
    </div>
  );
}
export function SelectField({
  label,
  errors,
  options,
  ...props
}: Shared &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
  }) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={errors?.length ? `${id}-errors` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Errors id={id} errors={errors} />
    </div>
  );
}
export function TextareaField({
  label,
  errors,
  ...props
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={errors?.length ? `${id}-errors` : undefined}
      />
      <Errors id={id} errors={errors} />
    </div>
  );
}
function Errors({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.length ? (
    <div id={`${id}-errors`} role="alert">
      {errors.map((error, i) => (
        <p key={i}>{error}</p>
      ))}
    </div>
  ) : null;
}
