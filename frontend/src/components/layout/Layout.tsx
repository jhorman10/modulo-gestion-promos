import type { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

export interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Header>
        <Navigation />
      </Header>
      <main className="app-main" role="main">
        {children}
      </main>
    </div>
  );
}
