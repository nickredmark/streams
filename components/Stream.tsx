import { Layout } from './Layout';
import { useRef, useEffect, useState } from 'react';
import { getStreams, MessageEntity, Message, StreamEntity } from '../services/Streams';
import { useRouter } from 'next/router';
import { NewMessage } from './NewMessage';
import dragDrop from 'drag-drop';
import { sort } from '../utils/ordered-list';
import { treeify, Node } from '../utils/trees';
import { Dictionary } from 'lodash';
import moment from 'moment';
import { ShyButton } from './ShyButton';
import { MessageContent } from './MessageContent';
import { getId } from '../utils/secure';

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

let allMessages: Dictionary<MessageEntity> = {};

export const StreamComponent = ({ id, all, highlights, epriv, readerEpriv, goTo }: { id: string; epriv?: string, readerEpriv?: string; all: boolean; highlights: boolean; goTo: (query: any) => void }) => {
    const [stream, setStream] = useState<StreamEntity>(null);
    const [{ messages, oldMessagesAvailable }, setMessages] = useState<{ oldMessagesAvailable: boolean, messages: Dictionary<MessageEntity> }>({ oldMessagesAvailable: false, messages: {} });
    const isWritable = !!(id.startsWith('~')
        && epriv
        && stream
        && stream.priv // needed for signing
        && stream.epriv // needed for encryption of stream epriv
        && stream["reader-epriv"]) // needed for encryption;

    const sortedMessages = sort(Object.values(messages).filter(m => !highlights || m.highlighted));
    const tree = treeify(sortedMessages);


    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.keyCode) {
                case 67: // c
                    if (e.ctrlKey) {
                        navigator.clipboard.writeText(tree.reduce((s, node) => s + getFullText(node, 0), ''));
                    }
                    break;
                default:
                    console.log(e.keyCode);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [])

    useEffect(() => {
        if (isWritable) {
            dragDrop('body', async files => {
                for (const file of files) {
                    const message = await toBase64(file);
                    if (message.length > 1000000) {
                        throw new Error(`File too large: ${message.length}`);
                    }
                    await getStreams().createMessage({
                        stream,
                        message: {
                            text: message,
                        }
                    });
                }
            });
        }
    }, [isWritable])

    useEffect(() => {
        getStreams().onStream(id, async (stream) => setStream(await getStreams().decryptStream({ epriv, readerEpriv, stream })));
    }, [])

    readerEpriv = readerEpriv || stream && stream["reader-epriv"]

    useEffect(() => {
        if (!readerEpriv) {
            return;
        }
        getStreams().onMessage(id, async batch => {
            const decryptedBatch: { data: MessageEntity, key: string }[] = [];
            for (const { data, key } of batch) {
                decryptedBatch.push({ data: await getStreams().decryptMessage({ epriv, readerEpriv, message: data }), key });
            }
            allMessages = addMessages(decryptedBatch, allMessages);

            setMessages(({ messages, oldMessagesAvailable }) => {
                const newState = { messages, oldMessagesAvailable };
                const filteredBatch = all
                    ? decryptedBatch
                    : decryptedBatch.filter(
                        v =>
                            v.data === null ||
                            v.data &&
                            v.data._ &&
                            v.data._['>'] &&
                            v.data._['>'].text &&
                            moment(v.data._['>'].text) > moment().subtract(2, 'days'),
                    );
                if (filteredBatch.length) {
                    newState.messages = addMessages(filteredBatch, { ...messages });
                }
                if (!oldMessagesAvailable && filteredBatch.length !== decryptedBatch.length) {
                    newState.oldMessagesAvailable = true;
                }
                return newState;
            });
        });
    }, [id, epriv, readerEpriv])

    return (
        <Layout title={stream && stream.name}>
            <header><h1>{stream && stream.name}
                {isWritable &&
                    <a
                        className="space-permalink"
                        href={`/stream/${id}/reader/${stream["reader-epriv"]}`}
                        target="_blank"
                        onClick={e => {
                            e.preventDefault();
                            navigator.clipboard.writeText(`${location.origin}/stream/${id}/reader/${stream["reader-epriv"]}`);
                            alert('Readonly URL copied to clipboard!')
                        }}
                    >#</a>}
            </h1></header>
            <div className="body-wrapper">
                <div className="body">
                    <div className="body-content">
                        <div className="content">
                            {!all && oldMessagesAvailable && (
                                <ShyButton
                                    onClick={() => {
                                        setMessages({
                                            oldMessagesAvailable,
                                            messages: { ...allMessages }
                                        })
                                        goTo({ all: true });
                                    }}
                                >
                                    load full stream

                                </ShyButton>
                            )}
                            {tree.length === 0 && stream && stream._['>'].lastMessage && moment(stream._['>'].lastMessage) > moment().subtract(2, 'days') && <div>Loading...</div>}
                            <Tree
                                onFocus={focus => goTo({ focus })}
                                stream={stream}
                                streamId={id}
                                tree={tree}
                                isWritable={isWritable}
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
            {isWritable && <NewMessage stream={stream} />}
        </Layout >
    );
}

const toBase64 = file =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

