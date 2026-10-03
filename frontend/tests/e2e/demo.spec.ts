/**
 * End-to-end UI/UX verification against the REAL stack:
 * Next.js frontend (:3000) + FastAPI backend (:8000), no mocks.
 *
 * Every test also asserts zero console errors and zero CSP violations —
 * a nonce regression or a blocked resource fails the suite.
 *
 * Run: npx playwright test   (servers must already be up)
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

/** Collect console errors + page exceptions + CSP violations. */
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("home proves signing in the first viewport, with a clean console", async ({
  page,
}) => {
  const errors = watch(page);
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "ML-DSA Signature Demo" }),
  ).toBeVisible();
  // live proof above the fold: backend status + the KEYGEN→SIGN→VERIFY
  // route strip + line chips + the top of the operate plate
  await expect(page.getByText("API online")).toBeVisible();
  const strip = page.locator('section[aria-label="Signing route status"]');
  await expect(strip.getByText("Keygen")).toBeInViewport();
  await expect(strip.getByText("Sign", { exact: true })).toBeInViewport();
  await expect(strip.getByText("Verify", { exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "ML-DSA-65" })).toBeInViewport();
  await expect(page.getByTestId("keygen")).toBeVisible();

  expect(errors).toEqual([]);
});

test("signing session: keygen → sign → verify, both drills reject", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(page.getByText("API online")).toBeVisible();

  await page.getByTestId("keygen").click();
  await page.getByTestId("sign").click();
  await page.getByTestId("verify").click();
  await expect(page.locator('[data-verdict="valid"]')).toBeVisible();

  // drill 1: one flipped character in the message must be rejected
  await page.getByTestId("drill-message").click();
  await expect(page.getByTestId("notice")).toContainText(/tampered/i);
  await page.getByTestId("verify").click();
  await expect(page.locator('[data-verdict="invalid"]')).toBeVisible();

  // drill 2: a freshly generated key pair must not verify the old signature
  // (the drill verifies internally — no extra Verify click)
  await page.getByRole("button", { name: "Restore message" }).click();
  await page.getByTestId("drill-wrong-key").click();
  await expect(page.locator('[data-verdict="invalid"]')).toBeVisible();
  await expect(page.getByTestId("notice")).toContainText(
    /freshly generated key pair/i,
  );

  expect(errors).toEqual([]);
});

test("file interchange: sign → download .ml-dsa → verify → extract original", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(page.getByText("API online")).toBeVisible();
  await page.getByTestId("keygen").click();

  // 1 · upload a file and sign it with the real ML-DSA-65 backend
  await page.getByRole("button", { name: "File", exact: true }).click();
  const payload = Buffer.from(
    "Round-trip proof: signed in the browser, verified by FIPS 204 code.\n",
    "utf8",
  );
  await page.setInputFiles('input[aria-label="Choose a file to sign"]', {
    name: "quarterly.txt",
    mimeType: "text/plain",
    buffer: payload,
  });
  await page.getByTestId("sign").click();

  // 2 · download the signed container
  const [signed] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-signed").click(),
  ]);
  expect(signed.suggestedFilename()).toBe("quarterly.txt.ml-dsa");
  const signedPath = await signed.path();
  const signedBytes = fs.readFileSync(signedPath);
  expect(signedBytes.subarray(0, 8).toString("ascii")).toBe("MLDSAB01");

  // 3 · the reverse direction: open that exact file and verify it standalone
  await page.setInputFiles(
    'input[aria-label="Open a signed .ml-dsa file"]',
    signedPath,
  );
  await expect(page.getByTestId("notice")).toContainText("quarterly.txt");
  await page.getByTestId("verify").click();
  await expect(page.locator('[data-verdict="valid"]')).toBeVisible();

  // 4 · extract the original — byte-identical to what went in
  const [original] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-original").click(),
  ]);
  expect(original.suggestedFilename()).toBe("quarterly.txt");
  const extracted = fs.readFileSync(await original.path());
  expect(Buffer.compare(extracted, payload)).toBe(0);

  expect(errors).toEqual([]);
});

test("a tampered container is rejected and offers no extraction", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(page.getByText("API online")).toBeVisible();
  await page.getByTestId("keygen").click();
  await page.getByRole("button", { name: "File", exact: true }).click();

  await page.setInputFiles('input[aria-label="Choose a file to sign"]', {
    name: "integrity.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("integrity matters", "utf8"),
  });
  await page.getByTestId("sign").click();
  const [signed] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-signed").click(),
  ]);
  const tamperedPath = (await signed.path()) + ".tampered";
  const bytes = fs.readFileSync(await signed.path());
  bytes[bytes.length - 1] ^= 0x01;
  fs.writeFileSync(tamperedPath, bytes);

  await page.setInputFiles(
    'input[aria-label="Open a signed .ml-dsa file"]',
    tamperedPath,
  );
  await expect(page.getByTestId("notice")).toContainText("integrity.txt");
  await page.getByTestId("verify").click();
  await expect(page.locator('[data-verdict="invalid"]')).toBeVisible();
  await expect(page.getByTestId("download-original")).toHaveCount(0);

  expect(errors).toEqual([]);
});

for (const path of ["/about", "/contact", "/privacy"]) {
  test(`content page ${path} renders 200 with a clean console`, async ({
    page,
    request,
  }) => {
    const errors = watch(page);
    const res = await request.get(path);
    expect(res.status()).toBe(200);

    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // no placeholder text may survive to production
    const body = (await page.textContent("body")) ?? "";
    expect(body).not.toContain("[student name");
    expect(body).not.toContain("[contact email]");
    expect(errors).toEqual([]);
  });
}
