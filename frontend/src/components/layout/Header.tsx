import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface HeaderProps {
  title?: string;
  children?: ReactNode;
}

export function Header({ title = 'Gestión de Promociones', children }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/promotions" className="header-title-link">
          <h1 className="header-title">{title}</h1>
        </Link>
        <nav className="header-nav" aria-label="Navegación principal">
          {children}
        </nav>
      </div>
    </header>
  );
}
