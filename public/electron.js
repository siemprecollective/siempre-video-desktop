const { app, BrowserWindow, systemPreferences, screen, ipcMain, Menu, TouchBar } = require('electron');
const { TouchBarButton, TouchBarLabel, TouchBarSpacer } = TouchBar;

const { autoUpdater } = require("electron-updater");
  
autoUpdater.checkForUpdatesAndNotify();

const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let sideWindow;
let settingsWindow;
let firstDimsSet = true;

let siteRoot;
if (isDev) {
  siteRoot = `${process.env.SIEMPREVIDEO_DESKTOP_DEV_URL}`;
} else {
  siteRoot = `https://video.siempre.io/`;
}

let createMainWindow = () => {
  mainWindow = new BrowserWindow({
    preload: path.join(__dirname, 'preload.js'),
    minWidth: 400,
    show: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    height: 600,
    width: 800,
    frame: true
  });
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setVisibleOnAllWorkspaces(true)

  mainWindow.loadURL(`${siteRoot}/?ui=electronMain`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    ipcMain.on('launch-sidebar', (event, arg) => {
      createSideWindow().then(() => {
        mainWindow.close();
      }).catch(() => {
        mainWindow.loadURL(`${siteRoot}/?ui=electronPermissions`);
      });
    });
  });
};

let createSideWindow = () => {
  let screenHeight = screen.getPrimaryDisplay().bounds.height;
  sideWindow = new BrowserWindow({
    preload: path.join(__dirname, 'preload.js'),
    useContentSize: true,
    show: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    height: screenHeight,
    width: 150,
    frame: true
  });
  if (!isDev && process.platform === "darwin") {
    sideWindow.setFocusable(false);
  }
  sideWindow.setMenu(null)
  sideWindow.setAlwaysOnTop(true);
  sideWindow.setVisibleOnAllWorkspaces(true);
  
  sideWindow.once('ready-to-show', () => {
    ipcMain.on('launch-settings', (event, arg) => {
      createSettingsWindow();
    });
    ipcMain.on('set-side-dims', (event, dims) => {
      let topLeft = {x: sideWindow.getBounds().x, y: sideWindow.getBounds().y}
      let display = screen.getDisplayNearestPoint(topLeft)
      let screenHeight = display.bounds.height;
      let screenWidth = display.bounds.width;
     
      let width = sideWindow.getBounds().width;
      let height = dims.height + (sideWindow.getBounds().height - sideWindow.getContentSize()[1]);
      let x = sideWindow.getBounds().x;

      let offsetY = parseInt((screenHeight - height) / 2)
      let y = display.bounds.y;
      if (offsetY > 0) y += offsetY;
      
      if (height > screenHeight) {
        height = screenHeight;
      }
      sideWindow.setBounds({x: x, y: y, height: height, width: width});
      sideWindow.setMinimumSize(100, 200);
      if (firstDimsSet) {
        sideWindow.show();
      }
      firstDimsSet = false;
    });
  });

  if (systemPreferences.getMediaAccessStatus) {
    let cameraPerm = systemPreferences.getMediaAccessStatus("camera") === "granted";
    let micPerm = systemPreferences.getMediaAccessStatus("microphone") === "granted";
    console.log("permissions: %s %s", cameraPerm, micPerm);
    if (!cameraPerm || !micPerm) {
      return systemPreferences.askForMediaAccess("camera").then((granted) => {
        if (granted) return systemPreferences.askForMediaAccess("microphone");
        else throw Error();
      }).then((granted) => {
        if (granted) return sideWindow.loadURL(`${siteRoot}/?ui=electronSide`);
        else throw Error();
      });
    } else {
      return sideWindow.loadURL(`${siteRoot}/?ui=electronSide`);
    }
  } else {
    return sideWindow.loadURL(`${siteRoot}/?ui=electronSide`);
  }
};

let createSettingsWindow = () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) return;
  settingsWindow = new BrowserWindow({
    preload: path.join(__dirname, 'preload.js'),
    minWidth: 400,
    show: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    height: 600,
    width: 800,
    frame: true
  });
  settingsWindow.setAlwaysOnTop(true);
  settingsWindow.setVisibleOnAllWorkspaces(true)

  settingsWindow.loadURL(`${siteRoot}/?ui=electronSettings`);

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    ipcMain.on('close-settings', (event, arg) => {
      settingsWindow.destroy();
    });
  });

};

let generateMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'about' }, { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

let installDevTools = () => {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS,
  } = require('electron-devtools-installer');

  installExtension(REACT_DEVELOPER_TOOLS)
    .then(name => {
      console.log(`Added Extension: ${name}`);
    })
    .catch(err => {
      console.log('An error occurred: ', err);
    });

  installExtension(REDUX_DEVTOOLS)
    .then(name => {
      console.log(`Added Extension: ${name}`);
    })
    .catch(err => {
      console.log('An error occurred: ', err);
    });
};

app.on('ready', () => {
  if (isDev) installDevTools();
  createMainWindow();
  generateMenu();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

ipcMain.on('load-page', (event, arg) => {
  mainWindow.loadURL(arg);
});
