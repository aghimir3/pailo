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

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <input
      className={cn("form-input", error && "form-input-error", className)}
      {...props}
    />
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FormSelect({ error, className, options, placeholder, ...props }: FormSelectProps) {
  return (
    <select
      className={cn("form-input form-select", error && "form-input-error", className)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={cn("form-input form-textarea", error && "form-input-error", className)}
      {...props}
    />
  );
}

interface FormNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export function FormNumberInput({ error, className, ...props }: FormNumberInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*\.?[0-9]*"
      className={cn("form-input", error && "form-input-error", className)}
      {...props}
    />
  );
}
