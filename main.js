const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process'); // For running the backend server

let mainWindow;

app.on('ready', () => {
    // Start your Node.js backend server
    exec('node app.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting backend: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Backend stderr: ${stderr}`);
            return;
        }
        console.log(`Backend stdout: ${stdout}`);
    });

    // Create the main window
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Optional
            nodeIntegration: true,
        }
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
