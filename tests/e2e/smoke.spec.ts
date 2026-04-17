import path from "node:path";
import { expect, test } from "@playwright/test";

test("signup → upload → share → view", async ({ browser }) => {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();

	const email = `user-${Date.now()}@example.com`;
	const password = "testpassword123";

	await page.goto("/signup");
	await page.getByLabel(/name/i).fill("Test User");
	await page.getByLabel(/^email/i).fill(email);
	await page.getByLabel(/^password/i).fill(password);
	await page.getByLabel(/confirm/i).fill(password);
	await page.getByRole("button", { name: /create account/i }).click();

	await page.waitForURL(/\/(signin|dashboard)/, { timeout: 10_000 });

	if (page.url().includes("/signin")) {
		await page.getByLabel(/email/i).fill(email);
		await page.getByLabel(/password/i).fill(password);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard/);
	}

	await page.getByRole("link", { name: /upload/i }).first().click();
	await page.waitForURL(/\/upload/);

	await page.setInputFiles('input[type="file"]', path.resolve(__dirname, "../fixtures/sample.pdf"));

	await page.getByRole("button", { name: /upload pdf/i }).click();

	await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
	await expect(page.getByText(/sample/i).first()).toBeVisible();

	await page.getByRole("button", { name: /^share$/i }).first().click();

	const shareUrlSpan = page.locator("span.truncate").filter({ hasText: /\/view\// }).first();
	await expect(shareUrlSpan).toBeVisible({ timeout: 10_000 });
	const shareText = (await shareUrlSpan.textContent())?.trim() ?? "";
	expect(shareText).toMatch(/\/view\//);

	const shareUrl = shareText.startsWith("http")
		? shareText
		: `http://localhost:3000${shareText}`;

	const anonCtx = await browser.newContext();
	const anon = await anonCtx.newPage();
	await anon.goto(shareUrl);

	await expect(anon.locator(".flipbook-container img").first()).toBeVisible({ timeout: 20_000 });

	await anonCtx.close();
	await ctx.close();
});
