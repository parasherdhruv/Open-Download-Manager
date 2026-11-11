import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the static pre-alpha state without a download action', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Open Download Manager' })).toBeVisible();
    expect(screen.getByText('Pre-alpha desktop shell')).toBeVisible();
    expect(screen.getByText('Downloads are unavailable')).toBeVisible();
    expect(screen.getByText(/download functionality is not implemented/i)).toBeVisible();
    expect(
      container.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [role="link"]',
      ),
    ).toHaveLength(0);
  });
});
