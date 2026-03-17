const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

// Disable hardware acceleration issues on some Linux systems
// app.disableHardwareAcceleration();  // uncomment if you get GPU errors

const isProd = !process.argv.includes('--dev');

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

  // Load the game
  win.loadFile(path.join(__dirname, 'docs', 'index.html'));

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
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://openrouter.ai; " +
          "connect-src 'self' https://openrouter.ai https://api.openrouter.ai; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self';"
        ],
      },
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
