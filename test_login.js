const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Intercept the login response to print the response body
  page.on('response', async response => {
    if (response.url().includes('login') && response.request().method() === 'POST') {
      console.log('Status:', response.status());
      const text = await response.text();
      console.log('Response body:', text);
      const requestPostData = response.request().postData();
      console.log('Request body:', requestPostData);
      console.log('Request headers:', response.request().headers());
    }
  });

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'kami@gmail.com');
  await page.fill('input[type="password"]', 'Blueoak123!');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(2000);
  await browser.close();
})();
