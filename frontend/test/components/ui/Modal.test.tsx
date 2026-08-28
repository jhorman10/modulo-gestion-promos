import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../../src/components/ui/Modal';

// Mock HTMLDialogElement methods for jsdom
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = true;
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = false;
});

describe('Modal', () => {
  describe('rendering', () => {
    it('should render dialog element', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal body text</p>
        </Modal>
      );
      expect(screen.getByText('Modal body text')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Confirm Action">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('should render close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: /cerrar diálogo/i })).toBeInTheDocument();
    });

    it('should not render close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('button', { name: /cerrar diálogo/i })).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      );
      fireEvent.click(screen.getByRole('button', { name: /cerrar diálogo/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm/cancel buttons', () => {
    it('should render confirm and cancel buttons when onConfirm is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} onConfirm={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should not render confirm/cancel buttons when onConfirm is not provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('should use custom confirm/cancel text', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          confirmText="Delete"
          cancelText="Go Back"
        >
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(
        <Modal isOpen={true} onClose={() => {}} onConfirm={onConfirm}>
          <p>Content</p>
        </Modal>
      );
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} onConfirm={() => {}}>
          <p>Content</p>
        </Modal>
      );
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
