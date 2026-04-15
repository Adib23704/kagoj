import path from "node:path";
import { expect, test } from "@playwright/test";

test("signup → upload → share → view", async ({ browser }) => {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();

	const email = `user-${Date.now()}@example.com`;
	const password = "testpassword123";

	// Sign up — always redirects to /signin?registered=true
	await page.goto("/signup");
	await page.getByLabel(/name/i).fill("Test User");
	await page.getByLabel(/^email/i).fill(email);
	await page.getByLabel(/^password/i).fill(password);
	await page.getByLabel(/confirm/i).fill(password);
	await page.getByRole("button", { name: /create account/i }).click();

	// Signup redirects to /signin (with ?registered=true)
	await page.waitForURL(/\/(signin|dashboard)/, { timeout: 10_000 });

	if (page.url().includes("/signin")) {
		await page.getByLabel(/email/i).fill(email);
		await page.getByLabel(/password/i).fill(password);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard/);
	}

	// Navigate to upload page
	await page.getByRole("link", { name: /upload/i }).first().click();
	await page.waitForURL(/\/upload/);

	// The file input is hidden inside a <label>; setInputFiles works on hidden inputs
	await page.setInputFiles('input[type="file"]', path.resolve(__dirname, "../../fixtures/sample.pdf"));

	// After selecting file, the Upload PDF button appears
	await page.getByRole("button", { name: /upload pdf/i }).click();

	await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
	// The filename is "sample.pdf" — the card shows pdf.name which is set server-side
	await expect(page.getByText(/sample/i).first()).toBeVisible();

	// Create share link — "Share" button only appears when no share URL exists yet
	await page.getByRole("button", { name: /^share$/i }).first().click();

	// The share URL is rendered as a <span> with the full URL inside the share box
	const shareUrlSpan = page.locator("span.truncate").filter({ hasText: /\/view\// }).first();
	await expect(shareUrlSpan).toBeVisible({ timeout: 10_000 });
	const shareText = (await shareUrlSpan.textContent())?.trim() ?? "";
	expect(shareText).toMatch(/\/view\//);

	// Build the absolute share URL (span may contain the full URL or just the path)
	const shareUrl = shareText.startsWith("http")
		? shareText
		: `http://localhost:3000${shareText}`;

	// View share in a fresh incognito context
	const anonCtx = await browser.newContext();
	const anon = await anonCtx.newPage();
	await anon.goto(shareUrl);

	// The view page renders PDF pages as <img> elements (dataUrl) inside the flipbook
	// Wait for loading to finish first (Loader2 spinner disappears), then check img
	await expect(anon.locator(".flipbook-container img").first()).toBeVisible({ timeout: 20_000 });

	await anonCtx.close();
	await ctx.close();
});
