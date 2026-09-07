import {
  expect,
  test,
  type Page
} from '@playwright/test';
import {
  errorResponseSchema,
  fixtureItemSchema,
  healthResponseSchema,
  itemListResponseSchema,
  runtimeResponseSchema
} from '../../apps/fixture-service/src/contracts.ts';

async function installLoopbackGuard(page: Page): Promise<string[]> {
  const blockedUrls: string[] = [];

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const allowed =
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.port === '4317';

    if (!allowed) {
      blockedUrls.push(url.href);
      await route.abort();
      return;
    }

    await route.continue();
  });

  return blockedUrls;
}

test.describe('PASS 5 Chromium E2E over the localhost-only synthetic fixture', () => {
  test('browser verifies healthy runtime without leaving loopback', async ({ page }) => {
    const blockedUrls = await installLoopbackGuard(page);

    const navigation = await page.goto('/health');
    expect(navigation).not.toBeNull();
    expect(navigation?.status()).toBe(200);

    const health = await page.evaluate(async () => {
      const response = await fetch('/health');
      return {
        status: response.status,
        body: await response.json()
      };
    });

    expect(health.status).toBe(200);
    expect(healthResponseSchema.parse(health.body)).toEqual({
      status: 'ok',
      synthetic: true
    });

    const runtime = await page.evaluate(async () => {
      const response = await fetch('/api/runtime');
      return {
        status: response.status,
        body: await response.json()
      };
    });

    expect(runtime.status).toBe(200);
    const parsedRuntime = runtimeResponseSchema.parse(runtime.body);
    expect(parsedRuntime.environment).toBe('synthetic-local');
    expect(parsedRuntime.faultMode).toBe('none');
    expect(blockedUrls).toEqual([]);
  });

  test('browser completes synthetic item lifecycle and stable error paths', async ({ page }) => {
    const blockedUrls = await installLoopbackGuard(page);

    const navigation = await page.goto('/health');
    expect(navigation?.status()).toBe(200);

    const flow = await page.evaluate(async () => {
      const listResponse = await fetch('/api/items');
      const listBody = await listResponse.json();

      const createResponse = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Synthetic Browser Delta',
          description: 'Candidate-owned Playwright E2E fixture.'
        })
      });
      const createBody = await createResponse.json();

      const fetchResponse = await fetch(`/api/items/${createBody.id}`);
      const fetchBody = await fetchResponse.json();

      const invalidResponse = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: '',
          description: 'Intentionally invalid browser request.'
        })
      });
      const invalidBody = await invalidResponse.json();

      const missingItemResponse = await fetch('/api/items/item-999999');
      const missingItemBody = await missingItemResponse.json();

      const missingRouteResponse = await fetch('/browser-route-that-does-not-exist');
      const missingRouteBody = await missingRouteResponse.json();

      return {
        list: {
          status: listResponse.status,
          body: listBody
        },
        create: {
          status: createResponse.status,
          body: createBody
        },
        fetched: {
          status: fetchResponse.status,
          body: fetchBody
        },
        invalid: {
          status: invalidResponse.status,
          body: invalidBody
        },
        missingItem: {
          status: missingItemResponse.status,
          body: missingItemBody
        },
        missingRoute: {
          status: missingRouteResponse.status,
          body: missingRouteBody
        }
      };
    });

    expect(flow.list.status).toBe(200);
    const listed = itemListResponseSchema.parse(flow.list.body);
    expect(listed.items.length).toBeGreaterThanOrEqual(2);

    expect(flow.create.status).toBe(201);
    const created = fixtureItemSchema.parse(flow.create.body);
    expect(created.name).toBe('Synthetic Browser Delta');
    expect(created.description).toBe('Candidate-owned Playwright E2E fixture.');

    expect(flow.fetched.status).toBe(200);
    expect(fixtureItemSchema.parse(flow.fetched.body)).toEqual(created);

    expect(flow.invalid.status).toBe(400);
    expect(errorResponseSchema.parse(flow.invalid.body).error.code).toBe(
      'INVALID_REQUEST'
    );

    expect(flow.missingItem.status).toBe(404);
    expect(errorResponseSchema.parse(flow.missingItem.body).error.code).toBe(
      'ITEM_NOT_FOUND'
    );

    expect(flow.missingRoute.status).toBe(404);
    expect(errorResponseSchema.parse(flow.missingRoute.body).error.code).toBe(
      'ROUTE_NOT_FOUND'
    );

    expect(blockedUrls).toEqual([]);
  });
});
