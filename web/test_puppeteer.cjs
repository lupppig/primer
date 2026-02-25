const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('UNCAUGHT ERROR:', error.message);
  });
  
  try {
    await page.goto('http://localhost:5176/dashboard', { waitUntil: 'networkidle0' });
    console.log("Navigated, clicking button...");
    await page.click('text=Create New Design');
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error(err);
  }
  
  await browser.close();
})();
