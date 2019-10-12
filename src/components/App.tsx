import React from 'react';
import PageInputs from './PageInputs';
import If from './If';
const {ipcRenderer} = require('electron');

interface ScanInputs {
    from: string,
    to: string
}
interface AppState {
    progress: string,
    scanning: boolean,
    foundPath: string,
    foundJumps: number,
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
            progress: '',
            foundPath: '',
            foundJumps: 0,
            scanning: false,
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
            scanning: true,
            foundPath: '',
            foundJumps: 0
        })

        ipcRenderer.once('scan-result', (event: any, result: any) => {
            console.log(result);
            this.setState({
                scanning: false,
                foundPath: result.path.join(' → '),
                foundJumps: result.jumps,
                stats: result.stats
            })
        })
    }
    prettyMS(timeInMilliseconds: number) {
        const seconds = timeInMilliseconds / 1000;
        const pad = (num: number) => num > 10 ? num : '0' + num;
        return `${Math.floor(seconds / 60)}:${pad(Math.round(seconds % 60))}`;
    }
    render() {
        return (
            <div>
                <PageInputs isScanning={this.state.scanning} submit={this.scan.bind(this)}></PageInputs>
                <If renderWhen={this.state.scanning}>
                    <p>Scan in progress... checking {this.state.progress}</p>
                </If>
                <If renderWhen={this.state.foundPath !== ''}>
                    <p>Found {this.state.foundPath}</p>
                    <p>in {this.state.foundJumps} jumps</p>
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
        );
    }
}