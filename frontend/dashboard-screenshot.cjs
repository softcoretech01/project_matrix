const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Login
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 1000));
    await page.type('input[type="email"]', 'pm1@projectmatrix.com'); // PM sees dashboard charts
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot
    await page.screenshot({ path: 'dashboard-error.jpg' });

    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
