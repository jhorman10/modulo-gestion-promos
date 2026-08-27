import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

describe('Layout', () => {
  const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it('should render children', () => {
    renderWithRouter(
      <Layout>
        <div data-testid="content">Page Content</div>
      </Layout>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should render header with default title', () => {
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText('Promotions Management')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByRole('menuitem', { name: /promotions/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /summary/i })).toBeInTheDocument();
  });

  it('should have main element with role="main"', () => {
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
