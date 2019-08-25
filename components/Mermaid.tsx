import { Component } from "react";

let mermaid;
if (process.browser) {
    mermaid = require('mermaid');
    mermaid.initialize({
        startOnLoad: false,
        logLevel: 1,
    });
}

export class Mermaid extends Component<{ chart: string }, { svg: any }> {
    constructor(props) {
        super(props);
        this.state = {
            svg: null
        }
    }

    componentDidMount() {
        this.renderSVG(this.props.chart);
    }

    componentWillReceiveProps({ chart }) {
        this.renderSVG(chart);
    }

    renderSVG(chart) {
        const id = `mermaid-${Math.floor(Math.random() * 100000000)}`;
        this.setState({
            svg: null
        })
        mermaid.render(id, chart, svg => this.setState({
            svg
        }));
    }

    render() {
        return <div dangerouslySetInnerHTML={{ __html: this.state.svg }} />
    }
}