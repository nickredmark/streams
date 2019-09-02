import { Component } from "react";
import { getStreams, Message } from "../services/Streams";
import { pick } from 'lodash';
import { Mermaid } from "./Mermaid";

export class Chart extends Component<
    { streamName: string },
    {
        messages: { [key: string]: Message };
    }
    > {
    constructor(props) {
        super(props);
        this.state = {
            messages: {},
        };
    }

    async componentDidMount() {
        getStreams().onMessage(this.props.streamName, (message, key) => {
            if (message) {
                this.setState(state => ({
                    messages: {
                        ...state.messages,
                        [key]: {
                            ...state.messages[key],
                            ...message
                        }
                    }
                }));
            } else {
                this.setState(state => ({
                    messages: pick(state.messages, Object.keys(state.messages).filter(k => k !== key))
                }))
            }
        });
    }

    render() {
        const { messages } = this.state;
        const lines = [];
        const ids = {}
        for (const { text } of Object.values(messages)) {
            const match = /^([\w ]+?) *--> *([\w ]+)$/.exec(text)
            const getId = (str) => {
                if (!ids[str]) {
                    ids[str] = `id${Math.floor(Math.random() * 100000000)}`
                }
                return ids[str]
            }
            if (match) {
                lines.push(`${getId(match[1])}[${match[1]}] --> ${getId(match[2])}[${match[2]}]`);
            }
        }
        return (
            lines.length > 0 ?
                <Mermaid chart={`graph LR;\n${lines.map(line => `${line};`).join('\n')}`} /> :
                <em>Chart is empty, try adding relationship messages like "A --> B".</em>
        );
    }
}
