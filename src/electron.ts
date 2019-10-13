import * as path from 'path';
import {scan} from './scan'
import {getLinkedTitles} from './wikipedia';
const { app, BrowserWindow, ipcMain } = require('electron');


let win: any;
const createWindow = () => {
    win = new BrowserWindow({
        width: 800, height: 800,
        webPreferences: {
            nodeIntegration: true,
        }
    });
    win.on('close', () => win = null);
    win.loadFile('index.html');

    if (process.argv.includes('devtools')) {
        win.webContents.openDevTools();
    }
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
    try {
        //validate that both pages exist before starting to scan to some impossible destination
        await getLinkedTitles(titles.from);
        await getLinkedTitles(titles.to);

        const result = await scan(titles.from, titles.to, (progressStr: string) => {
            event.reply('scan-progress', progressStr)
        })
        event.reply('scan-result', result)
    } catch (e) {
        event.reply('scan-result', {
            error: e.message
        });
    }
})