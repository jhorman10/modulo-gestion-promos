import type { ReactNode } from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, error, required, htmlFor, hint, children }: FormFieldProps) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={htmlFor} className="form-label">
          {label}
          {required && (
            <span className="required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId} className="form-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
