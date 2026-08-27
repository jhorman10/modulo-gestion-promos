import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render spinner element', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have default aria-label', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
    });

    it('should use custom label', () => {
      render(<Spinner label="Fetching data" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');
    });

    it('should include screen reader text', () => {
      render(<Spinner label="Loading content" />);
      expect(screen.getByText('Loading content')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render with md size by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status').className).toContain('spinner-md');
    });

    it('should render with sm size', () => {
      render(<Spinner size="sm" />);
      expect(screen.getByRole('status').className).toContain('spinner-sm');
    });

    it('should render with lg size', () => {
      render(<Spinner size="lg" />);
      expect(screen.getByRole('status').className).toContain('spinner-lg');
    });
  });
});
