import Layout from '../../components/Layout';
import { useRef, Component, useEffect, useState } from 'react';
import { getStreams, Message, Stream } from '../../services/Streams';
import { useRouter, NextRouter } from 'next/router';
import { streamComparator } from '../../utils/time';
import { pick } from 'lodash';
import { stringify } from 'querystring';

class StreamComponent extends Component<
  { router: NextRouter; streamName: string },
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
    }
  };

  render() {
    const { streamName, router } = this.props;
    const { messages, mode, streams, selectedMessages } = this.state;
    const keys = Object.keys(messages).sort((a, b) => getStreams().compareMessages(messages[a], messages[b]));
    const focus = value => {
      router.replace(
        `${router.pathname}${qstringify({ ...router.query, focus: value })}`,
        `${location.pathname}${qstringify({ ...router.query, focus: value, name: undefined })}`,
      );
    };

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
          {keys.map((key, i) => {
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
                isFocus={router.query.focus === key}
                onFocus={value => focus(value)}
                onFocusUp={() => keys[i - 1] && focus(keys[i - 1])}
                onFocusDown={() => keys[i + 1] && focus(keys[i + 1])}
                onMoveUp={() => {
                  const pprev = messages[keys[i - 2]];
                  const prev = messages[keys[i - 1]];
                  if (prev) {
                    getStreams().moveBetween(message, pprev, prev);
                  }
                }}
                onMoveDown={() => {
                  const next = messages[keys[i + 1]];
                  const nnext = messages[keys[i + 2]];
                  if (next) {
                    getStreams().moveBetween(message, next, nnext);
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

const MessageComponent = ({
  streamName,
  id,
  message,
  mode,
  selected,
  setSelected,
  onMoveDown,
  onMoveUp,
  onFocus,
  isFocus,
  onFocusUp,
  onFocusDown,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, []);
  const router = useRouter();

  return (
    <div
      id={id}
      className="message"
      ref={ref}
      style={{
        ...(selected && {
          backgroundColor: 'lightgray',
        }),
      }}
      onDoubleClick={e => {
        onFocus(isFocus ? undefined : id);
      }}
      onKeyDown={e => {
        switch (e.keyCode) {
          case 27: // esc
            if (router.query.focus === id) {
              e.preventDefault();
              onFocus('');
            }
            break;
          case 9: // tab
            // e.preventDefault();
            break;
          case 38: // up
            if (e.ctrlKey) {
              onMoveUp();
            } else {
              onFocusUp();
            }
            break;
          case 40: // down
            if (e.ctrlKey) {
              onMoveDown();
            } else {
              onFocusDown();
            }
            break;
          default:
            console.log(e.keyCode);
        }
      }}
    >
      {isFocus ? (
        <EditMessage
          id={id}
          message={message}
          onChange={newText => {
            getStreams().updateMessage(message, 'text', newText);
            onFocus(undefined);
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
  return (
    <Layout>{router.query.name && <StreamComponent router={router} streamName={router.query.name as string} />}</Layout>
  );
};

const clear = o => (Object.keys(o).forEach(key => o[key] === undefined && delete o[key]), o);

const qstringify = o => {
  const s = stringify(clear(o));
  if (s) {
    return `?${s}`;
  }
  return '';
};
