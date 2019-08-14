import Layout from "../../components/Layout";
import { useRef, Component, useEffect } from "react";
import { getStreams, Message, Stream } from "../../services/Streams";
import { useRouter } from 'next/router';

class StreamComponent extends Component<{ streamName: string }, { messages: { [key: string]: Message } }> {
  constructor(props) {
    super(props);
    this.state = {

      messages: {}
    }
  }
  async componentDidMount() {
    getStreams().onMessage(this.props.streamName, (message, key) => {
      this.setState(state => ({
        messages: {

          ...state.messages,
          [key]: {
            ...state.messages[key],
            ...message
          }
        }
      }))
    });
  }
  render() {
    const { streamName } = this.props;
    const { messages } = this.state;
    return <>
      <h1>{streamName}</h1>
      <div style={{
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        overflowY: "auto",
      }}>
        {Object.keys(messages).sort().map((key) => (
          <MessageComponent key={key} message={messages[key]} />
        ))}
      </div>
      {!process.env.READONLY &&
        <NewMessage streamName={streamName} />
      }
    </>
  }
}

const MessageComponent = ({ message }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, [])
  return <div ref={ref}>{message.text}</div>
}

const NewMessage = ({ streamName }) => {
  const text = useRef(null);
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const message = {
          text: text.current.value
        }
        text.current.value = ''
        await getStreams().createMessage(streamName, message)
      }}
    >
      <input ref={text} placeholder="new message" style={{
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
  return <Layout>
    {router.query.name && <StreamComponent streamName={router.query.name as string} />}
  </Layout>
}
