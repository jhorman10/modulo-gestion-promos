export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Cargando...' }: SpinnerProps) {
  return (
    <div className={`spinner spinner-${size}`} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
