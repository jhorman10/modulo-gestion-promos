import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Promotion } from '../api/promotions';
import { useActivatePromotion, useFinalizePromotion, useDeletePromotion } from '../api/mutations';
import type { ApiError } from '../api/client';
import { PromotionList } from './PromotionList';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { toastService } from './ui/Toast';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as ApiError).message || fallback;
  }
  return fallback;
}

export function PromotionListContainer() {
  const navigate = useNavigate();
  const activateMutation = useActivatePromotion();
  const finalizeMutation = useFinalizePromotion();
  const deleteMutation = useDeletePromotion();

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const handleEdit = (promotion: Promotion) => {
    navigate(`/promotions/${promotion.id}/edit`);
  };

  const handleActivate = (promotion: Promotion) => {
    activateMutation.mutate(promotion.id, {
      onSuccess: () => {
        toastService.success(`"${promotion.name}" activada correctamente`);
      },
      onError: err => {
        toastService.error(getErrorMessage(err, 'Error al activar la promoción'));
      },
    });
  };

  const handleFinalize = (promotion: Promotion) => {
    finalizeMutation.mutate(promotion.id, {
      onSuccess: () => {
        toastService.success(`"${promotion.name}" finalizada correctamente`);
      },
      onError: err => {
        toastService.error(getErrorMessage(err, 'Error al finalizar la promoción'));
      },
    });
  };

  const handleDelete = (promotion: Promotion) => {
    setDeleteTarget(promotion);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toastService.success(`"${deleteTarget.name}" eliminada correctamente`);
        setDeleteTarget(null);
      },
      onError: err => {
        toastService.error(getErrorMessage(err, 'Error al eliminar la promoción'));
        setDeleteTarget(null);
      },
    });
  };

  const cancelDelete = () => {
    if (!deleteMutation.isPending) {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PromotionList
        onEdit={handleEdit}
        onActivate={handleActivate}
        onFinalize={handleFinalize}
        onDelete={handleDelete}
      />
      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Eliminar promoción"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
