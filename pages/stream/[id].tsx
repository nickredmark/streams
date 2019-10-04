import { Layout } from '../../components/Layout';
import { useRef, Component, useEffect, useState } from 'react';
import { getStreams, MessageEntity, Message, StreamEntity } from '../../services/Streams';
import { useRouter } from 'next/router';
import { NewMessage } from '../../components/NewMessage';
import dragDrop from 'drag-drop';
import { Chart } from '../../components/Chart';
import { sort, getKey } from '../../utils/ordered-list';
import { treeify, Node } from '../../utils/trees';
import { Dictionary } from 'lodash';
import moment from 'moment';
import { ShyButton } from '../../components/ShyButton';
import { goTo, qstringify } from '../../utils/router';
import { StreamsProvider } from '../../components/StreamsProvider';

const addMessages = (batch: { key: string; data: Message }[], messages: Dictionary<MessageEntity>) => {
  for (const { data, key } of batch) {
    if (data) {
      messages[key] = {
        ...messages[key],
        ...data,
      };
    } else {
      delete messages[key];
    }
  }
  return messages;
};

type Props = { id: string; all: boolean; highlights: boolean; goTo: (query: any) => void }

type State = {
  messages: Dictionary<MessageEntity>;
  stream: StreamEntity;
  oldMessagesAvailable: boolean;
};

class StreamComponent extends Component<
  Props,
  State
  > {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      stream: null,
      oldMessagesAvailable: false,
    };
  }

  private allMessages: Dictionary<MessageEntity> = {};

  async componentDidMount() {
    const { id, all } = this.props;
    getStreams().onStream(id, (stream) => this.setState({ stream }));
    getStreams().onMessages(id, batch => {
      this.allMessages = addMessages(batch, this.allMessages);

      this.setState(({ messages, oldMessagesAvailable }) => {
        const newState: any = {};

        const filteredBatch = all
          ? batch
          : batch.filter(
            v =>
              v.data &&
              v.data &&
              v.data._ &&
              v.data._['>'] &&
              v.data._['>'].text &&
              moment(v.data._['>'].text) > moment().subtract(2, 'days'),
          );
        if (filteredBatch.length) {
          newState.messages = addMessages(filteredBatch, { ...messages });
        }
        if (!oldMessagesAvailable && filteredBatch.length !== batch.length) {
          newState.oldMessagesAvailable = true;
        }
        return newState;
      });
    });

    window.addEventListener('keydown', this.onKeyDown);

    dragDrop('body', async files => {
      for (const file of files) {
        const message = await toBase64(file);
        if (message.length > 1000000) {
          throw new Error(`File too large: ${message.length}`);
        }
        await getStreams().createMessage(id, {
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
      case 67: // c
        if (e.ctrlKey) {
          navigator.clipboard.writeText(this.getTree().reduce((s, node) => s + getFullText(node, 0), ''));
        }
        break;
      default:
        console.log(e.keyCode);
    }
  };

  getTree() {
    const { highlights } = this.props;
    const { messages } = this.state;
    const sortedMessages = sort(Object.values(messages).filter(m => !highlights || m.highlighted));
    const tree = treeify(sortedMessages);
    return tree;
  }

  render() {
    const { id, all, highlights, goTo } = this.props;
    const { oldMessagesAvailable, stream } = this.state;
    const tree = this.getTree();

    return (
      <Layout title={stream && stream.name}>
        <header><h1>{stream && stream.name}</h1></header>
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
        <div className="body-wrapper">
          <div className="body">
            <div className="body-content">
              <div className="content">
                {!all && oldMessagesAvailable && (
                  <ShyButton
                    onClick={() => {
                      this.setState({
                        messages: { ...this.allMessages },
                      });
                      goTo({ all: true });
                    }}
                  >
                    load full stream
            </ShyButton>
                )}
                {tree.length === 0 && stream && stream._['>'].lastMessage && moment(stream._['>'].lastMessage) > moment().subtract(2, 'days') && <div>Loading...</div>}
                <Tree
                  streamId={id}
                  tree={tree}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              background: 'transparent'
            }}
          >
            <a
              href="#"
              style={{
                display: 'inline-block',
                padding: '1rem',
                textDecoration: 'none',
                outline: 'none',
              }}
              onClick={e => (e.preventDefault(), goTo({ highlights: highlights ? undefined : true }))}
            >
              !
          </a>
          </div>
        </div>
        <NewMessage streamId={id} />
      </Layout >
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
  streamId,
  tree,
}: {
  streamId: string;
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
            streamId={streamId}
            id={key}
            node={node}
            focus={router.query.focus as string | undefined}
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
                const parentNext = node.parent.parent.children[node.parent.index + 1];
                getStreams().moveBetween(node.entity, node.parent.entity, parentNext && parentNext.entity);
              }
            }}
          />
        );
      })}
    </div>
  );
};

