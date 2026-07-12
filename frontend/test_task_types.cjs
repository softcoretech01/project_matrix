const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Login
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 1000));
    await page.type('input[type="email"]', 'admin@projectmatrix.com');
    await page.type('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    
    // Expand Master Management if necessary
    await page.evaluate(() => {
      const ms = Array.from(document.querySelectorAll('.menu-section-header'));
      const target = ms.find(el => el.textContent.trim().includes('Master Management'));
      if (target && !target.classList.contains('expanded')) target.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Task Types
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.menu-item span:nth-child(2)'));
      const target = links.find(el => el.textContent.trim() === 'Task Types');
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Click + Add Task Type
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn-primary'));
      const target = btns.find(btn => btn.textContent.includes('Add'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Fill form
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('.form-control');
      inputs[0].value = 'TT008';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      
      inputs[1].value = 'Demo Task';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      
      inputs[2].value = 'Demo Description';
      inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    // Save
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn-primary'));
      const target = btns.find(btn => btn.textContent.includes('Save'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot
    await page.screenshot({ path: 'task-types-verification.jpg' });
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
