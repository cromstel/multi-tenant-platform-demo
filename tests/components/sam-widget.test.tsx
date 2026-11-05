// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import SAMWidget from '@/components/sam/widget';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  // jsdom does not implement Element.prototype.scrollIntoView, which the
  // widget's messages effect calls. Add a no-op so the effect never throws.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  // scrollIntoView is re-defined on Element.prototype in beforeEach for every
  // test; each vitest test file runs in an isolated environment so there is no
  // cross-file leakage to clean up.
});

describe('SAMWidget', () => {
  it('renders without crashing', () => {
    render(<SAMWidget />);
    expect(screen.getByRole('button', { name: 'Open support widget' })).toBeInTheDocument();
  });

  it('shows the bot welcome message when opened', async () => {
    const user = userEvent.setup();
    render(<SAMWidget />);
    await user.click(screen.getByRole('button', { name: 'Open support widget' }));
    expect(screen.getByText('How can we help you today?')).toBeInTheDocument();
  });

  it('renders an input field and a send button when opened', async () => {
    const user = userEvent.setup();
    render(<SAMWidget />);
    await user.click(screen.getByRole('button', { name: 'Open support widget' }));
    expect(screen.getByLabelText('Support message input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('sends a message to /api/sam/chat and displays the bot reply', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, data: { response: { text: 'Hello there!' } } }),
        { status: 200 },
      ),
    );

    render(<SAMWidget />);
    await user.click(screen.getByRole('button', { name: 'Open support widget' }));

    const input = screen.getByLabelText('Support message input');
    await user.type(input, 'Hi SAM');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/sam/chat', expect.objectContaining({ method: 'POST' }));

    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });
});
