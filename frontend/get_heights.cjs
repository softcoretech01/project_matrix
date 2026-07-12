const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 1000));
  await page.type('input[type="email"]', 'pm1@projectmatrix.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 10000));
  const heights = await page.evaluate(() => {
    return {
      cards: Array.from(document.querySelectorAll('.card')).map(c => ({ class: c.className, h: c.offsetHeight })),
      kpi: Array.from(document.querySelectorAll('.kpi-card')).map(c => ({ class: c.className, h: c.offsetHeight })),
      main: document.querySelector('.main-content')?.offsetHeight,
      body: document.querySelector('.content-body')?.offsetHeight
    };
  });
  console.log(JSON.stringify(heights, null, 2));
  await browser.close();
})();
