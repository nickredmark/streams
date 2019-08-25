import Layout from "../../../components/Layout";
import { useRef, Component, useEffect, useState } from "react";
import { getStreams, Message, Stream } from "../../../services/Streams";
import { useRouter } from "next/router";
import { pick } from 'lodash';
import { Markdown } from "../../../components/Markdown";
import { Mermaid } from "../../../components/Mermaid";

class StreamComponent extends Component<
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
        const { streamName } = this.props;
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
        if (!lines) {
            return null
        }
        return (
            <>
                <h1 style={{ margin: "0.5rem", fontSize: "2rem" }}>{streamName}</h1>
                <div
                    style={{
                        flexGrow: 1,
                        flexShrink: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        padding: "0.5rem"
                    }}
                >
                    {lines.length > 0 &&
                        <Mermaid chart={`graph LR;\n${lines.map(line => `${line};`).join('\n')}`} />
                    }
                </div>
                {!process.env.READONLY && <NewMessage streamName={streamName} />}
            </>
        );
    }
}

const NewMessage = ({ streamName }) => {
    const text = useRef(null);
    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const message = {
                    text: text.current.value
                };
                text.current.value = "";
                await getStreams().createMessage(streamName, message);
            }}
        >
            <input
                ref={text}
                placeholder="new message"
                style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "none",
                    border: "none",
                    borderTop: "1px solid lightgray"
                }}
            />
        </form>
    );
};

export default () => {
    const router = useRouter();
    return (
        <Layout>
            {router.query.name && (
                <StreamComponent streamName={router.query.name as string} />
            )}
        </Layout>
    );
};