const Tree = ({
    stream,
    streamId,
    tree,
    onFocus,
    isWritable,
}: {
    onFocus: (focus: string | undefined) => void,
    stream: StreamEntity,
    streamId: string;
    tree: Node<MessageEntity>[];
    isWritable: boolean;
}) => {
    const router = useRouter();

    return (
        <div>
            {tree.map((node, i) => {
                const id = getId(node.entity);
                return (
                    <MessageComponent
                        key={id}
                        stream={stream}
                        streamId={streamId}
                        id={id}
                        node={node}
                        focus={router.query.focus as string | undefined}
                        onFocus={value => onFocus(value)}
                        isWritable={isWritable}
                        onFocusUp={() => tree[i - 1] && onFocus(getId(tree[i - 1].entity))}
                        onFocusDown={() => tree[i + 1] && onFocus(getId(tree[i + 1].entity))}
                        onMoveUp={() => {
                            const pprev = tree[i - 2];
                            const prev = tree[i - 1];
                            if (prev) {
                                getStreams().moveBetween({ stream, currentId: id, previous: pprev && pprev.entity, next: prev.entity });
                            }
                        }}
                        onMoveDown={() => {
                            const next = tree[i + 1];
                            const nnext = tree[i + 2];
                            if (next) {
                                getStreams().moveBetween({ stream, currentId: id, previous: next.entity, next: nnext && nnext.entity });
                            }
                        }}
                        onIndent={() => {
                            const prev = tree[i - 1];
                            if (prev) {
                                getStreams().append({ stream, messageId: id, parentId: getId(prev.entity) });
                                if (prev.children.length) {
                                    getStreams().moveBetween({ stream, currentId: id, previous: prev.children[prev.children.length - 1].entity, next: undefined });
                                }
                            }
                        }}
                        onOutdent={() => {
                            if (node.parent && node.parent.parent) {
                                getStreams().append({ stream, messageId: id, parentId: getId(node.parent.parent.entity) });
                                const parentNext = node.parent.parent.children[node.parent.index + 1];
                                getStreams().moveBetween({ stream, currentId: id, previous: node.parent.entity, next: parentNext && parentNext.entity });
                            }
                        }}
                    />
                );
            })}
        </div>
    );
};

const MessageComponent = ({
    stream,
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
    isWritable,
}: {
    stream: StreamEntity;
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
    isWritable: boolean;
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
            onDoubleClick={isWritable && (e => {
                e.stopPropagation();
                if (focus !== id) {
                    onFocus(getId(node.entity));
                }
            })}
        >
            {isWritable && focus === id ? (
                <EditMessage
                    id={id}
                    stream={stream}
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
                    <div style={{ position: 'relative' }}>
                        <a id={id} />
                        <MessageContent message={node.entity} streamId={streamId} epriv={stream.epriv} readerEpriv={stream["reader-epriv"]} />
                        <div className="message-meta">
                            {isWritable &&
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
                                        getStreams().updateMessage({ stream, messageId: id, key: 'highlighted', value: !node.entity.highlighted });
                                    }}
                                >
                                    !
                                </a>
                            }
                            <a
                                className="message-permalink"
                                href={`/stream/${streamId}#${id}`}
                            >
                                #
                            </a>
                        </div>
                    </div>
                )}
            {node.children.length > 0 && (
                <div
                    style={{
                        marginLeft: '1rem',
                    }}
                >
                    <Tree
                        stream={stream}
                        onFocus={onFocus}
                        streamId={streamId}
                        tree={node.children}
                        isWritable={isWritable}
                    />
                </div>
            )}
        </div>
    );
};

const EditMessage = ({
    id,
    stream,
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
    stream: StreamEntity,
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
    const save = async () => {
        if (dirty) {
            await getStreams().updateMessage({ stream, messageId: id, key: 'text', value: text.current.value });
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
                    e.persist();
                    switch (e.keyCode) {
                        case 13: // enter
                            e.stopPropagation();
                            await save();
                            if (e.ctrlKey) {
                                const key = await getStreams().createMessage({
                                    stream,
                                    message: {
                                        text: '',
                                    },
                                    parentId: getId(node.entity),
                                    previous: node.children[node.children.length - 1] && node.children[node.children.length - 1].entity,
                                });
                                onFocus(key);
                            } else {
                                const key = await getStreams().createMessage({
                                    stream,
                                    message: {
                                        text: '',
                                    },
                                    parentId: getId(node.parent.entity),
                                    previous: node.entity,
                                    next: node.parent.children[node.index + 1] && node.parent.children[node.index + 1].entity,
                                });
                                onFocus(key);
                            }
                            break;
                        case 8: // del
                            e.stopPropagation();
                            if (text.current.value === '' || e.ctrlKey) {
                                getStreams().deleteMessage({
                                    stream,
                                    messageId: getId(node.entity)
                                });
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
                                {
                                    stream,
                                    message: {
                                        text: line,
                                    },
                                    parentId: getId(node.entity)
                                }
                            );
                        }
                    }
                }}
            />
        </form>
    );
};

const getFullText = (current: Node<MessageEntity>, indentation: number) => {
    let fullText = `${'  '.repeat(indentation)}${current.entity.text}\n`;
    for (const node of current.children) {
        fullText += getFullText(node, indentation + 1);
    }
    return fullText;
};
