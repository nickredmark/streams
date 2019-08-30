import Layout from "../../components/Layout";
import { useRef, Component, useEffect, useState } from "react";
import { getStreams, Message, Stream } from "../../services/Streams";
import { useRouter } from "next/router";
import { streamComparator } from "../../utils/time";
import { pick } from 'lodash';
import { NewMessage } from "../../components/NewMessage";
import dragDrop from 'drag-drop';

class StreamComponent extends Component<
  { streamName: string },
  {
    messages: { [key: string]: Message };
    streams: { [key: string]: Stream };
    selectedMessages: string[],
    mode: "stream" | "select";
  }
  > {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      streams: {},
      mode: "stream",
      selectedMessages: [],
    };
  }

  async componentDidMount() {
    const { streamName } = this.props;
    getStreams().onMessage(streamName, (message, key) => {
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

    dragDrop('body', async (files) => {
      for (const file of files) {
        const message = await toBase64(file);
        if (message.length > 1000000) {
          throw new Error(`File too large: ${message.length}`);
        }
        await getStreams().createMessage(streamName, {
          text: message,
        });
      }
    });
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
    const { messages, mode, streams, selectedMessages } = this.state;
    return (
      <>
        <h1 style={{ margin: "0.5rem", fontSize: "2rem" }}>{streamName}</h1>
        <style jsx global>
          {`
            .message-permalink {
              visibility: hidden;
            }
            .message:hover .message-permalink {
              visibility: visible;
            }
          `}
        </style>
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
                streamName={streamName}
                id={key}
                message={messages[key]}
                mode={mode}
                selected={selectedMessages.includes(key)}
                setSelected={(selected) => this.setState({
                  selectedMessages: selected ? [...selectedMessages.filter(k => k !== key), key] : selectedMessages.filter(k => k !== key)
                })}
              />
            ))}
        </div>
        {mode === "select" && <MoveMessages
          messages={messages}
          selectedMessages={selectedMessages}
          streamName={streamName}
          streams={streams}
          setSelectedMessages={(selected) => this.setState({
            selectedMessages: selected
          })}
        />}
        {!process.env.READONLY && <NewMessage streamName={streamName} />}
      </>
    );
  }
}

const toBase64 = file => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

const MessageComponent = ({ streamName, id, message, mode, selected, setSelected }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, []);

  return (
    <div
      id={id}
      className="message"
      ref={ref}
      style={{
        ...(selected && {
          backgroundColor: "lightgray"
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
        <a id={id} />
        <MessageContent message={message} />
        <a className="message-permalink" style={{
          marginLeft: "0.25rem",
          color: "lightgray",
          textDecoration: "none",
          fontSize: "0.8rem"
        }} href={`/stream/${streamName}#${id}`}>#</a>
      </div>
    </div>
  );
};

const MessageContent = ({ message }) => {
  if (/^data:image\//.exec(message.text)) {
    return <img src={message.text} />
  }
  if (/^https?:\/\/|www/.exec(message.text)) {
    return <a href={message.text} style={{
      color: "inherit"
    }} target="_blank">{message.text}</a>
  }

  return <span>{message.text}</span>
}

const MoveMessages = ({ messages, setSelectedMessages, selectedMessages, streamName, streams }) => {
  const stream = useRef(null);
  return <div>
    <form onSubmit={async e => {
      e.preventDefault();
      await getStreams().copyMessages(selectedMessages.map(key => messages[key]).filter(Boolean), stream.current.value)
    }}>
      <select ref={stream}>
        {Object.keys(streams).sort(streamComparator(streams)).map(key => <option key={key} value={key}>{streams[key].name}</option>)}
      </select>
      <button>Copy to selected stream</button>
    </form>
    <button onClick={async () => {
      await getStreams().deleteMessages(selectedMessages.map(key => messages[key]).filter(Boolean), streamName);
      setSelectedMessages([]);
    }}>Delete</button>
  </div>
}

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
