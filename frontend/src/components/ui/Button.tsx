import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      isLoading = false,
      loadingText,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const loadingClass = isLoading ? 'btn-loading' : '';

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass} ${loadingClass} ${className}`.trim()}
        disabled={disabled || isLoading}
        {...(isLoading && { 'aria-busy': true })}
        {...props}
      >
        {isLoading ? (loadingText ?? 'Loading...') : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
