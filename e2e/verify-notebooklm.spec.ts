
import { test, expect } from '@playwright/test';

test.use({ headless: false });

test('Verify NotebookLM Single Plane Rules', async ({ page }) => {
    // 10 minute timeout for manual login interaction if needed
    test.setTimeout(600000);

    console.log('--- STARTING VERIFICATION ---');
    // 1. Inject Mock Auth
    console.log('Injecting Mock Auth...');

    // Check if we are already logged in
    try {
        await page.goto('/');
        await expect(page.getByText('This Week')).toBeVisible({ timeout: 3000 });
        console.log('Already logged in based on existing session.');
    } catch {
        // Not logged in, force mock auth
        console.log('Not logged in. Forcing Mock Auth via localStorage...');
        await page.goto('/login');
        await page.evaluate(() => {
            console.log('Setting mock_auth_user in localStorage');
            localStorage.setItem('mock_auth_user', 'true');
        });

        console.log('Navigating to Dashboard...');
        await page.goto('/');
        await expect(page.getByText('This Week')).toBeVisible({ timeout: 15000 });
        console.log('Logged in via Mock Auth!');
    }

    // 2. Log a "Slice" Round
    console.log('Logging "Slice" Round to trigger new rules...');
    await page.goto('/log-round');

    // Fill form
    await page.getByLabel('Course').fill('Verification Course');
    await page.getByLabel('Date').fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel('Score').fill('88');
    await page.getByLabel('Penalties').fill('4'); // High penalties to trigger priority

    // Trigger SLICE logic: Miss Right + Curve Right
    await page.getByLabel('Start Line').selectOption('R');
    await page.getByLabel('Curve').selectOption('R');

    // Stats
    await page.getByLabel('Attempts').fill('14');
    await page.getByLabel('Greens Hit').fill('5');
    await page.getByLabel('Contact').selectOption('solid');

    await page.getByRole('button', { name: 'Save Round' }).click();

    // Wait for redirect
    await expect(page.getByText('This Week')).toBeVisible();

    // 3. Verify Week Card Logic
    console.log('Verifying Week Card...');
    await page.goto('/week');

    // Click Generate if not present (logic might require it)
    if (await page.getByRole('button', { name: 'Generate Week Card' }).isVisible()) {
        await page.getByRole('button', { name: 'Generate Week Card' }).click();
    }

    // CHECK FOR NEW NOTEBOOKLM CONTENT
    // "Check 'The Claw' Grip"
    // "Ensure Trail Hand is Under"

    await expect(page.getByText("The Claw")).toBeVisible();
    await expect(page.getByText("Trail Hand is Under")).toBeVisible();

    console.log('VERIFICATION SUCCESS: Found "The Claw" and "Trail Hand" rules!');

    // Take evidence screenshot
    await page.screenshot({ path: 'verification-success.png', fullPage: true });
});
