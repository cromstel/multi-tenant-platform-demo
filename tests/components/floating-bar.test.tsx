// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: () => new Headers(),
}));
vi.mock('@/lib/redis', () => ({
  redis: { get: vi.fn().mockResolvedValue(undefined) },
}));

import FloatingBar from '@/components/floating-bar';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FloatingBar', () => {
  it('renders without crashing and shows the 4 branded icons', async () => {
    // FloatingBar is an async Server Component; in a jsdom (client) test
    // environment React cannot mount an async component directly, so we await
    // it ourselves with its external deps mocked and render the resulting JSX.
    const content = await FloatingBar();
    render(<>{content}</>);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Facebook' })).toBeInTheDocument();
  });
});
