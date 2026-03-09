import { test, expect } from '@playwright/test';

test.use({ headless: false });

test('Arc Journal MVP Flow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes total for manual interaction
    // 1. Login
    await page.goto('http://localhost:3000');

    // Wait for user to sign in manually if needed, or if already signed in (session might persist if context reused found, but unlikely in fresh test)
    console.log('Please sign in manually in the browser window...');

    // Wait up to 2 minutes for the user to sign in and reach the dashboard
    await expect(page.getByText('This Week')).toBeVisible({ timeout: 120000 });
    await page.screenshot({ path: 'demo-screenshots/1-dashboard-empty.png' });

    // 3. Log Round
    await page.getByText('Log Round').click();
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await page.fill('input[type="text"]', 'Pebble Beach'); // Course is 2nd input? Type text selector is vague.
    // Let's use more specific selectors if possible or placeholder
    // The form has labels.
    await page.getByLabel('Course').fill('Pebble Beach');
    await page.getByLabel('Score').fill('82');
    await page.getByLabel('Penalties').fill('2');

    await page.getByLabel('Start Line').selectOption('L');
    await page.getByLabel('Curve').selectOption('L');

    await page.getByLabel('Attempts').fill('10');
    await page.getByLabel('Greens Hit').fill('4');
    await page.getByLabel('Contact').selectOption('flush');

    await page.getByRole('button', { name: 'Save Round' }).click();
    await expect(page.getByText('This Week')).toBeVisible(); // Redirected home
    await page.screenshot({ path: 'demo-screenshots/2-after-round-logged.png' });

    // 4. Log Session
    await page.getByText('Log Session').click();
    await page.getByLabel('Type').selectOption('range');
    await page.getByLabel('Notes').fill('Worked on grip pressure. Felt good.');
    await page.getByRole('button', { name: 'Save Session' }).click();
    await expect(page.getByText('This Week')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/3-after-session-logged.png' });

    // 5. Generate Week Card
    await page.getByText('Weekly Plan').click();
    await page.getByRole('button', { name: 'Generate Week Card' }).click();
    await expect(page.getByText('This Week')).toBeVisible();

    // Verify content
    await expect(page.getByText('In-Play Tee Ball')).toBeVisible();
    await expect(page.getByText('Trigger Grip / No Roll')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/4-week-card-generated.png' });

    // 6. Resources
    await page.getByText('Resources').click();
    await page.getByLabel('Title / Note').fill('Rotational Drill');
    await page.getByLabel('URL').fill('https://youtube.com/watch?v=123');
    await page.getByText('Add', { exact: true }).click(); // Button "Add"
    await expect(page.getByText('Rotational Drill')).toBeVisible();
    await page.screenshot({ path: 'demo-screenshots/5-resource-added.png' });
});
