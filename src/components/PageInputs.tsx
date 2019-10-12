import React, { ChangeEvent, FormEvent } from 'react';

type PageInputProps = {
    submit: Function,
    isScanning: boolean
}

type PageInputState = {
    [key: string]: any,
    from: string,
    to: string
}

export default class PageInputs extends React.Component<PageInputProps, PageInputState> {
    fromRef: React.RefObject<HTMLInputElement>;
    toRef: React.RefObject<HTMLInputElement>;

    constructor(props: PageInputProps) {
        super(props);
        this.fromRef = React.createRef();
        this.toRef = React.createRef();
        this.state = {
            from: '',
            to: 'Kevin Bacon'
        }
    }
    onWikiTitleChange(type : string, title: string) {
        this.setState((state: PageInputState) => {
            state[type] = title;
            return state;
        })

    }
    onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        this.props.submit({
            from: this.state.from,
            to: this.state.to
        })
    }
    render() {
        const titleChange = (type: string) => (e : ChangeEvent<HTMLInputElement>) => {
            this.onWikiTitleChange(type, e.target.value);
        }
        return (
            <div>
                <form onSubmit={this.onSubmit.bind(this)}>
                    <label>From
                        <input type="text" id="from" onChange={titleChange('from')} />
                    </label>
                    <label>To
                        <input type="text" id="to" onChange={titleChange('to')} defaultValue={this.state.to} />
                    </label>
                    <button id="scan" disabled={this.props.isScanning}>Scan</button>
                    <br />
                </form>
                <p id="progress"></p>
            </div>
        );
    }
}