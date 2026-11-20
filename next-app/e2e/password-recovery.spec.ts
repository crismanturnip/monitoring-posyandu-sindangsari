import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('forgot-password page shows its accessible email form on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/forgot-password');

  await expect(page.getByRole('heading', { name: 'Reset kata sandi' })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
  await expect(page.getByRole('button', { name: 'Kirim tautan reset' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('opening update-password directly without a Supabase session redirects to reset request', async ({ page }) => {
  await page.goto('/update-password');

  await expect(page).toHaveURL(/\/forgot-password\?error=/);
  await expect(page.locator('.form-error')).toHaveText('Tautan reset tidak valid atau sudah kedaluwarsa.');
});

test('invalid recovery token is rejected', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=pw-invalid-token&type=recovery');

  await expect(page).toHaveURL(/\/forgot-password\?error=/);
  await expect(page.locator('.form-error')).toHaveText('Tautan reset tidak valid atau sudah kedaluwarsa.');
});

test('valid recovery token_hash works without the requesting browser session', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=pw-valid-token&type=recovery');

  await expect(page).toHaveURL(/\/update-password$/);
  await expect(page.getByRole('heading', { name: 'Buat kata sandi baru' })).toBeVisible();
  await expect(page.getByLabel('Kata sandi baru')).toBeVisible();
  await expect(page.getByLabel('Konfirmasi kata sandi')).toBeVisible();
});

test('password recovery completes and returns the user to login', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=pw-update-token&type=recovery');
  await expect(page).toHaveURL(/\/update-password$/);

  await page.getByLabel('Kata sandi baru').fill('NewPassword123!');
  await page.getByLabel('Konfirmasi kata sandi').fill('NewPassword123!');
  await page.getByRole('button', { name: 'Simpan kata sandi' }).click();

  await expect(page).toHaveURL(/\/login\?password_updated=1$/);
  await expect(page.locator('.form-success')).toContainText('Kata sandi berhasil diperbarui');
});

test('fuzz: malformed recovery tokens always receive a safe expired-link redirect', async ({ request }) => {
  let state = 0x7f31a2;
  const random = (max: number) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state % max;
  };
  const alphabet = [' ', '+', '%', '&', '/', '?', '#', '\\', '\u0000', 'é', '雪', '🔐', 'a', 'Z', '9'];
  const tokens = ['', ' ', '\u0000', 'a'.repeat(512), ...Array.from({ length: 32 }, () =>
    Array.from({ length: 1 + random(96) }, () => alphabet[random(alphabet.length)]).join(''),
  )];
  const results = await Promise.all(tokens.map(token => {
    const url = new URL('/auth/confirm', 'http://localhost:3100');
    url.searchParams.set('token_hash', token);
    url.searchParams.set('type', 'recovery');
    return request.get(url.toString(), { maxRedirects: 0 });
  }));

  for (const response of results) {
    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location);
    expect(location.pathname).toBe('/forgot-password');
    expect(location.searchParams.get('error')).toBe('Tautan reset tidak valid atau sudah kedaluwarsa.');
    expect(location.searchParams.has('token_hash')).toBe(false);
  }
});

test('race: a recovery token can only be consumed by one concurrent request', async ({ request }) => {
  const url = new URL('/auth/confirm', 'http://localhost:3100');
  url.searchParams.set('token_hash', `pw-race-${randomUUID()}`);
  url.searchParams.set('type', 'recovery');
  const responses = await Promise.all(Array.from({ length: 12 }, () =>
    request.get(url.toString(), { maxRedirects: 0 }),
  ));

  const destinations = responses.map(response => {
    expect(response.status()).toBe(307);
    return new URL(response.headers().location).pathname;
  });
  expect(destinations.filter(path => path === '/update-password')).toHaveLength(1);
  expect(destinations.filter(path => path === '/forgot-password')).toHaveLength(11);
});
