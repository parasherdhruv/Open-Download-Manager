import { expect, test, type APIResponse } from '@playwright/test';

const localOrigin = 'http://127.0.0.1:4173';
const localWebSocketOrigin = 'ws://127.0.0.1:4173';

type RedirectDecision =
  | { readonly kind: 'allow' }
  | {
      readonly kind: 'reject';
      readonly status: number;
      readonly targetOrigin: string;
    };

function classifyRedirectResponse(
  status: number,
  location: string | undefined,
  requestOrigin: string,
): RedirectDecision {
  if (status < 300 || status >= 400) {
    return { kind: 'allow' };
  }

  if (location === undefined || location.trim().length === 0) {
    return { kind: 'reject', status, targetOrigin: 'missing' };
  }

  try {
    return { kind: 'reject', status, targetOrigin: new URL(location, requestOrigin).origin };
  } catch {
    return { kind: 'reject', status, targetOrigin: 'invalid' };
  }
}

test('renders only the local static unavailable shell', async ({ context, page }) => {
  const failures: string[] = [];

  await test.step('classifies every redirect without retaining URL details', () => {
    expect(classifyRedirectResponse(299, undefined, localOrigin)).toEqual({ kind: 'allow' });
    expect(classifyRedirectResponse(400, undefined, localOrigin)).toEqual({ kind: 'allow' });

    for (let status = 300; status < 400; status += 1) {
      expect(classifyRedirectResponse(status, '/local?private=value', localOrigin)).toEqual({
        kind: 'reject',
        status,
        targetOrigin: localOrigin,
      });
    }

    const externalDecision = classifyRedirectResponse(
      302,
      'https://external.example.invalid/path?private=value',
      localOrigin,
    );
    expect(externalDecision).toEqual({
      kind: 'reject',
      status: 302,
      targetOrigin: 'https://external.example.invalid',
    });
    expect(JSON.stringify(externalDecision)).not.toContain('private');
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push('Browser console error');
    }
  });
  page.on('pageerror', () => {
    failures.push('Uncaught page error');
  });

  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.origin !== localOrigin) {
      failures.push(`Blocked request outside local test origin: ${requestUrl.origin}`);
      await route.abort('blockedbyclient');
      return;
    }

    let fetchedResponse: APIResponse | undefined;
    try {
      fetchedResponse = await route.fetch({ maxRedirects: 0, timeout: 5_000 });
      const redirectDecision = classifyRedirectResponse(
        fetchedResponse.status(),
        fetchedResponse.headers()['location'],
        requestUrl.origin,
      );

      if (redirectDecision.kind === 'reject') {
        failures.push(
          `Blocked redirect response from ${requestUrl.origin}: status ${redirectDecision.status}, target origin ${redirectDecision.targetOrigin}`,
        );
        await route.abort('blockedbyclient');
        return;
      }

      await route.fulfill({ response: fetchedResponse });
    } catch {
      failures.push(`Local route handling failed for origin ${requestUrl.origin}`);
      try {
        await route.abort('failed');
      } catch {
        // The route may already be resolved; the sanitized failure still fails the test.
      }
      throw new Error(`Local route handling failed for origin ${requestUrl.origin}`);
    } finally {
      if (fetchedResponse !== undefined) {
        try {
          await fetchedResponse.dispose();
        } catch {
          failures.push(`Local response disposal failed for origin ${requestUrl.origin}`);
        }
      }
    }
  });
  await context.routeWebSocket(/.*/, async (webSocketRoute) => {
    const webSocketUrl = new URL(webSocketRoute.url());

    if (webSocketUrl.origin !== localWebSocketOrigin) {
      failures.push(`Blocked WebSocket outside local test origin: ${webSocketUrl.origin}`);
      await webSocketRoute.close({ code: 1008, reason: 'Blocked by local-only test policy' });
      return;
    }

    webSocketRoute.connectToServer();
  });

  const response = await page.goto('/', { waitUntil: 'networkidle' });

  if (response === null) {
    throw new Error('The local shell did not return a navigation response.');
  }

  expect(response.ok()).toBe(true);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Open Download Manager' }),
  ).toBeVisible();
  await expect(page.getByText('Pre-alpha desktop shell')).toBeVisible();
  await expect(page.getByText('Downloads are unavailable')).toBeVisible();
  await expect(page.getByText(/download functionality is not implemented/i)).toBeVisible();
  await expect(
    page.locator('a, button, input, select, textarea, [role="button"], [role="link"]'),
  ).toHaveCount(0);
  expect(failures).toEqual([]);
});
