import {
  expect,
  test
} from '@playwright/test';

test('desktop release renders verified CI evidence without external runtime requests', async ({
  page
}) => {
  const requestedHosts = new Set<string>();

  page.on('request', (request) => {
    requestedHosts.add(new URL(request.url()).hostname);
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Stacktape Reliability Lab/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Reliability, proved with evidence.'
    })
  ).toBeVisible();

  await expect(page.locator('[data-scenario]')).toHaveCount(5);
  await expect(page.locator('#pass-ratio')).toHaveText('5/5');
  await expect(page.locator('#failed-count')).toHaveText('0');
  await expect(page.locator('#release-status')).toHaveText('GREEN');
  await expect(page.locator('#artifact-id')).toHaveText('10044979752');

  await expect(
    page.getByText('Vercel serves only static HTML, CSS, JavaScript and the frozen evidence snapshot.')
  ).toBeVisible();

  expect([...requestedHosts]).toEqual(['127.0.0.1']);
});

test('mobile release stays readable and has no horizontal overflow', async ({
  page
}) => {
  await page.setViewportSize({
    width: 390,
    height: 844
  });

  await page.goto('/');

  await expect(page.locator('[data-scenario]')).toHaveCount(5);
  await expect(page.locator('#architecture')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );

  expect(hasHorizontalOverflow).toBe(false);
});
