import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Promotion } from '../api/promotions';
import { usePromotions } from '../api/promotions';

interface PromotionListProps {
  onPromotionClick?: (promotion: Promotion) => void;
  onEdit?: (promotion: Promotion) => void;
  onActivate?: (promotion: Promotion) => void;
  onFinalize?: (promotion: Promotion) => void;
  onDelete?: (promotion: Promotion) => void;
}

export function PromotionList({
  onPromotionClick,
  onEdit,
  onActivate,
  onFinalize,
  onDelete,
}: PromotionListProps) {
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = usePromotions({ page, size });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="promotion-list-loading" role="status" aria-label="Cargando promociones">
        <div className="loading-skeleton">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
        <p className="loading-text">Cargando promociones...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="promotion-list-error" role="alert">
        <p>
          Error al cargar las promociones:{' '}
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="btn btn-secondary"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="promotion-list-empty">
        <p>No hay promociones registradas</p>
      </div>
    );
  }

  const { data: promotions, pagination } = data;
  const { total, total_pages } = pagination;

  return (
    <div className="promotion-list">
      <div className="table-container" role="region" aria-label="Lista de promociones" tabIndex={0}>
        <table className="promotion-table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Tipo</th>
              <th scope="col">Valor</th>
              <th scope="col">Período</th>
              <th scope="col">Estado</th>
              <th scope="col">Productos / Categorías</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(promotion => (
              <tr
                key={promotion.id}
                onClick={() => onPromotionClick?.(promotion)}
                style={{ cursor: onPromotionClick ? 'pointer' : 'default' }}
              >
                <td>{promotion.name}</td>
                <td>
                  <span className="badge badge-info">
                    {promotion.discount_type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                  </span>
                </td>
                <td>
                  {promotion.discount_type === 'percentage'
                    ? `${promotion.discount_value.toFixed(0)}%`
                    : `$${promotion.discount_value.toLocaleString()}`}
                </td>
                <td>
                  {new Date(promotion.start_date).toLocaleDateString()} -{' '}
                  {new Date(promotion.end_date).toLocaleDateString()}
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(promotion.status)}`}>
                    {promotion.status}
                  </span>
                </td>
                <td>
                  {promotion.products.map(p => (
                    <span key={p.id} className="badge badge-product">
                      {p.name}
                    </span>
                  ))}
                  {promotion.categories.map(c => (
                    <span key={c.id} className="badge badge-category">
                      {c.name}
                    </span>
                  ))}
                </td>
                <td>
                  <PromotionActions
                    promotion={promotion}
                    onEdit={onEdit}
                    onActivate={onActivate}
                    onFinalize={onFinalize}
                    onDelete={onDelete}
                    onNavigate={navigate}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total_pages > 1 && (
        <nav className="pagination" aria-label="Paginación de promociones">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <span className="pagination-info" aria-live="polite">
            Página {page} de {total_pages} ({total} total)
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === total_pages}
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}

interface PromotionActionsProps {
  promotion: Promotion;
  onEdit?: (promotion: Promotion) => void;
  onActivate?: (promotion: Promotion) => void;
  onFinalize?: (promotion: Promotion) => void;
  onDelete?: (promotion: Promotion) => void;
  onNavigate?: (path: string) => void;
}

function PromotionActions({
  promotion,
  onEdit,
  onActivate,
  onFinalize,
  onDelete,
  onNavigate,
}: PromotionActionsProps) {
  const canEdit = promotion.status !== 'Finalizada';
  const canDelete = promotion.status === 'Programada';
  const canActivate = promotion.status === 'Programada';
  const canFinalize = promotion.status === 'Activa';

  return (
    <div className="promotion-actions" role="group" aria-label={`Acciones para ${promotion.name}`}>
      {canEdit && (
        <button
          className="btn btn-sm btn-primary"
          onClick={e => {
            e.stopPropagation();
            if (onEdit) {
              onEdit(promotion);
            } else if (onNavigate) {
              onNavigate(`/promotions/${promotion.id}/edit`);
            }
          }}
          aria-label={`Editar ${promotion.name}`}
        >
          Editar
        </button>
      )}
      {canActivate && (
        <button
          className="btn btn-sm btn-success"
          onClick={e => {
            e.stopPropagation();
            onActivate?.(promotion);
          }}
          aria-label={`Activar ${promotion.name}`}
        >
          Activar
        </button>
      )}
      {canFinalize && (
        <button
          className="btn btn-sm btn-warning"
          onClick={e => {
            e.stopPropagation();
            onFinalize?.(promotion);
          }}
          aria-label={`Finalizar ${promotion.name}`}
        >
          Finalizar
        </button>
      )}
      {canDelete && (
        <button
          className="btn btn-sm btn-danger"
          onClick={e => {
            e.stopPropagation();
            onDelete?.(promotion);
          }}
          aria-label={`Eliminar ${promotion.name}`}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

function getStatusBadgeClass(status: Promotion['status']): string {
  switch (status) {
    case 'Programada':
      return 'badge-warning';
    case 'Activa':
      return 'badge-success';
    case 'Finalizada':
      return 'badge-secondary';
    default:
      return 'badge-secondary';
  }
}
