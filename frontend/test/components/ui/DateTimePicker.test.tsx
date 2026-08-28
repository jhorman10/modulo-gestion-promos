import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateTimePicker } from '../../../src/components/ui/DateTimePicker';

describe('DateTimePicker', () => {
  describe('rendering', () => {
    it('should render datetime-local input', () => {
      render(<DateTimePicker />);
      const input = document.querySelector('input[type="datetime-local"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'datetime-local');
    });

    it('should render with label', () => {
      render(<DateTimePicker label="Start Date" />);
      const input = document.querySelector('input[type="datetime-local"]');
      expect(input).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<DateTimePicker label="Start" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      render(<DateTimePicker error="Date is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Date is required');
    });

    it('should set aria-invalid when error is present', () => {
      render(<DateTimePicker error="Invalid date" />);
      const input = document.querySelector('input[type="datetime-local"]');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through disabled state', () => {
      render(<DateTimePicker disabled />);
      const input = document.querySelector('input[type="datetime-local"]');
      expect(input).toBeDisabled();
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<DateTimePicker ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
