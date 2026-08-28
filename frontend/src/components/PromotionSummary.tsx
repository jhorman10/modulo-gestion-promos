import { usePromotionSummary } from '../api/summary';
import { Spinner } from './ui/Spinner';

export function PromotionSummary() {
  const { data, isLoading, isError, error } = usePromotionSummary();

  if (isLoading) {
    return (
      <div className="summary-loading" role="status" aria-label="Cargando resumen">
        <Spinner label="Cargando resumen..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="summary-error" role="alert">
        <p>
          Error al cargar resumen: {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="promotion-summary">
      <h2 className="summary-title">Resumen de Promociones</h2>
      <div className="summary-grid" role="region" aria-label="Estadísticas del resumen">
        <div className="summary-card">
          <span className="summary-label">Programadas</span>
          <span className="summary-value" data-testid="count-programada">
            {data.by_status.Programada}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Activas</span>
          <span className="summary-value" data-testid="count-activa">
            {data.by_status.Activa}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Finalizadas</span>
          <span className="summary-value" data-testid="count-finalizada">
            {data.by_status.Finalizada}
          </span>
        </div>
        <div className="summary-card summary-card-highlight">
          <span className="summary-label">Válidas Hoy</span>
          <span className="summary-value" data-testid="count-valid-today">
            {data.valid_today}
          </span>
        </div>
      </div>
    </div>
  );
}
