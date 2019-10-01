import { useRef, Component } from "react";
import { useRouter } from "next/router";
import { getStreams, SpaceEntity, StreamEntity } from "../../services/Streams";
import { formatTime, streamComparator, getStreamTimestamp } from "../../utils/time";
import { goTo } from "../../utils/router";
import { getKey } from "../../utils/ordered-list";
import { StreamsProvider } from "../../components/StreamsProvider";
import { Layout } from "../../components/Layout";

type Props = {
    id: string;
}

type State = { space: SpaceEntity; streams: { [key: string]: StreamEntity } }

class Space extends Component<Props, State> {
    constructor(props) {
        super(props)
        this.state = {
            streams: {},
            space: null,
        }
    }

    async componentDidMount() {
        const { id } = this.props;
        getStreams().onSpace(id, (space) =>
            this.setState({ space }))
        getStreams().onStreams(id, (batch) => {
            this.setState(state => {
                const streams = { ...state.streams };
                for (const { data, key } of batch) {
                    streams[key] = {
                        ...streams[key],
                        ...data,
                    }
                }
                return { streams }
            })
        })
    }

    render() {
        const { id } = this.props;
        const { streams, space } = this.state;
        return (
            <Layout title={space && space.name || 'Space'}>
                <h1 style={{ margin: '0.5rem', fontSize: '2rem' }}>{space && space.name}</h1>

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
                            return <li key={key}>
                                <a href={`/stream/${key}`} target="_blank" style={{
                                    textDecoration: "none",
                                }}
                                >{stream.name}</a>
                                <span style={{
                                    fontSize: "80%",
                                    color: "lightgray",
                                    marginLeft: "0.75rem"
                                }}>{formatTime(getStreamTimestamp(stream))}</span>
                            </li>
                        })}
                    </ul>
                </div>
                <NewStream spaceId={id} />
            </Layout>
        );
    }
}

const NewStream = ({ spaceId }) => {
    const name = useRef(null);
    const router = useRouter();
    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const streamName = name.current.value
                name.current.value = ''
                if (/^\w{20,23}$/.test(streamName)) {
                    await getStreams().addStream(spaceId, streamName)
                    // router.push(`/stream/${streamName}`);
                } else {
                    const stream = await getStreams().createStream(spaceId, streamName)
                    router.push(`/stream/${getKey(stream)}`);
                }
            }}
        >
            <input ref={name} placeholder="new stream" style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "none",
                border: "none",
                borderTop: "1px solid lightgray"
            }} />
        </form>
    );
};

export default () => {
    const router = useRouter();
    return <StreamsProvider>{router.query.id && <Space {...(router.query as any)} goTo={goTo(router)} />}</StreamsProvider>
}