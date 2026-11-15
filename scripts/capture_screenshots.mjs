import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Spawning Google Chrome...');
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1600,1050',
    'http://localhost:3456',
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const res = await fetch('http://localhost:9222/json');
        const list = await res.json();
        const pageTab = list.find((t) => t.type === 'page');
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          wsUrl = pageTab.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    if (!wsUrl) {
      throw new Error('Failed to find Chrome WebSocket URL');
    }

    console.log('Connecting to Chrome CDP...');
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const curId = msgId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Waiting for initial page load...');
    await sleep(2500);

    // 1. Capture Startup Welcome Modal
    console.log('Capturing 01_startup_welcome.png...');
    let snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '01_startup_welcome.png'), Buffer.from(snap.data, 'base64'));

    // 2. Select Ar-Rasheed Smart University sample dataset
    console.log('Selecting Ar-Rasheed Smart University sample dataset...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const sampleBtn = buttons.find(b => b.textContent && (b.textContent.includes('Explore Sample University') || b.textContent.includes('استكشف النموذج الجامعي')));
          if (sampleBtn) sampleBtn.click();
        })()
      `,
    });
    await sleep(500);

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const arrasheedBtn = buttons.find(b => b.textContent && (b.textContent.includes('Ar-Rasheed') || b.textContent.includes('الرشيد')));
          if (arrasheedBtn) arrasheedBtn.click();
        })()
      `,
    });
    await sleep(2500);

    // 2. Capture Main Studio (Arabic)
    console.log('Capturing 02_main_studio_ar.png...');
    snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '02_main_studio_ar.png'), Buffer.from(snap.data, 'base64'));

    // 3. Switch to English
    console.log('Switching language to English...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const langBtn = buttons.find(b => b.textContent && b.textContent.includes('English'));
          if (langBtn) langBtn.click();
        })()
      `,
    });
    await sleep(1500);

    // 3. Capture Main Studio (English)
    console.log('Capturing 03_main_studio_en.png...');
    snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '03_main_studio_en.png'), Buffer.from(snap.data, 'base64'));

    // 4. Open Print Preview Modal
    console.log('Opening Print Preview Studio...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Switch to 'File' tab if needed or click quick access printer
          const quickPrint = document.querySelector('button[title*="Print"], button[title*="طباعة"]');
          if (quickPrint) {
            quickPrint.click();
            return;
          }
          const buttons = Array.from(document.querySelectorAll('button'));
          const fileTab = buttons.find(b => b.textContent && (b.textContent.trim() === 'File' || b.textContent.trim() === 'ملف'));
          if (fileTab) fileTab.click();
        })()
      `,
    });
    await sleep(500);

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const printBtn = buttons.find(b => b.textContent && (b.textContent.includes('Print Preview') || b.textContent.includes('معاينة الطباعة')));
          if (printBtn) printBtn.click();
        })()
      `,
    });
    await sleep(2000);

    console.log('Capturing 04_print_preview.png...');
    snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '04_print_preview.png'), Buffer.from(snap.data, 'base64'));

    // Close Print Preview
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close"], button.text-slate-400');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(1000);

    // 5. Open Basic Data Modal / University Specs
    console.log('Opening University Basic Data / Specification Modal...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const univBtn = buttons.find(b => b.textContent && (b.textContent.includes('University') || b.textContent.includes('الجامعة')));
          if (univBtn) univBtn.click();
        })()
      `,
    });
    await sleep(1500);

    console.log('Capturing 05_university_data.png...');
    snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOT_DIR, '05_university_data.png'), Buffer.from(snap.data, 'base64'));

    console.log('All screenshots captured successfully!');
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
