import React from 'react';
import {scan} from '../scan';
import PageInputs from './PageInputs';

interface ScanInputs {
    from: string,
    to: string
}

export default class App extends React.Component {
    constructor(props: any) {
        super(props);
    }
    scan(inputs: ScanInputs) {
        scan(inputs.from, inputs.to)
    }
    render() {
        return (
            <div>
                <PageInputs submit={this.scan.bind(this)}></PageInputs>
            </div>
        );
    }
}