const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Note: html-to-docx will be required here
let htmlToDocx;
try {
  htmlToDocx = require('html-to-docx');
} catch (e) {
  console.error("html-to-docx not found, word export may fail natively", e);
}

let mainWindow = null;

// Web Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = '1066929757932-bqees2g2chjma2upgfbd3aok892jhuda.apps.googleusercontent.com';

// Serve static files from dist/ on localhost
function startLocalServer(distPath) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
      '.woff2': 'font/woff2', '.ttf': 'font/ttf'
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:19847');

      // Google OAuth callback — handles the token from the browser
      if (url.pathname === '/auth/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Kalam Notes - Authenticating</title>
    <style>
        body { background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { text-align: center; padding: 40px; background: #1e293b; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .loader { border: 4px solid #334155; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card" id="content">
        <div class="loader"></div>
        <h2>Completing Sign-in...</h2>
        <p>Please wait while we sync with the app.</p>
    </div>
    <script>
        // Extract token from URL hash (Implicit Flow)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');

        if (idToken) {
            // Send to our local server via POST
            fetch('/auth/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken })
            }).then(() => {
                document.getElementById('content').innerHTML = '<div style="color:#22c55e;font-size:40px;margin-bottom:20px">✓</div><h2>Success!</h2><p>You can now close this tab.</p>';
                setTimeout(() => window.close(), 2000);
            });
        } else {
            document.getElementById('content').innerHTML = '<h2 style="color:#ef4444">Error</h2><p>No token found. Please try again.</p>';
        }
    </script>
</body>
</html>`);
        return;
      }

      // Receives the token from the JS above
      if (url.pathname === '/auth/complete' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (mainWindow && !mainWindow.isDestroyed() && data.id_token) {
              mainWindow.webContents.send('google-auth-token', { id_token: data.id_token });
              mainWindow.focus();
            }
          } catch (e) { console.error(e); }
          res.writeHead(200);
          res.end('ok');
        });
        return;
      }

      // Normal static file serving
      let filePath = path.join(distPath, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!fs.existsSync(filePath)) filePath = path.join(distPath, 'index.html');
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(19847, '127.0.0.1', () => resolve('http://localhost:19847'));
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, title: "Kalam",
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.setMenuBarVisibility(false);
  const distPath = path.join(__dirname, 'dist');
  try {
    const url = await startLocalServer(distPath);
    mainWindow.loadURL(url);
  } catch (e) {
    mainWindow.loadFile(path.join(distPath, 'index.html'));
  }
}

// IPC: Open Google Sign-In with Implicit Flow
ipcMain.handle('google-sign-in', () => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const redirectUri = 'http://localhost:19847/auth/callback';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=id_token` +
    `&scope=openid%20profile%20email` +
    `&nonce=${nonce}` +
    `&prompt=select_account`;

  shell.openExternal(authUrl);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Native File Save IPC
ipcMain.handle('save-file', async (event, { type, content, title }) => {
  const window = BrowserWindow.getFocusedWindow();
  const options = { title: 'Save Document', defaultPath: `${title || 'Kalam_Document'}`, filters: [] };
  if (type === 'txt') options.filters.push({ name: 'Text Document', extensions: ['txt'] });
  else if (type === 'docx') options.filters.push({ name: 'Word Document', extensions: ['docx'] });
  const { canceled, filePath } = await dialog.showSaveDialog(window, options);
  if (canceled || !filePath) return { success: false };
  try {
    if (type === 'docx' && htmlToDocx) {
      const wrapperHtml = `<div style="font-family: Arial, sans-serif;">${content}</div>`;
      const docxBuffer = await htmlToDocx(wrapperHtml, null, { title: title || 'Kalam Document', margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } });
      fs.writeFileSync(filePath, docxBuffer);
    } else fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('load-data', () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'kalam_data.json');
    if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) { }
  return null;
});

ipcMain.handle('save-data', (event, data) => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'kalam_data.json');
    fs.writeFileSync(dbPath, JSON.stringify(data), 'utf8');
    return true;
  } catch (e) { return false; }
});
