const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('#react-login-form');

    const hasQuickLogin = await page.$('.quick-login-panel') !== null;
    const hasTestProfile = await page.$('.dev-sandbox-selector') !== null;

    console.log(`Quick Login Panel Exists: ${hasQuickLogin}`);
    console.log(`Test Profile Switcher Exists: ${hasTestProfile}`);

    // Login
    await page.type('#login-email', 'admin@projectmatrix.com');
    await page.type('#login-password', 'admin');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForSelector('.app-wrapper', { timeout: 5000 });
    
    // Check again for profile switcher
    const hasTestProfileAfterLogin = await page.$('.dev-sandbox-selector') !== null;
    console.log(`Test Profile Switcher Exists after Login: ${hasTestProfileAfterLogin}`);
    
    console.log(`Console Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log(errors);
    }
    
    console.log('Login Test PASSED.');
  } catch (err) {
    console.error('Test Failed:', err.message);
  } finally {
    await browser.close();
  }
})();
