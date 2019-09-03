import Layout from '../../components/Layout';
import { useRef, Component, useEffect } from 'react';
import { getStreams, Stream, MessageEntity, Message } from '../../services/Streams';
import { useRouter, NextRouter } from 'next/router';
import { streamComparator } from '../../utils/time';
import { pick } from 'lodash';
import { NewMessage } from '../../components/NewMessage';
import dragDrop from 'drag-drop';
import { stringify } from 'querystring';
import { sort, getKey } from '../../utils/ordered-list';
import { treeify, Node } from '../../utils/trees';
import { select } from 'd3';

type Mode = 'stream' | 'select';

class StreamComponent extends Component<
  { router: NextRouter; streamName: string },
  {
    messages: { [key: string]: MessageEntity };
    streams: { [key: string]: Stream };
    selectedMessages: string[];
    mode: Mode;
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
    const { streamName } = this.props;
    getStreams().onMessage(streamName, (message, key) => {
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

    dragDrop('body', async files => {
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
    const { messages: unsortedMessages, mode, streams, selectedMessages } = this.state;
    const messages = sort(Object.values(unsortedMessages));
    const tree = treeify(messages);

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
          <Tree
            streamName={streamName}
            mode={mode}
            selectedMessages={selectedMessages}
            setSelected={key =>
              this.setState({
                selectedMessages: selected
                  ? [...selectedMessages.filter(k => k !== key), key]
                  : selectedMessages.filter(k => k !== key),
              })
            }
            tree={tree}
          />
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

const toBase64 = file =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

const Tree = ({
  streamName,
  mode,
  selectedMessages,
  setSelected,
  tree,
}: {
  mode: Mode;
  streamName: string;
  selectedMessages: string[];
  setSelected: (string) => void;
  tree: Node<MessageEntity>[];
}) => {
  const router = useRouter();

  const focus = (node?: Node<MessageEntity>) => {
    router.replace(
      `${router.pathname}${qstringify({ ...router.query, focus: node && getKey(node.entity) })}`,
      `${location.pathname}${qstringify({ ...router.query, focus: node && getKey(node.entity), name: undefined })}`,
    );
  };

  return (
    <div>
      {tree.map((node, i) => {
        const key = getKey(node.entity);
        return (
          <MessageComponent
            key={key}
            streamName={streamName}
            id={key}
            node={node}
            mode={mode}
            selectedMessages={selectedMessages}
            selected={selectedMessages.includes(key)}
            setSelected={setSelected}
            isFocus={router.query.focus === key}
            onFocus={value => focus(value)}
            onFocusUp={() => node[i - 1] && focus(tree[i - 1])}
            onFocusDown={() => node[i + 1] && focus(tree[i + 1])}
            onMoveUp={() => {
              const pprev = tree[i - 2];
              const prev = tree[i - 1];
              if (prev) {
                getStreams().moveBetween(node.entity, pprev.entity, prev.entity);
              }
            }}
            onMoveDown={() => {
              const next = tree[i + 1];
              const nnext = tree[i + 2];
              if (next) {
                getStreams().moveBetween(node.entity, next.entity, nnext.entity);
              }
            }}
            onIndent={() => {
              const prev = tree[i - 1];
              if (prev) {
                getStreams().append(node.entity, prev.entity);
                if (prev.children.length) {
                  getStreams().moveBetween(node.entity, prev.children[prev.children.length - 1].entity, undefined);
                }
              }
            }}
            onOutdent={() => {}}
          />
        );
      })}
    </div>
  );
};

const MessageComponent = ({
  streamName,
  id,
  node,
  mode,
  selectedMessages,
  selected,
  setSelected,
  onMoveDown,
  onMoveUp,
  isFocus,
  onFocus,
  onFocusUp,
  onFocusDown,
  onIndent,
  onOutdent,
}: {
  streamName: string;
  id: string;
  node: Node<MessageEntity>;
  mode: Mode;
  selectedMessages: string[];
  selected: boolean;
  setSelected: (selected: boolean) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  isFocus: boolean;
  onFocus: (value: Node<MessageEntity> | undefined) => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
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
        onFocus(isFocus ? undefined : node);
      }}
      onKeyDown={e => {
        switch (e.keyCode) {
          case 27: // esc
            if (router.query.focus === id) {
              e.preventDefault();
              onFocus(undefined);
            }
            break;
          case 9: // tab
            e.preventDefault();
            if (e.shiftKey) {
              onOutdent();
            } else {
              onIndent();
            }
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
          message={node.entity}
          onChange={newText => {
            getStreams().updateMessage(node.entity, 'text', newText);
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
          <MessageContent message={node.entity} />
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
      {node.children.length > 0 && (
        <div
          style={{
            marginLeft: '1rem',
          }}
        >
          <Tree streamName={streamName} mode={mode} selectedMessages={selectedMessages} tree={node.children} />
        </div>
      )}
    </div>
  );
};

const MessageContent = ({ message }: { message: MessageEntity }) => {
  if (/^data:image\//.exec(message.text)) {
    return <img src={message.text} />;
  }
  if (/^https?:\/\/|www/.exec(message.text)) {
    return (
      <a
        href={message.text}
        style={{
          color: 'inherit',
        }}
        target="_blank"
      >
        {message.text}
      </a>
    );
  }

  return <span>{message.text}</span>;
};
const EditMessage = ({
  id,
  message,
  onChange,
}: {
  id: string;
  message: MessageEntity;
  onChange: (text: string) => void;
}) => {
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
