import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from './Navigation';

describe('Navigation', () => {
  const renderWithRouter = (ui: React.ReactElement, initialEntries = ['/']) =>
    render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

  describe('rendering', () => {
    it('should render default navigation items', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('menuitem', { name: /promotions/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /new promotion/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /summary/i })).toBeInTheDocument();
    });

    it('should render custom navigation items', () => {
      const items = [
        { to: '/home', label: 'Home' },
        { to: '/about', label: 'About' },
      ];
      renderWithRouter(<Navigation items={items} />);
      expect(screen.getByRole('menuitem', { name: 'Home' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument();
    });

    it('should have menubar role on list', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('menubar')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('should apply active class to current route', () => {
      renderWithRouter(<Navigation />, ['/promotions']);
      const promotionsLink = screen.getByRole('menuitem', { name: /promotions$/i });
      expect(promotionsLink.className).toContain('nav-link-active');
    });

    it('should not apply active class to non-current route', () => {
      renderWithRouter(<Navigation />, ['/summary']);
      const promotionsLink = screen.getByRole('menuitem', { name: /promotions$/i });
      expect(promotionsLink.className).not.toContain('nav-link-active');
    });
  });

  describe('links', () => {
    it('should link to correct routes', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('menuitem', { name: /promotions$/i })).toHaveAttribute('href', '/promotions');
      expect(screen.getByRole('menuitem', { name: /new promotion/i })).toHaveAttribute('href', '/promotions/new');
      expect(screen.getByRole('menuitem', { name: /summary/i })).toHaveAttribute('href', '/summary');
    });
  });
});
