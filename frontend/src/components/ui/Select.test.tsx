import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' },
];

describe('Select', () => {
  describe('rendering', () => {
    it('should render select with options', () => {
      render(<Select options={options} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Percentage' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Fixed Amount' })).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Select label="Discount Type" options={options} />);
      expect(screen.getByLabelText(/discount type/i)).toBeInTheDocument();
    });

    it('should render placeholder option when provided', () => {
      render(<Select options={options} placeholder="Select type" />);
      expect(screen.getByRole('option', { name: 'Select type' })).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<Select label="Type" options={options} required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      render(<Select options={options} error="Selection required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Selection required');
    });

    it('should set aria-invalid when error is present', () => {
      render(<Select options={options} error="Invalid" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through disabled state', () => {
      render(<Select options={options} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Select options={options} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });
});
