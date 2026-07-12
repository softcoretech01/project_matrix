const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:5174/');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.type('input[type="email"]', 'admin@projectmatrix.com');
  await page.type('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Management Reports
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.menu-item span:nth-child(2)'));
    const target = links.find(el => el.textContent.trim() === 'Management Reports');
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Project Effort
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn'));
    const target = btns.find(btn => btn.textContent.includes('Project Effort Breakdown'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Planned vs Actual
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn'));
    const target = btns.find(btn => btn.textContent.includes('Planned vs Actual Task Effort'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Resource Allocations
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn'));
    const target = btns.find(btn => btn.textContent.includes('Resource Allocations Load'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Missing Timesheets
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.btn'));
    const target = btns.find(btn => btn.textContent.includes('Missing Timesheets Scans'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
