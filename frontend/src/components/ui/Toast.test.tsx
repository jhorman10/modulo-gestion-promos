import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, toastService } from './Toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
    toast: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: ({ position }: { position: string }) => (
    <div data-testid="toaster" data-position={position} />
  ),
}));

describe('Toast', () => {
  describe('ToastProvider', () => {
    it('should render Toaster component', () => {
      render(<ToastProvider />);
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });

    it('should use default position', () => {
      render(<ToastProvider />);
      expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'top-right');
    });

    it('should use custom position', () => {
      render(<ToastProvider position="bottom-left" />);
      expect(screen.getByTestId('toaster')).toHaveAttribute('data-position', 'bottom-left');
    });
  });

  describe('toastService', () => {
    it('should have success method', () => {
      expect(typeof toastService.success).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof toastService.error).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof toastService.info).toBe('function');
    });

    it('should have dismiss method', () => {
      expect(typeof toastService.dismiss).toBe('function');
    });
  });
});
