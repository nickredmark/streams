import Link from "next/link";
import Layout from "../components/Layout";

import { Component } from "react";
import { getStreams, StreamEntity } from "../services/Streams";
import { formatTime, streamComparator, getStreamTimestamp } from "../utils/time";
import { getKey } from "../utils/ordered-list";

class Keys extends Component<{}, { streams: { [key: string]: StreamEntity } }> {
    constructor(props) {
        super(props)
        this.state = {
            streams: {}
        }
    }

    async componentDidMount() {
        getStreams().onStream((stream, key) => {
            this.setState(state => ({
                streams: {
                    ...state.streams,
                    [key]: {
                        ...state.streams[key],
                        ...stream,
                    }
                }
            }))
        })
    }

    render() {
        const { streams } = this.state;
        return (
            <Layout>
                <div style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    minHeight: 0,
                    overflowY: "auto"
                }}>
                    <ul
                        style={{
                            margin: 0
                        }}
                    >
                        {Object.keys(streams).sort(streamComparator(streams)).map(key => {
                            const stream = streams[key]
                            // console.log(`${stream.name}:${(stream as any)._['#']}`)
                            return <li key={key}>
                                <Link href={`/stream/${stream.name}`}>
                                    <a style={{
                                        textDecoration: "none",
                                    }}
                                    >{stream.name} {getKey(stream)}</a>
                                </Link>
                                <span style={{
                                    fontSize: "80%",
                                    color: "lightgray",
                                    marginLeft: "0.75rem"
                                }}>{formatTime(getStreamTimestamp(stream))}</span>
                            </li>
                        })}
                    </ul>
                </div>
            </Layout>
        );
    }
}

export default Keys;
