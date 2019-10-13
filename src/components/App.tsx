import React from 'react';
import PageInputs from './PageInputs';
import If from './If';
const {ipcRenderer, shell} = require('electron');

interface ScanInputs {
    from: string,
    to: string
}
interface AppState {
    startTitle: string,
    endTitle: string,
    progress: string,
    scanning: boolean,
    foundPath: string[],
    foundJumps: number,
    scanError: string,
    stats: {
        scanDuration: number,
        apiCalls: number,
        checkedTitles: number,
        retriedCalls: number
    }
}

export default class App extends React.Component<{}, AppState>{
    constructor(props: any) {
        super(props);
        this.state = {
            startTitle: '',
            endTitle: '',
            progress: '',
            foundPath: [],
            foundJumps: 0,
            scanning: false,
            scanError: '',
            stats: {
                scanDuration: 0,
                apiCalls: 0,
                checkedTitles: 0,
                retriedCalls: 0
            }
        }
    }
    componentDidMount() {
        ipcRenderer.on('scan-progress', (event:any, progress:string) => {
            this.setState({
                progress
            })
        })
    }
    scan(inputs: ScanInputs) {
        ipcRenderer.send('scan-request', inputs);

        this.setState({
            startTitle: inputs.from,
            endTitle: inputs.to,
            scanning: true,
            progress: '',
            foundPath: [],
            foundJumps: 0,
            scanError: ''
        })

        ipcRenderer.once('scan-result', (event: any, result: any) => {
            if (result.error) {
                this.setState({
                    scanning: false,
                    scanError: result.error
                });
            }
            else {
                this.setState({
                    //make sure we're using the normalized titles, otherwise we might show a URL here and that would look ugly
                    startTitle: result.from,
                    endTitle: result.to,
                    scanning: false,
                    foundPath: result.path,
                    foundJumps: result.jumps,
                    stats: result.stats
                })
            }
        })
    }
    prettyMS(timeInMilliseconds: number) {
        const seconds = timeInMilliseconds / 1000;
        const pad = (num: number) => num > 10 ? num : '0' + num;
        return `${Math.floor(seconds / 60)}:${pad(Math.round(seconds % 60))}`;
    }
    render() {
        const pathLinks = this.state.foundPath.map((title:string) => {
            const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
                openInBrowser = () => {
                    shell.openExternal(url)
                }
            return <a title={`Click to view this Wikipedia page in your browser.\n${url}`} className="path-link" key={title} href="#" onClick={openInBrowser}>{title}</a>
        })

        return (
            <div>
                <p id="explanation">Enter the titles of two Wikipedia pages to find the shortest number of clicks from the first to the second!</p>
                <PageInputs isScanning={this.state.scanning} submit={this.scan.bind(this)}></PageInputs>
                <div className="panel">
                    <If renderWhen={this.state.scanning}>
                        <p>Scan in progress... checking {this.state.progress}</p>
                    </If>
                    <If renderWhen={!!this.state.scanError}>
                        <p>{this.state.scanError}</p>
                    </If>
                    <If renderWhen={this.state.foundPath.length > 0}>
                        <p>You can get from {this.state.startTitle} to {this.state.endTitle} in {this.state.foundJumps} clicks.</p>
                        <p>({pathLinks})</p>
                        <table>
                            <caption>Scan Statistics</caption>
                            <tbody>
                                <tr>
                                    <th>Scan Duration</th>
                                    <td>{this.prettyMS(this.state.stats.scanDuration)}</td>
                                </tr>
                                <tr>
                                    <th>API Calls</th>
                                    <td>{this.state.stats.apiCalls}</td>
                                </tr>
                                <tr>
                                    <th>Titles Checked</th>
                                    <td>{this.state.stats.checkedTitles}</td>
                                </tr>
                                <tr>
                                    <th>API Calls Retried</th>
                                    <td>{this.state.stats.retriedCalls}</td>
                                </tr>
                            </tbody>
                        </table>
                    </If>
                </div>
            </div>
        );
    }
}