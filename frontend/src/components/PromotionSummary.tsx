import { usePromotionSummary } from '../api/summary';
import { Spinner } from './ui/Spinner';

export function PromotionSummary() {
  const { data, isLoading, isError, error } = usePromotionSummary();

  if (isLoading) {
    return (
      <div className="summary-loading" role="status" aria-label="Loading summary">
        <Spinner label="Loading summary..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="summary-error" role="alert">
        <p>Error loading summary: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="promotion-summary">
      <h2 className="summary-title">Promotion Summary</h2>
      <div className="summary-grid" role="region" aria-label="Summary statistics">
        <div className="summary-card">
          <span className="summary-label">Scheduled</span>
          <span className="summary-value" data-testid="count-programada">
            {data.by_status.Programada}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active</span>
          <span className="summary-value" data-testid="count-activa">
            {data.by_status.Activa}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Finalized</span>
          <span className="summary-value" data-testid="count-finalizada">
            {data.by_status.Finalizada}
          </span>
        </div>
        <div className="summary-card summary-card-highlight">
          <span className="summary-label">Valid Today</span>
          <span className="summary-value" data-testid="count-valid-today">
            {data.valid_today}
          </span>
        </div>
      </div>
    </div>
  );
}
