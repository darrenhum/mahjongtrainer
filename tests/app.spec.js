import { test, expect } from '@playwright/test';

test('lessons, first answers, replay and reset persist correctly', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /01.*0 fan/ }).click();
  await expect(page.locator('#lesson-detail .tile')).toHaveCount(14);
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  await page.reload();
  await expect(page.locator('.lesson-card').first()).toContainText('Lesson completed');
  await page.getByRole('button', { name: '02 Practice a hand' }).click();
  await expect(page.getByRole('button', { name: 'Check my thinking' })).toBeDisabled();
  await page.locator('input[name="pattern"]').first().check();
  await expect(page.getByRole('button', { name: 'Check my thinking' })).toBeDisabled();
  await page.locator('.hand .tile').first().click();
  await page.getByRole('button', { name: 'Check my thinking' }).click();
  await expect(page.locator('#feedback')).toBeVisible();
  await expect(page.locator('.hand .tile').first()).toBeDisabled();
  const firstAnswers = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong-path-progress-v1')).answers);
  await page.getByRole('button', { name: 'Try this hand again' }).click();
  await page.locator('input[name="pattern"]').last().check();
  await page.locator('.hand .tile').last().click();
  await page.getByRole('button', { name: 'Check my thinking' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong-path-progress-v1')).answers)).toEqual(firstAnswers);
  await page.reload();
  await page.getByRole('button', { name: '03 Your progress' }).click();
  await expect(page.locator('.stats')).toContainText('1/6');
  await expect(page.locator('.stats')).toContainText('1/12');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset local progress' }).click();
  await expect(page.locator('.stats')).toContainText('0/6');
  await expect(page.locator('.stats')).toContainText('0/12');
});

test('project-subpath app reloads and works offline with installable icons', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('#connection')).toHaveText('● Ready offline');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
  const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#connection')).toHaveText(/Ready offline|Offline · ready to practice/);
  expect(await page.evaluate(() => fetch('./uncached-network-probe').then(() => false).catch(() => true))).toBe(true);
  await expect(page.locator('.lesson-card')).toHaveCount(6);
  await page.getByRole('button', { name: '02 Practice a hand' }).click();
  await expect(page.locator('.hand .tile').first()).toBeVisible();
  const dimensions = await page.evaluate(async () => {
    return Promise.all([192, 512].map(size => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
      image.onerror = reject;
      image.src = `./icons/icon-${size}.png`;
    })));
  });
  expect(dimensions).toEqual([[192, 192], [512, 512]]);
});

test('mobile screens fit and rules and install dialogs are accessible', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(await overflows()).toBe(false);
  await page.getByRole('button', { name: /Rules/ }).click();
  await expect(page.getByRole('dialog', { name: 'Our table rules' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '02 Practice a hand' }).click();
  expect(await overflows()).toBe(false);
  for (let i = 0; i < 12; i++) {
    await page.locator('#scenario-picker').selectOption(String(i));
    expect(await overflows()).toBe(false);
    await expect(page.locator('.hand .tile').first()).toBeVisible();
  }
  await page.getByRole('button', { name: '03 Your progress' }).click();
  expect(await overflows()).toBe(false);
  await page.getByRole('button', { name: 'Install app' }).click();
  // Headless browsers may emit a native install prompt or show our fallback.
  const dialog = page.getByRole('dialog', { name: 'Take your practice with you' });
  if (await dialog.isVisible()) {
    await expect(dialog).toContainText('Add to Home Screen');
    await page.getByRole('button', { name: 'Got it' }).click();
  }
});

test('corrupt and unavailable storage never prevents practice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mahjong-path-progress-v1', '{broken');
    Storage.prototype.setItem = () => { throw new DOMException('Unavailable', 'QuotaExceededError'); };
  });
  await page.goto('./');
  await expect(page.locator('#storage-status')).toContainText('could not be read');
  await page.locator('.lesson-card').first().click();
  await page.getByRole('button', { name: 'Mark as learned' }).click();
  await expect(page.locator('#storage-status')).toContainText('only for this session');
  await page.getByRole('button', { name: '02 Practice a hand' }).click();
  await expect(page.locator('.hand .tile').first()).toBeVisible();
});
