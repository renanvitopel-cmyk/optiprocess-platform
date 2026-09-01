import { forwardRef, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface WrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({ label, hint, error, required, children, className }: WrapperProps) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label">
          {label} {required && <span className="text-safety-red">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<WrapperProps, "children">;

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <input ref={ref} className={`input ${error ? "input-error" : ""}`} {...rest} />
    </FieldWrapper>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<WrapperProps, "children">;

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaProps>(function TextareaInput(
  { label, hint, error, required, className, rows = 4, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <textarea ref={ref} rows={rows} className={`input ${error ? "input-error" : ""}`} {...rest} />
    </FieldWrapper>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  Omit<WrapperProps, "children"> & { options: { value: string; label: string }[]; placeholder?: string };

export const SelectInput = forwardRef<HTMLSelectElement, SelectProps>(function SelectInput(
  { label, hint, error, required, className, options, placeholder, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} className={className}>
      <select ref={ref} className={`input ${error ? "input-error" : ""}`} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
});

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxProps>(function CheckboxInput(
  { label, className, ...rest },
  ref,
) {
  return (
    <label className={`flex items-center gap-2 text-sm text-graphite-700 ${className ?? ""}`}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-navy-700 focus:ring-2 focus:ring-navy-500/30"
        {...rest}
      />
      {label}
    </label>
  );
});
