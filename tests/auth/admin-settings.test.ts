// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Admin settings page tests (`/auth/admin/settings`).
 *
 * The page is an async Server Component that calls `requireAdminSession()`
 * at the top and then reads social links from Redis. We call the page
 * function directly (not through Next.js routing) so we can control the
 * auth gate and Redis via mocks, then render the returned JSX with RTL.
 *
 * `vi.hoisted` is used so the mocks exist before the `vi.mock` factories run.
 */

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  })
);

const mockRequireAdminSession = vi.hoisted(() => vi.fn());
const mockRedisGet = vi.hoisted(() => vi.fn());
const mockAdminUrl = vi.hoisted(() => vi.fn((suffix = '') => `/__hidden_admin__${suffix}`));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/app/auth/admin/login/actions', () => ({
  requireAdminSession: mockRequireAdminSession,
}));
vi.mock('@/lib/redis', () => ({ redis: { get: mockRedisGet } }));
vi.mock('@/lib/admin-path', () => ({ adminUrl: mockAdminUrl }));

import SocialSettingsPage from '@/app/auth/admin/settings/page';

beforeEach(() => {
  vi.resetAllMocks();
  mockAdminUrl.mockReturnValue('/__hidden_admin__');
  mockRedirect.mockImplementation((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT:${url}`;
    throw error;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SocialLinks page', () => {
  it('redirects to the admin login when there is no admin session', async () => {
    mockRequireAdminSession.mockImplementation(() => {
      mockRedirect('/__hidden_admin__/login');
      throw new Error('NEXT_REDIRECT:/__hidden_admin__/login');
    });

    await expect(SocialSettingsPage()).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith('/__hidden_admin__/login');
    expect(mockRequireAdminSession).toHaveBeenCalledTimes(1);
  });

  it('renders the social links form when authenticated', async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: 1,
      email: 'admin@test.local',
      role: 'super_admin',
    });
    mockRedisGet.mockResolvedValue({
      whatsapp: 'https://wa.me/1234567890',
      email: 'mailto:hello@example.com',
      linkedin: 'https://linkedin.com/company/example',
      facebook: 'https://facebook.com/example',
    });

    const element = await SocialSettingsPage();
    render(element);

    expect(screen.getByRole('heading', { name: /Social Links/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/LinkedIn URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Facebook URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save links/i })).toBeInTheDocument();
  });
});
