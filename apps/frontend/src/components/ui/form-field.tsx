"use client";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}

export function FormField({ label, error, required, children, hint, className }: FormFieldProps) {
  return (
    <div className={cn("form-field", className)}>
      <label className="form-label">
        {label}
        {required && <span className="form-required">*</span>}
      </label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}

export function FormInput({ label, value, onChange, error, required, type, placeholder, disabled, hint }: FormInputProps) {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <input
        className={cn("form-input", error && "form-input-error")}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </FormField>
  );
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function FormSelect({ label, value, onChange, options, error, required, placeholder, disabled }: FormSelectProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <select
        className={cn("form-input form-select", error && "form-input-error")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export function FormTextarea({ label, value, onChange, error, required, placeholder, disabled, rows }: FormTextareaProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <textarea
        className={cn("form-input form-textarea", error && "form-input-error")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows ?? 3}
      />
    </FormField>
  );
}

interface FormNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function FormNumberInput({ label, value, onChange, error, required, placeholder, disabled }: FormNumberInputProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*\.?[0-9]*"
        className={cn("form-input", error && "form-input-error")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </FormField>
  );
}
