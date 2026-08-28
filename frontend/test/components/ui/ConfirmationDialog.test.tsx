import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationDialog } from '../../../src/components/ui/ConfirmationDialog';

// Mock HTMLDialogElement methods for jsdom
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = true;
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = false;
});

describe('ConfirmationDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with title and message when open', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('should render confirm and cancel buttons', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: /confirmar|confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar|cancel/i })).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /confirmar|confirm/i }));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /cancelar|cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should render custom confirm and cancel text', () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('should disable confirm button when loading', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading />);

    const confirmButton = screen.getByRole('button', { name: /procesando|processing/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should not call onConfirm when loading and confirm clicked', () => {
    render(<ConfirmationDialog {...defaultProps} isLoading />);

    const confirmButton = screen.getByRole('button', { name: /procesando|processing/i });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });
});
