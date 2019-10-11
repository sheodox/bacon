import React from 'react';

type PageInputProps = {
    submit: Function
}

export default class PageInputs extends React.Component<PageInputProps> {
    fromRef: React.RefObject<HTMLInputElement>;
    toRef: React.RefObject<HTMLInputElement>;

    constructor(props: PageInputProps) {
        super(props);
        this.fromRef = React.createRef();
        this.toRef = React.createRef();
    }
    render() {
        return (
            <div>
                <label>From
                    <input type="text" id="from" ref={this.fromRef} />
                </label>
                <label>To
                    <input type="text" id="to" defaultValue="Kevin Bacon" ref={this.toRef} />
                </label>
                <button id="scan">Scan</button>
                <br />
                <p id="progress"></p>
            </div>
        );
    }
}