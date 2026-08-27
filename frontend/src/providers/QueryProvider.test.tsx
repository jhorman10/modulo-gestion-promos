import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryProvider } from './QueryProvider';

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children, client }: any) => (
    <div data-testid="query-provider" data-client={!!client}>
      {children}
    </div>
  ),
  QueryClient: vi.fn(() => ({})),
}));

describe('QueryProvider', () => {
  it('should render children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Test Child</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should wrap children with QueryClientProvider', () => {
    render(
      <QueryProvider>
        <div>Test</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });

  it('should use default client when none provided', () => {
    render(
      <QueryProvider>
        <div>Test</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('query-provider')).toHaveAttribute('data-client', 'true');
  });

  it('should use custom client when provided', () => {
    const customClient = {} as any;
    render(
      <QueryProvider client={customClient}>
        <div>Test</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('query-provider')).toHaveAttribute('data-client', 'true');
  });
});
