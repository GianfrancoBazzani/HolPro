"use client";
import {
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import "./forms.css";
type Shared = {
  name: string;
  label: string;
  help?: string;
  errors?: string[];
};
// Help text and errors are announced with the control through aria-describedby.
function describedBy(id: string, help?: string, errors?: string[]) {
  const ids = [help && `${id}-help`, errors?.length && `${id}-errors`];
  return ids.filter(Boolean).join(" ") || undefined;
}
function Help({ id, help }: { id: string; help?: string }) {
  return help ? (
    <p id={`${id}-help`} className="form-help">
      {help}
    </p>
  ) : null;
}
export function Field({
  label,
  help,
  errors,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Help id={id} help={help} />
      <input
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help, errors)}
      />
      <Errors id={id} errors={errors} />
    </div>
  );
}
export function SelectField({
  label,
  help,
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
      <Help id={id} help={help} />
      <select
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help, errors)}
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
  help,
  errors,
  ...props
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Help id={id} help={help} />
      <textarea
        {...props}
        id={id}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(id, help, errors)}
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
