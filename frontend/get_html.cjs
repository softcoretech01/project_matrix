const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="email"]', 'emp1@projectmatrix.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  const html = await page.evaluate(() => document.querySelector('.main-content')?.innerHTML);
  console.log(html);
  await browser.close();
})();
