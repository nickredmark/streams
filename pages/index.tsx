import Link from "next/link";
import Layout from "../components/Layout";

import { useRef, Component } from "react";
import { useRouter } from "next/router";
import { getStreams, Stream } from "../services/Streams";
import { formatTime } from "../utils/time";

class Streams extends Component<{}, { streams: { [key: string]: Stream } }> {
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
            {Object.keys(streams).sort((a, b) => {
              return getStreamTimestamp(streams[b]) - getStreamTimestamp(streams[a]);
            }).map(key => {
              const stream = streams[key]
              // console.log(`${stream.name}:${(stream as any)._['#']}`)
              return <li key={key}>
                <Link href={`/stream/${stream.name}`}>
                  <a style={{
                    textDecoration: "none",
                  }}
                  >{stream.name}</a>
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
        {!process.env.READONLY &&
          <NewStream />
        }
      </Layout>
    );
  }
}

const getStreamTimestamp = (stream: any) => stream._['>'].lastMessage || stream._['>'].name

const NewStream = () => {
  const name = useRef(null);
  const router = useRouter();
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const stream = name.current.value
        name.current.value = ''
        await (await getStreams()).createStream(stream)
        router.push(`/stream/${stream}`);
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

export default Streams;
