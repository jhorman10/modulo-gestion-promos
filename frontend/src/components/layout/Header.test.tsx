import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';

describe('Header', () => {
  const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  describe('rendering', () => {
    it('should render default title', () => {
      renderWithRouter(<Header />);
      expect(screen.getByText('Promotions Management')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      renderWithRouter(<Header title="My App" />);
      expect(screen.getByText('My App')).toBeInTheDocument();
    });

    it('should render as h1 element', () => {
      renderWithRouter(<Header />);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should link title to /promotions', () => {
      renderWithRouter(<Header />);
      const link = screen.getByRole('link', { name: /promotions management/i });
      expect(link).toHaveAttribute('href', '/promotions');
    });
  });

  describe('children', () => {
    it('should render children in nav area', () => {
      renderWithRouter(
        <Header>
          <span data-testid="custom-nav">Custom Nav</span>
        </Header>
      );
      expect(screen.getByTestId('custom-nav')).toBeInTheDocument();
    });
  });
});
