import Layout from '../../components/Layout';
import { useRef, Component, useEffect, useState } from 'react';
import { getStreams, Message, Stream } from '../../services/Streams';
import { useRouter } from 'next/router';
import { streamComparator } from '../../utils/time';
import { pick } from 'lodash';

class StreamComponent extends Component<
  { streamName: string },
  {
    messages: { [key: string]: Message };
    streams: { [key: string]: Stream };
    selectedMessages: string[];
    mode: 'stream' | 'select';
  }
> {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      streams: {},
      mode: 'stream',
      selectedMessages: [],
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
              ...message,
            },
          },
        }));
      } else {
        this.setState(state => ({
          messages: pick(state.messages, Object.keys(state.messages).filter(k => k !== key)),
        }));
      }
    });
    getStreams().onStream((stream, key) => {
      this.setState(state => ({
        streams: {
          ...state.streams,
          [key]: {
            ...state.streams[key],
            ...stream,
          },
        },
      }));
    });

    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e: KeyboardEvent) => {
    switch (e.keyCode) {
      case 77:
        if (e.ctrlKey) {
          this.setState({
            mode: this.state.mode === 'stream' ? 'select' : 'stream',
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
    const keys = Object.keys(messages).sort();
    const orderedKeys = [];
    let key = keys.pop();
    while (key) {
      const message = messages[key];
      if (!message.parent) {
        orderedKeys.push(key);
      } else {
        const parentKey = message.parent['#'];
        const index = orderedKeys.indexOf(parentKey);
        if (index > -1) {
          orderedKeys.splice(index, 0, key);
        } else {
          orderedKeys.push(key);
          keys.splice(keys.indexOf(parentKey), 1);
          key = parentKey;
          continue;
        }
      }
      key = keys.pop();
    }
    orderedKeys.reverse();

    return (
      <>
        <h1 style={{ margin: '0.5rem', fontSize: '2rem' }}>{streamName}</h1>
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
            overflowY: 'auto',
            padding: '0.5rem',
          }}
        >
          {orderedKeys.map((key, i) => {
            const message = messages[key];
            return (
              <MessageComponent
                key={key}
                streamName={streamName}
                id={key}
                message={message}
                mode={mode}
                selected={selectedMessages.includes(key)}
                setSelected={selected =>
                  this.setState({
                    selectedMessages: selected
                      ? [...selectedMessages.filter(k => k !== key), key]
                      : selectedMessages.filter(k => k !== key),
                  })
                }
                onMoveUp={() => {
                  const pprev = messages[orderedKeys[i - 2]];
                  if (pprev) {
                    console.log(message.text, pprev.text);
                    getStreams().setParent(message, pprev);
                  }
                }}
                onMoveDown={() => {
                  const next = messages[orderedKeys[i + 1]];
                  if (next) {
                    console.log(message.text, next.text);
                    getStreams().setParent(message, next);
                  }
                }}
              />
            );
          })}
        </div>
        {mode === 'select' && (
          <MoveMessages
            messages={messages}
            selectedMessages={selectedMessages}
            streamName={streamName}
            streams={streams}
            setSelectedMessages={selected =>
              this.setState({
                selectedMessages: selected,
              })
            }
          />
        )}
        {!process.env.READONLY && <NewMessage streamName={streamName} />}
      </>
    );
  }
}

const MessageComponent = ({ streamName, id, message, mode, selected, setSelected, onMoveDown, onMoveUp }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, []);
  const [edit, setEdit] = useState(false);

  return (
    <div
      id={id}
      className="message"
      ref={ref}
      style={{
        ...(selected && {
          backgroundColor: 'lightgray',
        }),
        ...(message.sub && {
          marginLeft: '1rem',
        }),
        ...(!message.parent && {
          marginTop: '1rem',
        }),
      }}
      onDoubleClick={e => {
        setEdit(!edit);
      }}
      onKeyDown={e => {
        switch (e.keyCode) {
          case 27: // esc
            if (edit) {
              e.preventDefault();
              setEdit(false);
            }
            break;
          case 9: // tab
            e.preventDefault();
            getStreams().setSub(message, !e.shiftKey);
            break;
          case 40: // down
            if (e.ctrlKey) {
              onMoveDown();
            }
            break;
          case 38: // up
            if (e.ctrlKey) {
              onMoveUp();
            }
            break;
        }
      }}
    >
      {edit ? (
        <EditMessage
          id={id}
          message={message}
          onChange={newText => {
            getStreams().updateMessage(message, newText);
            setEdit(false);
          }}
        />
      ) : (
        <div
          onMouseDown={e => {
            if (mode === 'select' && e.buttons === 1) {
              e.preventDefault();
              e.stopPropagation();
              setSelected(!selected);
            }
          }}
          onMouseEnter={e => {
            if (mode === 'select' && e.buttons === 1) {
              setSelected(!selected);
            }
          }}
        >
          <a id={id} />
          {message.text}
          <a
            className="message-permalink"
            style={{
              marginLeft: '0.25rem',
              color: 'lightgray',
              textDecoration: 'none',
              fontSize: '0.8rem',
            }}
            href={`/stream/${streamName}#${id}`}
          >
            #
          </a>
        </div>
      )}
    </div>
  );
};

const EditMessage = ({ id, message, onChange }) => {
  const text = useRef<HTMLInputElement>(null);
  useEffect(() => {
    text.current.focus();
  }, []);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();

        onChange(text.current.value);
      }}
    >
      <input
        onKeyDown={e => {}}
        key={id}
        id={id}
        style={{
          width: '100%',
          padding: 0,
          border: 'none',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          color: 'inherit',
        }}
        ref={text}
        defaultValue={message.text}
      />
    </form>
  );
};

const NewMessage = ({ streamName }) => {
  const text = useRef(null);
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const message = {
          text: text.current.value,
        };
        text.current.value = '';
        await getStreams().createMessage(streamName, message);
      }}
    >
      <input
        ref={text}
        placeholder="new message"
        style={{
          width: '100%',
          padding: '1rem',
          borderRadius: 'none',
          border: 'none',
          borderTop: '1px solid lightgray',
        }}
      />
    </form>
  );
};

const MoveMessages = ({ messages, setSelectedMessages, selectedMessages, streamName, streams }) => {
  const stream = useRef(null);
  return (
    <div>
      <form
        onSubmit={async e => {
          e.preventDefault();
          await getStreams().copyMessages(selectedMessages.map(key => messages[key]).filter(Boolean), stream.current.value);
        }}
      >
        <select ref={stream}>
          {Object.keys(streams)
            .sort(streamComparator(streams))
            .map(key => (
              <option key={key} value={key}>
                {streams[key].name}
              </option>
            ))}
        </select>
        <button>Copy to selected stream</button>
      </form>
      <button
        onClick={async () => {
          await getStreams().deleteMessages(selectedMessages.map(key => messages[key]).filter(Boolean), streamName);
          setSelectedMessages([]);
        }}
      >
        Delete
      </button>
    </div>
  );
};

export default () => {
  const router = useRouter();
  return <Layout>{router.query.name && <StreamComponent streamName={router.query.name as string} />}</Layout>;
};
