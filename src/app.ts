import path from 'path';
const {app, BrowserWindow} = require('electron');


let win;
app.on('ready', () => {
    let win: any = new BrowserWindow({ width: 800, height: 500 });
    win.on('close', () => win = null);
    console.log(`path: ${path.join(__dirname, './index.html')}`)
    win.loadFile('index.html');
    win.show();
})