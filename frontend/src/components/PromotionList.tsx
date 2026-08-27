import { useState } from 'react';
import { usePromotions } from '../api/promotions';
import { Promotion } from '../api/promotions';

interface PromotionListProps {
  onPromotionClick?: (promotion: Promotion) => void;
}

export function PromotionList({ onPromotionClick }: PromotionListProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const { data, isLoading, isError, error, refetch } = usePromotions({ page, size });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setPage(1);
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
        <p>Error al cargar las promociones: {error instanceof Error ? error.message : 'Error desconocido'}</p>
        <button onClick={() => refetch()} className="btn btn-secondary">
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
            {promotions.map((promotion) => (
              <tr key={promotion.id} onClick={() => onPromotionClick?.(promotion)} style={{ cursor: onPromotionClick ? 'pointer' : 'default' }}>
                <td>{promotion.name}</td>
                <td>
                  <span className="badge badge-info">{promotion.discount_type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}</span>
                </td>
                <td>
                  {promotion.discount_type === 'percentage'
                    ? `${(promotion.discount_value * 100).toFixed(0)}%`
                    : `$${promotion.discount_value.toLocaleString()}`}
                </td>
                <td>
                  {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(promotion.status)}`}>
                    {promotion.status}
                  </span>
                </td>
                <td>
                  {promotion.products.map((p) => <span key={p.id} className="badge badge-product">{p.name}</span>)}
                  {promotion.categories.map((c) => <span key={c.id} className="badge badge-category">{c.name}</span>)}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPromotionClick?.(promotion);
                    }}
                  >
                    Ver
                  </button>
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