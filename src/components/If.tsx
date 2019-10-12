import React, { ReactElement } from 'react';

interface IfProps {
    renderWhen: boolean
    children: ReactElement | ReactElement[]
}

export default class If extends React.Component<IfProps> {
    constructor(props: Readonly<IfProps>) {
        super(props);
    }
    render() {
        if (this.props.renderWhen) {
            return this.props.children;
        }
        return null;
    }
}