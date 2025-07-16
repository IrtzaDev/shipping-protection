import '@testing-library/jest-dom/extend-expect';
import { installGlobals } from '@remix-run/node';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Setup Remix globals
installGlobals();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

// Mock Shopify App Bridge
vi.mock('@shopify/app-bridge-react', () => ({
  useAppBridge: vi.fn(() => ({
    dispatch: vi.fn(),
  })),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Shopify Polaris components (add more as needed)
vi.mock('@shopify/polaris', async () => {
  const actual = await vi.importActual('@shopify/polaris');
  return {
    ...actual,
    Button: ({ children, onClick }: any) => (
      <button onClick={onClick}>{children}</button>
    ),
    Card: ({ children }: any) => <div>{children}</div>,
    Page: ({ children }: any) => <div>{children}</div>,
    Layout: ({ children }: any) => <div>{children}</div>,
    'Layout.Section': ({ children }: any) => <div>{children}</div>,
  };
}); 