import { forwardRef, ChangeEvent } from 'react';

export interface DateTimePickerProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ label, error, id, required, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <div className="form-field">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {required && <span className="required" aria-hidden="true"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="datetime-local"
          className={`form-input ${error ? 'error' : ''}`}
          {...(error && { 'aria-invalid': true })}
          aria-describedby={errorId}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p id={errorId} className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

DateTimePicker.displayName = 'DateTimePicker';
