import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <FormField>
          <input type="text" />
        </FormField>
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(
        <FormField label="Email" htmlFor="email">
          <input id="email" type="text" />
        </FormField>
      );
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should show required indicator', () => {
      render(
        <FormField label="Name" required>
          <input type="text" />
        </FormField>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      render(
        <FormField error="Field is required">
          <input type="text" />
        </FormField>
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Field is required');
    });
  });

  describe('hint', () => {
    it('should show hint when no error', () => {
      render(
        <FormField hint="Enter your email">
          <input type="text" />
        </FormField>
      );
      expect(screen.getByText('Enter your email')).toBeInTheDocument();
    });

    it('should not show hint when error is present', () => {
      render(
        <FormField hint="Enter your email" error="Invalid email">
          <input type="text" />
        </FormField>
      );
      expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    });
  });
});