const MessageComponent = ({
  streamId,
  id,
  node,
  onMoveDown,
  onMoveUp,
  focus,
  onFocus,
  onFocusUp,
  onFocusDown,
  onIndent,
  onOutdent,
}: {
  streamId: string;
  id: string;
  node: Node<MessageEntity>;
  onMoveDown: () => void;
  onMoveUp: () => void;
  focus: string | undefined;
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
      onDoubleClick={e => {
        e.stopPropagation();
        if (focus !== id) {
          onFocus(getKey(node.entity));
        }
      }}
    >
      {focus === id ? (
        <EditMessage
          id={id}
          streamId={streamId}
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
          <div>
            <a id={id} />
            <MessageContent message={node.entity} streamId={streamId} />
            <a
              href="#"
              className="message-permalink"
              style={{
                marginLeft: '0.25rem',
                color: 'lightgray',
                textDecoration: 'none',
                fontSize: '0.8rem',
              }}
              onClick={e => {
                e.preventDefault();
                getStreams().updateMessage(node.entity, 'highlighted', !node.entity.highlighted);
              }}
            >
              !
          </a>
            <a
              className="message-permalink"
              style={{
                marginLeft: '0.25rem',
                color: 'lightgray',
                textDecoration: 'none',
                fontSize: '0.8rem',
              }}
              href={`/stream/${streamId}#${id}`}
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
          <Tree
            streamId={streamId}
            tree={node.children}
          />
        </div>
      )}
    </div>
  );
};

const MessageContent = ({ message, streamId }: { streamId: string; message: MessageEntity }) => {
  if (/^data:image\//.exec(message.text)) {
    return <img src={message.text} />;
  }
  if (/^data:/.exec(message.text)) {
    return <a href={message.text} target="_blank">[unknown attachment]</a>
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
    return <Chart streamId={streamId} />;
  }

  return (
    <span
      style={{
        ...(message.highlighted && {
          fontWeight: 'bold',
        }),
      }}
    >
      {message.text}
    </span>
  );
};

const EditMessage = ({
  id,
  streamId,
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
  streamId: string;
  node: Node<MessageEntity>;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onFocus: (value: string | undefined) => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}) => {
  const [dirty, setDirty] = useState(false);
  const text = useRef<HTMLInputElement>(null);
  useEffect(() => {
    text.current.focus();
    return () => {
      save();
    };
  }, []);
  const router = useRouter();
  const save = () => {
    if (dirty) {
      getStreams().updateMessage(node.entity, 'text', text.current.value);
      setDirty(false);
    }
  };
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
                const key = await getStreams().createMessage(
                  streamId,
                  {
                    text: '',
                  },
                  node.entity,
                  node.children[node.children.length - 1] && node.children[node.children.length - 1].entity,
                );
                onFocus(key);
              } else {
                const key = await getStreams().createMessage(
                  streamId,
                  {
                    text: '',
                  },
                  node.parent.entity,
                  node.entity,
                  node.parent.children[node.index + 1] && node.parent.children[node.index + 1].entity,
                );
                onFocus(key);
              }
              break;
            case 8: // del
              e.stopPropagation();
              if (text.current.value === '' || e.ctrlKey) {
                getStreams().deleteMessages([node.entity], streamId);
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
        onCopy={e => {
          if (text.current.selectionEnd === text.current.selectionStart) {
            e.stopPropagation();
            navigator.clipboard.writeText(getFullText(node, 0));
          }
        }}
        onPaste={async e => {
          const text = e.clipboardData.getData('Text');
          const lines = text ? text.trim().split('\n') : [];
          if (lines.length > 1 && node.children.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            for (const line of lines) {
              await getStreams().createMessage(
                streamId,
                {
                  text: line,
                },
                node.entity,
              );
            }
          }
        }}
      />
    </form>
  );
};

export default () => {
  const router = useRouter();
  return <StreamsProvider>{router.query.id && <StreamComponent {...(router.query as any)} goTo={goTo(router)} />}</StreamsProvider>;
};


const getFullText = (current: Node<MessageEntity>, indentation: number) => {
  let fullText = `${'  '.repeat(indentation)}${current.entity.text}\n`;
  for (const node of current.children) {
    fullText += getFullText(node, indentation + 1);
  }
  return fullText;
};
