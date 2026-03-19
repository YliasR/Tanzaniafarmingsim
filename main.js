const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const fs   = require('fs');

// Disable hardware acceleration issues on some Linux systems
// app.disableHardwareAcceleration();  // uncomment if you get GPU errors

const isProd = !process.argv.includes('--dev');

// Register a custom scheme so fetch/XHR works for local assets (file:// blocks this).
protocol.registerSchemesAsPrivileged([{
  scheme: 'game',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
  },
}]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    fullscreenable: true,
    title: 'Tanzania Farm Sim',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove menu bar in production
  if (isProd) {
    Menu.setApplicationMenu(null);
  }

  // Load the game via custom protocol
  win.loadURL('game://app/index.html');

  // Open devtools in dev mode
  if (!isProd) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // F11 toggle fullscreen
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
    }
    // Alt+F4 handled by OS already
  });

  // CSP header for security
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://openrouter.ai; " +
          "connect-src 'self' https://openrouter.ai https://api.openrouter.ai; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self';"
        ],
      },
    });
  });
}

app.whenReady().then(() => {
  // Serve docs/ folder under the custom 'game' protocol.
  // This makes XHR/fetch for .glb assets work exactly like a real web server.
  const docsRoot = path.join(__dirname, 'docs');

  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  };

  protocol.handle('game', (request) => {
    // Strip scheme + host → e.g. "game://app/assets/foo.glb" → "assets/foo.glb"
    let urlPath = decodeURIComponent(new URL(request.url).pathname);
    if (urlPath.startsWith('/')) urlPath = urlPath.slice(1);

    const filePath = path.join(docsRoot, urlPath);

    // Security: stay inside docs/
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(docsRoot))) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const data = fs.readFileSync(resolved);
      const ext = path.extname(resolved).toLowerCase();
      return new Response(data, {
        headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
