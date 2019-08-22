import Layout from "../../components/Layout";
import { useRef, Component, useEffect, useState } from "react";
import { getStreams, Message, Stream } from "../../services/Streams";
import { useRouter } from "next/router";
import ContextMenu from "react-context-menu";

class StreamComponent extends Component<
  { streamName: string },
  {
    messages: { [key: string]: Message };
    streams: { [key: string]: Stream };
    mode: "stream" | "select";
  }
> {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      streams: {},
      mode: "stream"
    };
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
      }));
    });
    getStreams().onStream((stream, key) => {
      this.setState(state => ({
        streams: {
          ...state.streams,
          [key]: {
            ...state.streams[key],
            ...stream
          }
        }
      }));
    });

    window.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  onKeyDown = (e: KeyboardEvent) => {
    switch (e.keyCode) {
      case 77:
        if (e.ctrlKey) {
          this.setState({
            mode: this.state.mode === "stream" ? "select" : "stream"
          });
        }
        break;
      default:
        console.log(e.keyCode);
    }
  };

  render() {
    const { streamName } = this.props;
    const { messages, mode, streams } = this.state;
    console.log(messages);
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
          {Object.keys(messages)
            .sort()
            .map(key => (
              <MessageComponent
                key={key}
                id={key}
                message={messages[key]}
                mode={mode}
                streams={streams}
              />
            ))}
        </div>
        {!process.env.READONLY && <NewMessage streamName={streamName} />}
      </>
    );
  }
}

const MessageComponent = ({ id, message, mode, streams }) => {
  const [selected, setSelected] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, []);
  return (
    <div
      id={id}
      ref={ref}
      style={{
        ...(selected && {
          backgroundColor: "blue"
        })
      }}
    >
      <div
        onMouseDown={e => {
          if (mode === "select" && e.buttons === 1) {
            e.preventDefault();
            e.stopPropagation();
            setSelected(!selected);
          }
        }}
        onMouseEnter={e => {
          if (mode === "select" && e.buttons === 1) {
            setSelected(!selected);
          }
        }}
      >
        {message.text}
      </div>
      <ContextMenu
        contextId={id}
        items={Object.keys(streams).map(key => ({
          label: `Move to ${key}`,
          onClick: e => {
            console.log("wtf");
            e.preventDefault();
            e.stopPropagation();
          }
        }))}
      />
    </div>
  );
};

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
