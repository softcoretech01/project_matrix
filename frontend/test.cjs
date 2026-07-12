const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5174/');
  await new Promise(r => setTimeout(r, 1000));
  
  // Login
  await page.type('input[type="email"]', 'admin@projectmatrix.com');
  await page.type('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('LOGGED IN');

  const clickMenu = async (name) => {
    await page.evaluate((menuName) => {
      const links = Array.from(document.querySelectorAll('.menu-item span:nth-child(2)'));
      const target = links.find(el => el.textContent.trim() === menuName);
      if (target) target.click();
      else console.log('Menu item not found: ' + menuName);
    }, name);
    await new Promise(r => setTimeout(r, 1000));
  };

  await clickMenu('Task Types');
  await page.screenshot({ path: 'task-types2.jpg' });

  await clickMenu('Module Master');
  await page.screenshot({ path: 'module-master.jpg' });
  
  await clickMenu('Management Reports');
  await page.screenshot({ path: 'reports.jpg' });
  
  await browser.close();
})();
