const { chromium } = require('playwright');

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	page.on('console', msg => {
		if (msg.type() === 'error') {
			console.log('PAGE ERROR:', msg.text());
		}
	});

	page.on('pageerror', error => {
		console.log('UNCAUGHT ERROR:', error.message, "\n", error.stack);
	});

	try {
		console.log("Navigating to login...");
		await page.goto('http://localhost:5176/login', { waitUntil: 'networkidle' });

		console.log("Filling in credentials...");
		await page.fill('input[type="email"]', 'test@test.com');
		await page.fill('input[type="password"]', 'testpass');
		await page.click('button:has-text("Sign In")');

		console.log("Waiting for dashboard...");
		await page.waitForTimeout(3000);

		console.log("Checking dashboard...");
		await page.goto('http://localhost:5176/dashboard', { waitUntil: 'networkidle' });
		await page.waitForTimeout(2000);

		const designsCount = await page.locator('text=Designs').count();
		console.log("Found designs?", designsCount > 0);
	} catch (err) {
		console.error(err);
	}

	await browser.close();
})();
