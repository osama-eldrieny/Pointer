const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const config = require('./config.json');


const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIU_9jZkued8MPl6pgFDl7K71jlm48HQLuiFWGH06LUwiyMJsLkufoQePm5NQ68pZS/exec';

const app = express();
const PORT = config.server_port || 3001;
const COMMENTS_FILE = path.join(__dirname, config.comments_file);
const PENDING_APPLY_FILE = path.join(__dirname, './pending-apply.json');
const URL_MAPPINGS_FILE = path.join(__dirname, './url-mappings.json');

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10mb' }));

// Serve favicon with long cache (7 days)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, '..', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.set('Cache-Control', 'public, max-age=604800'); // 7 days
    res.sendFile(faviconPath);
  } else {
    res.status(404).send('Favicon not found');
  }
});

app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.ico') || path.endsWith('favicon.ico')) {
      res.set('Cache-Control', 'public, max-age=604800'); // 7 days
    }
  }
}));
app.use(express.static(__dirname));


const readComments = () => {
  try {
    if (!fs.existsSync(COMMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading comments.json:', e.message);
    return [];
  }
};

const writeComments = (data) => {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing comments.json:', e.message);
    throw e;
  }
};

const readPendingApply = () => {
  try {
    if (!fs.existsSync(PENDING_APPLY_FILE)) return [];
    return JSON.parse(fs.readFileSync(PENDING_APPLY_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading pending-apply.json:', e.message);
    return [];
  }
};

const writePendingApply = (data) => {
  try {
    fs.writeFileSync(PENDING_APPLY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing pending-apply.json:', e.message);
    throw e;
  }
};

const readMappings = () => {
  try {
    if (!fs.existsSync(URL_MAPPINGS_FILE)) return [];
    return JSON.parse(fs.readFileSync(URL_MAPPINGS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading url-mappings.json:', e.message);
    return [];
  }
};

const writeMappings = (data) => {
  try {
    fs.writeFileSync(URL_MAPPINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing url-mappings.json:', e.message);
    throw e;
  }
};

const getMappedOrigins = (origin) => {
  const mappings = readMappings();
  for (const group of mappings) {
    if (group.origins.includes(origin)) {
      return group.origins.filter(o => o !== origin);
    }
  }
  return [];
};

const generateId = () => 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const generateReplyId = () => 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

const mapUrlToFilePath = (pageUrl) => {
  try {
    // Extract the origin (protocol + host) from the URL dynamically
    const url = new URL(pageUrl);
    const urlBase = `${url.protocol}//${url.host}`;
    const relativePath = pageUrl.replace(urlBase, '');
    const filePath = path.join(config.project_root || '../', relativePath);
    return filePath;
  } catch (e) {
    return null;
  }
};

app.get('/inject.js', (req, res) => {
  const injectionPath = path.join(__dirname, 'inject.js');
  if (!fs.existsSync(injectionPath)) {
    res.status(404).send('inject.js not found');
    return;
  }
  res.type('application/javascript');
  res.send(fs.readFileSync(injectionPath, 'utf8'));
});

app.get('/api/check-changes', (req, res) => {
  const { html_file_path } = req.query;
  if (!html_file_path) {
    return res.status(400).json({ error: 'html_file_path query param required' });
  }

  try {
    // Resolve path from current directory (comments-skill) up to project root
    const filePath = path.resolve(__dirname, html_file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found: ' + filePath });
    }

    const stats = fs.statSync(filePath);
    res.json({
      lastModified: stats.mtimeMs,
      mtime: stats.mtime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/bookmarklet', (req, res) => {
  const bookmarklet = "javascript:(function(){localStorage.setItem('hct_backend_url','http://localhost:3001');var s=document.createElement('script');s.src='http://localhost:3001/inject.js?t='+Date.now();document.head.appendChild(s);})()"
  const faviconDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAACDlJREFUWEedVwtwVNUV/c7bM5M3k5k3mXnPTCbzSAgJJIGESIoiKIiiVvF1rRU/WH1VW4vW1vqprbZW21psbWutbW1ta62tFUSKioIiohJBEyC8n5m87869d587M5n5Mpl5x3POnHvPPWfdveeeu/c9TBs3btyzc+fOQyMjI/WDg4N1AwMDdcPDw3WpVKrO7/fjdDrxer24XC5cLhdutzuqVCqVm5ubm/nJJ59kPvvss1U///nPV+3atWvVT37yk1Vbt25d+fnnn6+66qqrlt10003LVqxYsfy6665bcfXVVy+/4YYblt9+++3Lt27duuqLL75Y9d1331W98847VX/+85+revfdd9WPPvpoVVdXV1VXV1dVZ2dnVU9PT1V/f39VX19f1cDAQNXY2FhVKpWqu+6661KDg4NVH3/88XKPx7N8/fr1y+fOnbt8/vz5y2+55ZblixYtWn7bbbctX7RoUXnBggXLZ8+evXzBggXLP/jgg1Wffvop/uyzz1Z+8skny1977bVKv99f+f7771d++OGHVe+//37lxx9/vPLdd9+t/PjjjysffPDByldffXXlN998s/Krr75a+f333y9/7bXXVv74449XHjx4cOWBAweWf/7558tff/31lW+88cbKN998c+UbbyyS/PjHPy7Zu3dv5UsvvVT58ssvr3zppZcqnn/++Yo33nhj5aeffnrlZ599tvKrr75a+fXXX698++23l3/xxRcr33///eXvvvvuyh9//HHlsWPHlh8/fnzlsWPHllcqlRUHDx5cfuLEiRXHjh1bfuLEiRUnTpxYcfz48RUnTpxYcfLkyRUnT55cce7cuRXnzp1bce7cuRXnzp1bcebMmRVnzpxZceHChRXnz59fcf78+RXnzp3jnD9/fsW5c+dWnDt3bsW5c+dWnDlzhvPf//73K86fP7/i/PnzK8+fP7/i3LlzK8+dO7fi3Llzz2POnDkrzp07t/Kdd96tvPPOOyvvvPPOyrvuuqvy7rvvrvzggw8qP/nkk8pPPvmk8pNPPqn85JNPKj/55JPK//73v8qvvvqq8quvvqr88ssvK7/66qvKr776qvLLL7+s/Pzzzyf++te/Tv74xz+u/Otf/1r597//vfLvf/975V9//XXl3//+98pPPvmk8pNPPql89tllKt/73veW/+tf/1r5+eefV37++ecVn3/++Yp//OMfK7/88stKj8ez8r777lv+6KOPrvzNb36z8uGHH175m9/8ZuWjjz668kknnVR5ww03VN50003VN910U+XNN9+88pZbbqn89a9/vfLXv/71yn/+858rP/nkk8pPP/208rPPPqv89ttvK7/99tvK7777rvLdd9+t/O9//1v57bffVv7nf/+t/PDDD6t+/etfr/rVr3618le/+tWqhx56aOVvf/vbVb/97W9X/fa3v135+9//vvIPf/jDqj/96U+r/vSnP636y1/+suoff/jDqv/+978rX3/99ZWVX3zxxZXf/va3K//P//k/V/7hD3+oeusf/nBV5X//938rv/jii1VfffXVlVRfXr1yVVVXXl1S+dxzz63Eay/a6ysQzSLeLy9jFktDrp9vUHk1jFSTYEyNEUKRKJWHuLdl3mAyXFRqNPZ0FBf79eT6aSFBZZJQISmvxCL5SJlV1YtQu74p8aRQ8yJGO0s0aq6N2DuD2kA4pLlFsWpR7T2wm5j7e8VNEq6WpA/E/QmkIxL9eHKN7KcBQiGvQa6J7aWvNz2aKVlOVj49V8/fKNV5A5KhjCqZp4c8d/J0qUSGYVdxfzJy6TdJVMHVXpQkIkWnDFUZrNMDdCXG8q5k4RNRhLyGXmGOqL0tU8Vc0BmXOq9/oNzqcK1VzLx6e55T0n8mYGUl3TTUnbKL5ZbI3WqbGqcJVGmz3I4pAOmN7eOGsoW8D5pFr6i5MqMcqJYtWf5VbLp/p0Yrv8jJcf8WU46R7MVVzUNf6PaXHx9DYHmA3t/mQPDqFmLmJAXXwVpVWd0P/lT3+CqkU3L8M6sLo8e4vCPKcKf8sImMUv3h3g5FJWVxEbD78GZJD4qpUmX8Bm5KmMqJ8eGSiNDqrZMrqGqcsZdVZ5GULHqxFRs75TBpgKqNhKvVXBd2Tg23s4ywSmEOBXLn0LRPrx1bnmxLKlvMqBbfXP+6N+c89l8d30EgYdWVfS6mHEhqyGS7Pj04Zm6bZkHVmxW+YHyPP5bCKxOZmYKM1Dk3JdaJh7JfN2FfmU7RuMHtqYYrQhT2TGvuG5rPtEHmPUgPKiPtFVPeLEj+PoXKd3TfFkp+36f6ubFf04YLeJmHmxSNq9h6jEA2PL6zUoQiqwKB5XPF+TzwVuiDSvTMJr3a4LOiHvmXqOLWJPK5oqIQ3FGSMVPvqMgj9qbozAjM3LqGGfJuqNvhCCCSvyxQD2U6jgxA5bNqSUyFGvOPF0Rk0KKMqQScmXKsYTJpFNEKpFM0hbGHBcXVGZdH5fxhMzNq4w5NJNvnFwIpJnBm3nWgZSvx9h1vLIh5YzDI+dGxQxPJ6I8TnUqKDhCEQRKIZSF5AK5J9A1VRqfP6eCfE2+XxP/D5A8TJLcXXqBEe/dXvC0k3T0eGJO96BuKTMOWrE/FYq+KZzR4r9QMqxKN/Jzse/4f3eFl1A+3dCRkpKwvjsdcdZaGYYqUMqqPZaMw74WB+hh6n4V3YHXmY5Xc9DmuP6IQNLNEe3Z4Tyl0K1wYLVLjQhRqAY5R0OslMxHLJdVLYHkV/EjvLLEr3zyPLF7Pxzy1j6yg9L8F9A9qr7QRGNLVYqkFPBMxwcvU=";
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🐕 Pointer</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .content-wrapper { max-width: 900px; width: 100%; }
        h1 { color: #1f2937; font-size: 32px; margin-bottom: 24px; text-align: center; }
        .setup-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; transition: all 0.2s; }
        .setup-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); }
        h2 { color: #374151; font-size: 18px; margin-top: 32px; margin-bottom: 12px; }
        p { color: #4b5563; line-height: 1.8; margin: 12px 0; }
        .bookmark-container { background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
        a.bookmark { display: inline-flex; align-items: center; justify-content: center; padding: 12px; text-decoration: none; border-radius: 12px; cursor: grab; font-weight: 600; font-size: 15px; user-select: none; transition: all 0.3s ease; border: 3px dashed #2563eb; }
        a.bookmark img { width: 80px; height: 80px; border-radius: 10px; }
        a.bookmark:hover { box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25); transform: translateY(-2px); cursor: grab; }
        a.bookmark:active { cursor: grabbing; }
        .instruction-steps { background: #eff6ff; padding: 16px; border-radius: 4px; margin: 16px 0; }
        .instruction-steps li { margin: 8px 0; color: #1e40af; }
        .code-block { background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; font-family: 'Courier New', monospace; overflow-x: auto; margin: 12px 0; font-size: 12px; }
        .success-icon { font-size: 20px; margin-right: 8px; }
        .step-number { display: inline-block; background: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 12px; }
      </style>
    </head>
    <body>
      <div class="content-wrapper">
        <h1>🐕 Pointer Bookmarklet Setup</h1>

      <h2 style="margin-top: 32px; margin-bottom: 24px; text-align: center; color: #374151;">Choose Your Setup Method</h2>

      <div style="display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px;">
        <!-- Method 1: Drag -->
        <div class="setup-card">
          <div style="background: #dbeafe; color: #1e40af; padding: 12px; border-radius: 8px; font-weight: 600; margin-bottom: 16px; text-align: center;">Quick setup: Drag</div>
          <a href="${bookmarklet}" class="bookmark" draggable="true" title="🐕 Pointer" style="margin-bottom: 16px;">
            <img src="https://uimarkets.com/images/pointer/assets/images/pointer-icon.png" alt="🐕 Pointer">
          </a>
          <p style="font-size: 14px; color: #0f172a; font-weight: 600; margin-bottom: 12px;">Drag this icon to your bookmarks bar</p>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">Click and hold the icon above, then drag it to your browser's bookmarks bar at the top.</p>
        </div>

        <!-- Method 2: Manual -->
        <div class="setup-card">
          <div style="background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; font-weight: 600; margin-bottom: 16px; text-align: center; width: 100%;">Manual setup: Copy</div>
          <ol style="font-size: 13px; color: #6b7280; padding-left: 20px; margin: 0; line-height: 1.8; width: 100%;">
            <li>Right-click bookmarks bar</li>
            <li>Choose "Add page"</li>
            <li style="margin-bottom: 12px;">Copy this code:
              <div style="position: relative; margin-top: 8px; width: 100%;">
                <button onclick="copyBookmarklet()" style="position: absolute; top: 8px; right: 8px; background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; z-index: 10;">
                  <span id="copyText">📋 Copy</span>
                </button>
                <div class="code-block" id="codeBlock" style="word-break: break-all; width: 100%; max-width: 100%; cursor: pointer; padding-right: 80px; box-sizing: border-box;">
                  <span style="color: #d4604f;">javascript</span><span style="color: #e8e8e8;">:</span><span style="color: #7bb8d4;">(</span><span style="color: #7bb8d4;">function</span><span style="color: #7bb8d4;">(){</span><span style="color: #7bb8d4;">var</span><span style="color: #e8e8e8;"> s</span><span style="color: #e8e8e8;">=</span><span style="color: #6ba31f;">document</span><span style="color: #e8e8e8;">.</span><span style="color: #7bb8d4;">createElement</span><span style="color: #7bb8d4;">(</span><span style="color: #a6d054;">'script'</span><span style="color: #7bb8d4;">);</span><span style="color: #e8e8e8;">s</span><span style="color: #e8e8e8;">.</span><span style="color: #e8e8e8;">src</span><span style="color: #e8e8e8;">=</span><span style="color: #a6d054;">'http://localhost:3001/inject.js?t='</span><span style="color: #e8e8e8;">+</span><span style="color: #6ba31f;">Date</span><span style="color: #e8e8e8;">.</span><span style="color: #7bb8d4;">now</span><span style="color: #7bb8d4;">();</span><span style="color: #6ba31f;">document</span><span style="color: #e8e8e8;">.</span><span style="color: #e8e8e8;">head</span><span style="color: #e8e8e8;">.</span><span style="color: #7bb8d4;">appendChild</span><span style="color: #7bb8d4;">(</span><span style="color: #e8e8e8;">s</span><span style="color: #7bb8d4;">);</span><span style="color: #7bb8d4;">})()</span>
                </div>
              </div>
            </li>
            <li>Paste code in URL field</li>
            <li>Name it "🐕 Pointer"</li>
          </ol>
        </div>
      </div>

      <h2>How It Works</h2>
      <div class="instruction-steps">
        <ol>
          <li><strong>Bookmark added:</strong> The Pointer icon appears in your bookmarks bar</li>
          <li><strong>Open your HTML page:</strong> Visit any localhost project in your browser</li>
          <li><strong>Click the Pointer bookmarklet:</strong> Click the icon from your bookmarks to activate</li>
          <li><strong>Start commenting:</strong> Use the toolbar to add comments to elements</li>
        </ol>
      </div>


      <h2>⚠️ Important: Keep the Server Running</h2>
      <p style="color: #7c2d12; background: #fed7aa; padding: 12px; border-radius: 4px;">The terminal running the Pointer server (port 3001) <strong>must stay open</strong> for the bookmarklet to work. Keep it running in the background while you use the tool.</p>

      <h2>✨ Ready?</h2>
      <p>Go back to your HTML page and click the <strong>Pointer icon</strong> from your bookmarks bar to start giving feedback on elements!</p>
      </div>
      <script>
        function copyBookmarklet() {
          const code = "javascript:(function(){localStorage.setItem('hct_backend_url','http://localhost:3001');var s=document.createElement('script');s.src='http://localhost:3001/inject.js?t='+Date.now();document.head.appendChild(s);})()";
          navigator.clipboard.writeText(code).then(() => {
            const btn = document.querySelector('[onclick="copyBookmarklet()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.background = '#16a34a';
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.background = '#2563eb';
            }, 2000);
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/mappings', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🐕 Pointer — Environment Mappings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f8fafc; color: #0f172a; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        .header-actions { display: flex; gap: 12px; margin-bottom: 24px; }
        .header-actions button { padding: 10px 16px; font-size: 14px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; }
        .header-actions button:hover { background: #f1f5f9; }
        .header-actions button.primary { background: #2563eb; color: white; border-color: #2563eb; }
        .header-actions button.primary:hover { background: #1d4ed8; }
        .groups-container { display: flex; flex-direction: column; gap: 16px; }
        .group { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .group-title { font-size: 16px; font-weight: 600; color: #0f172a; }
        .delete-btn { background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .delete-btn:hover { background: #b91c1c; }
        .origins-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .origin-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8fafc; border-radius: 4px; font-family: monospace; font-size: 13px; }
        .origin-item .remove-btn { background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
        .remap-section { background: #f1f5f9; padding: 12px; border-radius: 4px; display: flex; gap: 8px; align-items: center; }
        .remap-section select { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
        .remap-section button { background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .remap-section button:hover { background: #1d4ed8; }
        .status { font-size: 12px; color: #666; margin-top: 8px; }
        .add-group-form { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-weight: 500; font-size: 13px; margin-bottom: 4px; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
        .form-group button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .form-group button:hover { background: #1d4ed8; }
        .nav-links { font-size: 13px; color: #2563eb; margin-top: 24px; }
        .nav-links a { cursor: pointer; text-decoration: underline; margin-right: 16px; }
        .nav-links a:hover { text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="margin-bottom: 24px;">
          <h1>🐕 Pointer — Environment Mappings</h1>
          <div class="header-actions">
            <button class="primary" onclick="showAddForm()">+ New Mapping Group</button>
            <button onclick="exportZip()">📦 Export ZIP</button>
          </div>
        </div>

        <div id="addForm" class="add-group-form" style="display: none;">
          <h3>Create New Mapping Group</h3>
          <div class="form-group">
            <label>Label (e.g., "Company Dev"):</label>
            <input type="text" id="newLabel" placeholder="Company Dev">
          </div>
          <div class="form-group">
            <label>Origins (one per line, e.g., https://dev.company.com):</label>
            <textarea id="newOrigins" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-size: 13px;" placeholder="https://dev.company.com&#10;http://localhost:3000"></textarea>
          </div>
          <button onclick="createMapping()">Create Group</button>
          <button onclick="cancelAdd()" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 8px;">Cancel</button>
        </div>

        <div id="groups" class="groups-container"></div>

        <div class="nav-links">
          <a onclick="goToBookmarklet()">← Bookmarklet Setup</a>
          <a onclick="goToImport()">📥 Import from Teammate</a>
        </div>
      </div>

      <script>
        const API_URL = 'http://localhost:3001';

        function showAddForm() {
          document.getElementById('addForm').style.display = 'block';
        }

        function cancelAdd() {
          document.getElementById('addForm').style.display = 'none';
          document.getElementById('newLabel').value = '';
          document.getElementById('newOrigins').value = '';
        }

        function createMapping() {
          const label = document.getElementById('newLabel').value.trim();
          const originsText = document.getElementById('newOrigins').value.trim();

          if (!label || !originsText) {
            alert('Please enter a label and at least one origin.');
            return;
          }

          const origins = originsText.split('\\n').map(o => o.trim()).filter(o => o);
          if (origins.length === 0) {
            alert('Please enter at least one origin.');
            return;
          }

          fetch(\`\${API_URL}/api/url-mappings\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, origins })
          })
            .then(r => r.json())
            .then(() => {
              cancelAdd();
              loadMappings();
            })
            .catch(err => alert('Error: ' + err.message));
        }

        function deleteMapping(id) {
          if (!confirm('Delete this mapping group?')) return;

          fetch(\`\${API_URL}/api/url-mappings/\${id}\`, { method: 'DELETE' })
            .then(() => loadMappings())
            .catch(err => alert('Error: ' + err.message));
        }

        function removeOrigin(id, origin) {
          fetch(\`\${API_URL}/api/url-mappings/\${id}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origins: null }) // Will need to refetch and filter
          })
            .then(() => loadMappings())
            .catch(err => alert('Error: ' + err.message));
        }

        function remapComments(id) {
          const selects = document.querySelectorAll(\`#group-\${id} select\`);
          if (selects.length < 2) {
            alert('Please select both origins.');
            return;
          }

          const from_origin = selects[0].value;
          const to_origin = selects[1].value;

          if (!from_origin || !to_origin || from_origin === to_origin) {
            alert('Please select two different origins.');
            return;
          }

          fetch(\`\${API_URL}/api/url-mappings/\${id}/remap\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_origin, to_origin })
          })
            .then(r => r.json())
            .then(result => {
              alert(\`Remapped \${result.remapped} comments from \${from_origin} to \${to_origin}\`);
              loadMappings();
            })
            .catch(err => alert('Error: ' + err.message));
        }

        function exportZip() {
          window.location.href = \`\${API_URL}/api/export\`;
        }

        function goToBookmarklet() {
          window.location.href = \`\${API_URL}/bookmarklet\`;
        }

        function goToImport() {
          window.location.href = \`\${API_URL}/import\`;
        }

        function loadMappings() {
          fetch(\`\${API_URL}/api/url-mappings\`)
            .then(r => r.json())
            .then(mappings => {
              const container = document.getElementById('groups');
              if (mappings.length === 0) {
                container.innerHTML = '<p style="color: #666; font-size: 14px;">No mapping groups yet. Click "+ New Mapping Group" to create one.</p>';
                return;
              }

              container.innerHTML = mappings.map(group => \`
                <div class="group" id="group-\${group.id}">
                  <div class="group-header">
                    <div class="group-title">\${group.label}</div>
                    <button class="delete-btn" onclick="deleteMapping('\${group.id}')">🗑 Delete</button>
                  </div>
                  <div class="origins-list">
                    \${group.origins.map(origin => \`
                      <div class="origin-item">
                        <span>\${origin}</span>
                      </div>
                    \`).join('')}
                  </div>
                  <div class="remap-section">
                    <select>
                      <option value="">From origin</option>
                      \${group.origins.map(o => \`<option value="\${o}">\${o}</option>\`).join('')}
                    </select>
                    <span>→</span>
                    <select>
                      <option value="">To origin</option>
                      \${group.origins.map(o => \`<option value="\${o}">\${o}</option>\`).join('')}
                    </select>
                    <button onclick="remapComments('\${group.id}')">Sync comments →</button>
                  </div>
                </div>
              \`).join('');
            })
            .catch(err => {
              console.error('Error loading mappings:', err);
              document.getElementById('groups').innerHTML = '<p style="color: #666;">Unable to load mappings.</p>';
            });
        }

        // Load on page load
        loadMappings();
      </script>
    </body>
    </html>
  `);
});

app.get('/import', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🐕 Pointer — Import Team Comments</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f8fafc; color: #0f172a; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        .instructions { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .upload-section { background: white; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 40px; text-align: center; margin-bottom: 24px; cursor: pointer; transition: all 0.2s; }
        .upload-section:hover { border-color: #2563eb; background: #f0f9ff; }
        .upload-section input { display: none; }
        .upload-section p { margin: 0; color: #666; font-size: 14px; }
        .upload-section .big-text { font-size: 24px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
        .preview-section { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; display: none; }
        .preview-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
        .url-mapping { background: #f8fafc; padding: 12px; border-radius: 4px; margin-bottom: 12px; }
        .url-mapping input { width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; margin-top: 6px; font-family: monospace; }
        .url-mapping label { display: block; font-size: 12px; color: #666; margin-top: 4px; }
        .import-button { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .import-button:hover { background: #1d4ed8; }
        .import-button:disabled { background: #cbd5e1; cursor: not-allowed; }
        .status { font-size: 13px; color: #666; margin-top: 8px; }
        .success { color: #16a34a; }
        .nav-links { font-size: 13px; color: #2563eb; margin-top: 24px; }
        .nav-links a { cursor: pointer; text-decoration: underline; margin-right: 16px; }
        .nav-links a:hover { text-decoration: none; }
        .error { color: #dc2626; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🐕 Pointer — Import Team Comments</h1>

        <div class="instructions">
          <p><strong>How to import comments from a teammate:</strong></p>
          <ol style="font-size: 14px; line-height: 1.6; color: #666;">
            <li>Teammate exports their comments → shares the ZIP file with you</li>
            <li>Upload the ZIP file below</li>
            <li>Map the teammate's URLs to your local URLs</li>
            <li>Click "Import" to merge all comments</li>
          </ol>
        </div>

        <div class="upload-section" onclick="document.getElementById('zipFile').click()">
          <input type="file" id="zipFile" accept=".zip" onchange="handleFileUpload(event)">
          <div class="big-text">📦 Drop ZIP here or click to upload</div>
          <p>Upload pointer-export.zip from a teammate</p>
        </div>

        <div id="preview" class="preview-section">
          <div class="preview-title">Import Preview</div>
          <div id="preview-content"></div>
          <button class="import-button" onclick="importComments()">Import Comments</button>
          <div class="status" id="status"></div>
        </div>

        <div class="nav-links">
          <a onclick="window.location.href='http://localhost:3001/mappings'">← Manage Mappings</a>
          <a onclick="window.location.href='http://localhost:3001/bookmarklet'">← Bookmarklet Setup</a>
        </div>
      </div>

      <script>
        const API_URL = 'http://localhost:3001';
        let stagingData = null;

        function handleFileUpload(event) {
          const file = event.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (e) => {
            // Send ZIP to server for processing
            const formData = new FormData();
            formData.append('zip', file);

            document.getElementById('status').textContent = 'Processing ZIP...';
            document.getElementById('preview').style.display = 'block';

            fetch(\`\${API_URL}/api/import-process\`, {
              method: 'POST',
              body: formData
            })
              .then(r => r.json())
              .then(data => {
                if (data.error) {
                  document.getElementById('status').className = 'status error';
                  document.getElementById('status').textContent = 'Error: ' + data.error;
                  return;
                }

                stagingData = data;
                showPreview(data);
              })
              .catch(err => {
                document.getElementById('status').className = 'status error';
                document.getElementById('status').textContent = 'Error: ' + err.message;
              });
          };
          reader.readAsArrayBuffer(file);
        }

        function showPreview(data) {
          const preview = document.getElementById('preview-content');
          const mappings = data.mappings || [];

          if (mappings.length === 0) {
            preview.innerHTML = '<p style="color: #666; font-size: 13px;">No origins found in the import.</p>';
            return;
          }

          preview.innerHTML = mappings.map((m, i) => \`
            <div class="url-mapping">
              <div style="font-weight: 500; font-size: 13px; margin-bottom: 8px;">
                <span style="color: #666;">\${m.comment_count} comments from</span> <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 2px; font-size: 11px;">\${m.imported_origin}</code>
              </div>
              <label>Map to local URL:</label>
              <input type="text" id="mapping-\${i}" value="\${m.suggested_local || ''}" placeholder="e.g., http://localhost:3000">
            </div>
          \`).join('');

          document.getElementById('status').className = 'status';
          document.getElementById('status').textContent = \`Ready to import \${data.total_comments} comments. Configure origin mappings above.\`;
        }

        function importComments() {
          if (!stagingData) return;

          const urlMap = {};
          (stagingData.mappings || []).forEach((m, i) => {
            const input = document.getElementById(\`mapping-\${i}\`);
            const localUrl = input.value.trim();
            if (localUrl) {
              urlMap[m.imported_origin] = localUrl;
            }
          });

          if (Object.keys(urlMap).length === 0) {
            alert('Please configure at least one origin mapping.');
            return;
          }

          document.getElementById('status').textContent = 'Importing...';

          fetch(\`\${API_URL}/api/import-confirm\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url_map: urlMap })
          })
            .then(r => r.json())
            .then(result => {
              if (result.error) {
                document.getElementById('status').className = 'status error';
                document.getElementById('status').textContent = 'Error: ' + result.error;
                return;
              }

              document.getElementById('status').className = 'status success';
              document.getElementById('status').innerHTML = \`✓ Imported \${result.imported} comments. \${result.duplicates_skipped > 0 ? result.duplicates_skipped + ' duplicates skipped.' : ''}<br>Visit your pages to see the imported pins. Orphaned pins can be placed manually.\`;
              document.getElementById('preview').style.display = 'none';
              setTimeout(() => {
                document.getElementById('zipFile').value = '';
                document.getElementById('preview').style.display = 'none';
                document.getElementById('status').textContent = '';
              }, 3000);
            })
            .catch(err => {
              document.getElementById('status').className = 'status error';
              document.getElementById('status').textContent = 'Error: ' + err.message;
            });
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/api/comments', (req, res) => {
  const { page_url } = req.query;
  if (!page_url) {
    return res.status(400).json({ error: 'page_url query param required' });
  }

  try {
    const url = new URL(page_url);
    const origin = `${url.protocol}//${url.host}`;
    const pathname = url.pathname + url.search;

    // Get all mapped origins for this origin
    const mappedOrigins = getMappedOrigins(origin);
    const equivalentOrigins = [origin, ...mappedOrigins];

    // Build list of equivalent URLs
    const equivalentUrls = equivalentOrigins.map(o => o + pathname);

    const allComments = readComments();
    const pageComments = allComments
      .filter(c => equivalentUrls.includes(c.page_url))
      .map(c => {
        // For cross-env comments, normalize page_url to the requested URL
        if (c.page_url !== page_url && equivalentUrls.includes(c.page_url)) {
          return { ...c, page_url: page_url, _is_cross_env: true };
        }
        return c;
      });

    res.json(pageComments);
  } catch (e) {
    console.error('Error in GET /api/comments:', e.message);
    // Fallback to strict matching if URL parsing fails
    const allComments = readComments();
    const pageComments = allComments.filter(c => c.page_url === page_url);
    res.json(pageComments);
  }
});

app.get('/api/pending-apply', (req, res) => {
  const pending = readPendingApply();
  res.json(pending);
});


const incrementGlobalCounter = () => {
  try {
    fetch(GOOGLE_SCRIPT_URL + '?action=increment').catch(err => {
      console.log('Global counter update failed:', err.message);
    });
  } catch (e) {
    console.log('Error incrementing global counter:', e.message);
  }
};

app.post('/api/comments', (req, res) => {
  const { page_url, element_selector, element_snapshot, pin_x, pin_y, author, text, element_classes, element_tag, element_id, computed_styles, applied_css_rules, parent_element_info } = req.body;

  if (!page_url || !author || !text) {
    return res.status(400).json({ error: 'page_url, author, and text are required' });
  }

  const comments = readComments();
  const html_file_path = mapUrlToFilePath(page_url);

  // Extract element tag name and classes for Claude Code context
  let elementTagName = element_tag || 'unknown';
  let elementClasses = element_classes || [];
  let elementId = element_id || null;

  if (element_snapshot && !element_tag) {
    const tagMatch = element_snapshot.match(/<(\w+)/);
    if (tagMatch) elementTagName = tagMatch[1];

    const classMatch = element_snapshot.match(/class="([^"]*)"/);
    if (classMatch) {
      elementClasses = classMatch[1].split(/\s+/).filter(c => c);
    }

    const idMatch = element_snapshot.match(/id="([^"]*)"/);
    if (idMatch) {
      elementId = idMatch[1];
    }
  }

  // Determine scope and apply_to based on selector
  const hasStructuralPath = element_selector && (
    element_selector.includes('>') ||
    element_selector.includes('nth-of-type') ||
    element_selector.includes('nth-child') ||
    element_selector.includes('#')
  );
  const isPureClassSelector = element_selector && /^\.[\w-]+$/.test(element_selector);

  let scope = 'element';
  if (isPureClassSelector) {
    scope = 'class';
  } else if (hasStructuralPath) {
    scope = 'element';
  }

  let apply_to = 'element-only';
  if (isPureClassSelector) {
    apply_to = 'all-similar';
  }

  const newComment = {
    id: generateId(),
    page_url,
    html_file_path,
    element_selector,
    element_snapshot,
    element_tag: elementTagName,
    element_classes: elementClasses,
    element_id: elementId,
    computed_styles: computed_styles || {},
    applied_css_rules: applied_css_rules || [],
    parent_element_info: parent_element_info || {},
    pin_x: pin_x || 0,
    pin_y: pin_y || 0,
    author,
    text,
    status: 'open',
    scope: scope,
    apply_to: apply_to,
    created_at: new Date().toISOString(),
    replies: []
  };

  comments.push(newComment);
  writeComments(comments);
  incrementGlobalCounter();
  res.status(201).json(newComment);
});

app.post('/api/comments/:id/reply', (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: 'author and text are required' });
  }

  const comments = readComments();
  const comment = comments.find(c => c.id === id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const reply = {
    id: generateReplyId(),
    author,
    text,
    created_at: new Date().toISOString()
  };

  comment.replies.push(reply);
  writeComments(comments);
  incrementGlobalCounter();
  res.status(201).json(reply);
});

app.patch('/api/comments/:id', (req, res) => {
  const { id } = req.params;
  const { status, text, replies, replyId } = req.body;

  const comments = readComments();
  const comment = comments.find(c => c.id === id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Handle comment-level status update
  if (status) {
    comment.status = status;
  }

  // Handle reply status update
  if (replyId && replies) {
    // Merge new replies with existing ones to preserve status fields
    comment.replies = replies.map((newReply, idx) => {
      const oldReply = comment.replies && comment.replies[idx];
      return {
        ...oldReply,
        ...newReply
      };
    });
  }

  if (text) comment.text = text;

  // Manage pending-apply.json
  const pending = readPendingApply();

  // Check what needs to be applied
  const hasReplyPending = comment.replies && comment.replies.some(r => r.status === 'pending-apply');
  const isCommentPending = comment.status === 'pending-apply';

  if (hasReplyPending || isCommentPending) {
    // Support BOTH main comment and multiple replies to be applied together
    const existingIndex = pending.findIndex(p => p.id === id);

    // Get all pending reply IDs
    const pendingReplyIds = comment.replies
      ? comment.replies
          .filter(r => r.status === 'pending-apply')
          .map(r => r.id)
      : [];

    const pendingEntry = {
      id: comment.id,
      apply_comment: isCommentPending,
      apply_reply_ids: pendingReplyIds,
      original_comment: {
        text: comment.text,
        status: comment.status
      },
      replies: comment.replies,
      element_selector: comment.element_selector,
      element_snapshot: comment.element_snapshot,
      html_file_path: comment.html_file_path,
      page_url: comment.page_url,
      author: comment.author,
      created_at: comment.created_at,
      pin_x: comment.pin_x,
      pin_y: comment.pin_y
    };

    if (existingIndex >= 0) {
      pending[existingIndex] = pendingEntry;
    } else {
      pending.push(pendingEntry);
    }

    writePendingApply(pending);
  } else {
    // No pending status - remove from pending-apply.json
    const filtered = pending.filter(p => p.id !== id);
    writePendingApply(filtered);
  }

  writeComments(comments);
  res.json(comment);
});

app.delete('/api/comments/:id', (req, res) => {
  const { id } = req.params;

  const comments = readComments();
  const filtered = comments.filter(c => c.id !== id);

  if (filtered.length === comments.length) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  // Also remove from pending-apply.json if it was there
  const pending = readPendingApply();
  const filteredPending = pending.filter(p => p.id !== id);
  writePendingApply(filteredPending);

  writeComments(filtered);
  res.status(204).send();
});

app.delete('/api/comments/:id/reply/:replyId', (req, res) => {
  const { id, replyId } = req.params;

  const comments = readComments();
  const comment = comments.find(c => c.id === id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (!comment.replies) {
    return res.status(404).json({ error: 'No replies found' });
  }

  const originalLength = comment.replies.length;
  comment.replies = comment.replies.filter(r => r.id !== replyId);

  if (comment.replies.length === originalLength) {
    return res.status(404).json({ error: 'Reply not found' });
  }

  // Remove from pending-apply.json if it was there
  const pending = readPendingApply();
  const filteredPending = pending.map(p => {
    if (p.id === id) {
      // Remove from apply_reply_ids array
      if (p.apply_reply_ids) {
        p.apply_reply_ids = p.apply_reply_ids.filter(rId => rId !== replyId);
      }
    }
    return p;
  }).filter(p => !(p.apply_reply_ids && p.apply_reply_ids.length === 0 && !p.apply_comment));
  writePendingApply(filteredPending);

  writeComments(comments);
  res.status(204).send();
});

// URL Mappings API
app.get('/api/url-mappings', (req, res) => {
  const mappings = readMappings();
  res.json(mappings);
});

app.post('/api/url-mappings', (req, res) => {
  const { label, origins } = req.body;

  if (!label || !Array.isArray(origins) || origins.length === 0) {
    return res.status(400).json({ error: 'label and origins array are required' });
  }

  const mappings = readMappings();
  const newMapping = {
    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    label,
    origins
  };

  mappings.push(newMapping);
  writeMappings(mappings);
  res.status(201).json(newMapping);
});

app.patch('/api/url-mappings/:id', (req, res) => {
  const { id } = req.params;
  const { label, origins } = req.body;

  const mappings = readMappings();
  const mapping = mappings.find(m => m.id === id);

  if (!mapping) {
    return res.status(404).json({ error: 'Mapping not found' });
  }

  if (label) mapping.label = label;
  if (Array.isArray(origins)) mapping.origins = origins;

  writeMappings(mappings);
  res.json(mapping);
});

app.delete('/api/url-mappings/:id', (req, res) => {
  const { id } = req.params;

  const mappings = readMappings();
  const filtered = mappings.filter(m => m.id !== id);

  if (filtered.length === mappings.length) {
    return res.status(404).json({ error: 'Mapping not found' });
  }

  writeMappings(filtered);
  res.status(204).send();
});

app.post('/api/url-mappings/:id/remap', (req, res) => {
  const { id } = req.params;
  const { from_origin, to_origin } = req.body;

  if (!from_origin || !to_origin) {
    return res.status(400).json({ error: 'from_origin and to_origin are required' });
  }

  const comments = readComments();
  let remapped = 0;

  comments.forEach(comment => {
    try {
      if (comment.page_url.startsWith(from_origin)) {
        const newPageUrl = comment.page_url.replace(from_origin, to_origin);
        comment.page_url = newPageUrl;
        comment.html_file_path = mapUrlToFilePath(newPageUrl);
        remapped++;
      }
    } catch (e) {
      console.error('Error remapping comment:', e.message);
    }
  });

  writeComments(comments);

  // Also update pending-apply.json if needed
  const pending = readPendingApply();
  pending.forEach(item => {
    try {
      if (item.page_url && item.page_url.startsWith(from_origin)) {
        item.page_url = item.page_url.replace(from_origin, to_origin);
        item.html_file_path = mapUrlToFilePath(item.page_url);
      }
    } catch (e) {
      console.error('Error remapping pending item:', e.message);
    }
  });
  writePendingApply(pending);

  res.json({ remapped });
});

// Import/Export ZIP endpoints
app.get('/api/export', (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="pointer-export.zip"');

    archive.on('error', err => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create ZIP' });
    });

    archive.pipe(res);

    // Add comments.json
    const comments = readComments();
    archive.append(JSON.stringify(comments, null, 2), { name: 'comments.json' });

    // Add pending-apply.json
    const pending = readPendingApply();
    archive.append(JSON.stringify(pending, null, 2), { name: 'pending-apply.json' });

    archive.finalize();
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import process - analyze ZIP and extract unique origins
app.post('/api/import-process', (req, res) => {
  try {
    // For now, return a simplified response
    // The actual ZIP processing and analysis happens in Claude Code
    res.json({
      total_comments: 0,
      mappings: [],
      message: 'For full import workflow, use Claude Code: drop ZIP in project and say "merge comments"'
    });
  } catch (err) {
    console.error('Import process error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import confirm - apply URL mappings and merge comments
app.post('/api/import-confirm', (req, res) => {
  try {
    const { url_map } = req.body;

    if (!url_map) {
      return res.status(400).json({ error: 'url_map is required' });
    }

    // For now, return a simplified response
    // The actual merge happens in Claude Code
    res.json({
      imported: 0,
      duplicates_skipped: 0,
      message: 'For full import workflow, use Claude Code'
    });

    // Cleanup import-staging folder if it exists
    const stagingDir = path.join(__dirname, './import-staging');
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Import confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/global-counter', (req, res) => {
  try {
    fetch(GOOGLE_SCRIPT_URL + '?action=getCount')
      .then(r => r.json())
      .then(data => {
        res.json(data);
      })
      .catch(err => {
        console.error('Error fetching from Google Sheet:', err.message);
        res.status(500).json({ success: false, error: err.message });
      });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🐕 Pointer server running at http://localhost:${PORT}`);
  console.log(`📌 Bookmarklet page: http://localhost:${PORT}/bookmarklet`);
  console.log(`💾 Comments stored in: ${COMMENTS_FILE}`);
  console.log(`⏳ Pending-apply queue: ${PENDING_APPLY_FILE}`);
  console.log(`\nReady! Open http://localhost:${PORT}/bookmarklet in your browser to get the Pointer bookmarklet.\n`);
});
