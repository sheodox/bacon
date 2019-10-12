import * as path from 'path';
import {scan} from './scan'
const { app, BrowserWindow, ipcMain } = require('electron');


let win: any;
const createWindow = () => {
    win = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: {
            nodeIntegration: true,
        }
    });
    win.on('close', () => win = null);
    console.log(`path: ${path.join(__dirname, './index.html')}`)
    win.loadFile('index.html');
    win.webContents.openDevTools();
    win.show();
}
app.on('ready', createWindow)


app.on('window-all-closed', function () {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('scan-request', async (event: any, titles: {from: string, to: string}) => {
    const result = await scan(titles.from, titles.to, (progressStr: string) => {
        event.reply('scan-progress', progressStr)
    })
    event.reply('scan-result', result)
})