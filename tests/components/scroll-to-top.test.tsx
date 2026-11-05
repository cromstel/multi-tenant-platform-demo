// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

import { usePathname } from 'next/navigation';

import ScrollToTop from '@/components/scroll-to-top';

const mockUsePathname = vi.mocked(usePathname);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScrollToTop', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders without crashing on a public path', () => {
    render(<ScrollToTop />);
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument();
  });

  it('exposes aria-label "Scroll to top"', () => {
    render(<ScrollToTop />);
    const button = screen.getByRole('button', { name: 'Scroll to top' });
    expect(button).toHaveAttribute('aria-label', 'Scroll to top');
  });

  it('calls window.scrollTo({ top: 0, behavior: "smooth" }) on click', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    render(<ScrollToTop />);
    fireEvent.click(screen.getByRole('button', { name: 'Scroll to top' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('is hidden on /auth paths', () => {
    mockUsePathname.mockReturnValue('/auth/login');
    render(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
  });

  it('is hidden on /admin paths', () => {
    mockUsePathname.mockReturnValue('/admin/dashboard');
    render(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).not.toBeInTheDocument();
  });

  it('is visible on public path /', () => {
    mockUsePathname.mockReturnValue('/');
    render(<ScrollToTop />);
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument();
  });

  it('is visible on public path /contact', () => {
    mockUsePathname.mockReturnValue('/contact');
    render(<ScrollToTop />);
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument();
  });
});
