import Layout from '../../components/Layout';
import { useRef, Component, useEffect, useState } from 'react';
import { getStreams, Stream, MessageEntity, Message } from '../../services/Streams';
import { useRouter, NextRouter } from 'next/router';
import { streamComparator } from '../../utils/time';
import { pick } from 'lodash';
import { NewMessage } from '../../components/NewMessage';
import dragDrop from 'drag-drop';
import { stringify } from 'querystring';
import { Chart } from '../../components/Chart';
import { sort, getKey } from '../../utils/ordered-list';
import { treeify, Node } from '../../utils/trees';
import { select } from 'd3';

type Mode = 'stream' | 'select';

class StreamComponent extends Component<
  { streamName: string },
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
    getStreams().onMessages(streamName, (batch) => {
      this.setState(state => {
        const messages = { ...state.messages };
        for (const { data, key } of batch) {
          if (data) {
            messages[key] = {
              ...messages[key],
              ...data,
            }
          } else {
            delete (messages[key])
          }
        }
        return { messages }
      })
    });
    getStreams().onStreams((batch) => {
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
    console.log('render')
    const { streamName } = this.props;
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
                selectedMessages: selectedMessages.includes(key)
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

  const focus = (focus: string | undefined) => {
    router.replace(
      `${router.pathname}${qstringify({ ...router.query, focus })}`,
      `${location.pathname}${qstringify({ ...router.query, focus, name: undefined })}`,
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
            onFocusUp={() => tree[i - 1] && focus(getKey(tree[i - 1].entity))}
            onFocusDown={() => tree[i + 1] && focus(getKey(tree[i + 1].entity))}
            onMoveUp={() => {
              const pprev = tree[i - 2];
              const prev = tree[i - 1];
              if (prev) {
                getStreams().moveBetween(node.entity, pprev && pprev.entity, prev.entity);
              }
            }}
            onMoveDown={() => {
              const next = tree[i + 1];
              const nnext = tree[i + 2];
              if (next) {
                getStreams().moveBetween(node.entity, next.entity, nnext && nnext.entity);
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
            onOutdent={() => {
              if (node.parent && node.parent.parent) {
                getStreams().append(node.entity, node.parent.parent.entity);
                const parentNext = node.parent.parent.children[node.parent.index + 1]
                getStreams().moveBetween(node.entity, node.parent.entity, parentNext && parentNext.entity)
              }
            }}
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
  onFocus: (value: string | undefined) => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}) => {
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
          backgroundColor: 'lightgray',
        }),
      }}
      onDoubleClick={e => {
        e.stopPropagation();
        onFocus(isFocus ? undefined : getKey(node.entity));
      }}
    >
      {isFocus ? (
        <EditMessage
          id={id}
          streamName={streamName}
          node={node}
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
          onFocus={onFocus}
          onFocusUp={onFocusUp}
          onFocusDown={onFocusDown}
          onIndent={onIndent}
          onOutdent={onOutdent}
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
            <MessageContent message={node.entity} streamName={streamName} />
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
          <Tree streamName={streamName} mode={mode} selectedMessages={selectedMessages} setSelected={setSelected} tree={node.children} />
        </div>
      )}
    </div>
  );
};

const MessageContent = ({ message, streamName }: { streamName: string, message: MessageEntity }) => {
  if (/^data:image\//.exec(message.text)) {
    return <img src={message.text} />;
  }
  if (/^(https?:\/\/|www)/.exec(message.text)) {
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
  if (message.text === 'CHART') {
    return <Chart streamName={streamName} />
  }

  return <span>{message.text}</span>;
};

const EditMessage = ({
  id,
  streamName,
  node,
  onMoveDown,
  onMoveUp,
  onFocus,
  onFocusUp,
  onFocusDown,
  onIndent,
  onOutdent,
}: {
  id: string;
  streamName: string,
  node: Node<MessageEntity>;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onFocus: (value: string | undefined) => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}) => {
  const [dirty, setDirty] = useState(false)
  const text = useRef<HTMLInputElement>(null);
  useEffect(() => {
    text.current.focus();
    return () => {
      save();
    }
  }, []);
  const router = useRouter();
  const save = () => {
    if (dirty) {
      getStreams().updateMessage(node.entity, 'text', text.current.value);
      setDirty(false);
    }
  }
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        save();
        onFocus(undefined);
      }}
    >
      <input
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
        defaultValue={node.entity.text}
        onChange={() => {
          setDirty(true);
        }}
        onBlur={() => {
          save();
        }}
        onKeyDown={async e => {
          switch (e.keyCode) {
            case 13: // enter
              e.stopPropagation();
              save();
              if (e.ctrlKey) {
                const key = await getStreams().createMessage(streamName, {
                  text: ''
                }, node.entity, node.children[node.children.length - 1] && node.children[node.children.length - 1].entity)
                onFocus(key);
              } else {
                const key = await getStreams().createMessage(streamName, {
                  text: ''
                }, node.parent.entity, node.entity, node.parent.children[node.index + 1] && node.parent.children[node.index + 1].entity)
                onFocus(key);
              }
              break;
            case 8: // del
              e.stopPropagation();
              if (text.current.value === '' || e.ctrlKey) {
                getStreams().deleteMessages([node.entity], streamName)
              }
              break;
            case 27: // esc
              if (router.query.focus === id) {
                e.stopPropagation();
                e.preventDefault();
                setDirty(false);
                onFocus(undefined);
              }
              break;
            case 9: // tab
              e.preventDefault();
              e.stopPropagation();
              save();
              if (e.shiftKey) {
                onOutdent();
              } else {
                onIndent();
              }
              break;
            case 38: // up
              e.stopPropagation();
              e.preventDefault();
              save();
              if (e.ctrlKey) {
                onMoveUp();
              } else {
                onFocusUp();
              }
              break;
            case 40: // down
              e.stopPropagation();
              e.preventDefault();
              save();
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
        onPaste={async e => {
          const text = e.clipboardData.getData("Text");
          const lines = text ? text.trim().split("\n") : [];
          if (lines.length > 1 && node.children.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            for (const line of lines) {
              await getStreams().createMessage(streamName, {
                text: line,
              }, node.entity);
            }
          }
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
    <Layout>{router.query.name && <StreamComponent streamName={router.query.name as string} />}</Layout>
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
