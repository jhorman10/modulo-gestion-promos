import { Modal } from './Modal';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant: _variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      confirmText={isLoading ? 'Procesando...' : confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      confirmDisabled={isLoading}
      showCloseButton={!isLoading}
    >
      <p className="confirmation-message">{message}</p>
    </Modal>
  );
}
