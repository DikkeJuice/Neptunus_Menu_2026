const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('http://localhost:8080'); // Assuming running python SimpleHTTPServer
  // Wait for dynamic elements to be inserted by app.js fetching the CSV
  await page.waitForTimeout(1000); 
  await page.screenshot({ path: 'menu_screenshot.png' });
  await browser.close();
})();
