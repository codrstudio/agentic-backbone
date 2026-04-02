import { test, expect } from "@playwright/test";

/**
 * Teste e2e: Autenticação Authelia para agents.processa.info
 *
 * Fluxo:
 * 1. Acessa agents.processa.info/hub/
 * 2. É redirecionado para proxy.processa.info (Authelia portal)
 * 3. Faz login com credenciais NIC
 * 4. É redirecionado de volta para /hub/
 * 5. Verifica que a API funciona (auth/me retorna dados via Authelia)
 * 6. Verifica que o SSE conecta
 */

const BASE = "https://agents.processa.info";
const AUTHELIA_PORTAL = "https://proxy.processa.info";
const USERNAME = "NIC";
const PASSWORD = "#N1C@Lan!Mq7mnzXDu818";

test.describe("Authelia Authentication", () => {
  test("redirects to Authelia portal when not authenticated", async ({ page }) => {
    const response = await page.goto(`${BASE}/hub/`);

    // Should redirect to Authelia portal
    await page.waitForURL((url) => url.origin === AUTHELIA_PORTAL, {
      timeout: 15_000,
    });

    expect(page.url()).toContain(AUTHELIA_PORTAL);
    await page.screenshot({ path: ".tmp/authelia-redirect.png" });
  });

  test("login via Authelia and access Hub", async ({ page }) => {
    // 1. Go to Hub — will redirect to Authelia
    await page.goto(`${BASE}/hub/`);

    await page.waitForURL((url) => url.origin === AUTHELIA_PORTAL, {
      timeout: 15_000,
    });

    // 2. Fill Authelia login form
    const usernameInput = page.locator('input[name="username"], input[id="username-textfield"]');
    const passwordInput = page.locator('input[name="password"], input[id="password-textfield"]');

    await usernameInput.waitFor({ state: "visible", timeout: 10_000 });
    await usernameInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);

    await page.screenshot({ path: ".tmp/authelia-login-filled.png" });

    // 3. Submit login
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Entrar")');
    await submitBtn.click();

    // 4. Wait for redirect back to Hub
    await page.waitForURL((url) => url.origin === BASE && url.pathname.startsWith("/hub"), {
      timeout: 30_000,
    });

    await page.screenshot({ path: ".tmp/authelia-hub-loaded.png" });

    // 5. Verify we're in the Hub (not login page)
    expect(page.url()).toContain("/hub");
    expect(page.url()).not.toContain("/login");

    console.log("Authelia login successful! URL:", page.url());
  });

  test("API auth/me works with Authelia session", async ({ page }) => {
    // First login via Authelia
    await page.goto(`${BASE}/hub/`);
    await page.waitForURL((url) => url.origin === AUTHELIA_PORTAL, { timeout: 15_000 });

    const usernameInput = page.locator('input[name="username"], input[id="username-textfield"]');
    const passwordInput = page.locator('input[name="password"], input[id="password-textfield"]');
    await usernameInput.waitFor({ state: "visible", timeout: 10_000 });
    await usernameInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Entrar")');
    await submitBtn.click();

    await page.waitForURL((url) => url.origin === BASE, { timeout: 30_000 });

    // Now test the API endpoint with Authelia cookie
    const meResponse = await page.evaluate(async () => {
      const res = await fetch("/api/v1/ai/auth/me", { credentials: "include" });
      return { status: res.status, body: await res.json() };
    });

    console.log("auth/me response:", JSON.stringify(meResponse, null, 2));

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toBeTruthy();
    expect(meResponse.body.authSource).toBe("authelia");

    await page.screenshot({ path: ".tmp/authelia-api-verified.png" });
  });

  test("API rejects requests without auth", async ({ request }) => {
    const response = await request.get(`${BASE}/api/v1/ai/agents`);
    expect(response.status()).toBe(401);
  });

  test("health endpoint remains accessible without auth", async ({ request }) => {
    const response = await request.get(`${BASE}/health`);
    expect(response.status()).toBe(200);
  });
});
