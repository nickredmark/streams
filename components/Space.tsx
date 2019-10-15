import { useRef, useState, useEffect } from "react";
import { ShortMessageContent } from "../components/MessageContent";
import { getStreams, SpaceEntity, StreamEntity, MessageEntity } from "../services/Streams";
import { formatTime, streamComparator, getStreamTimestamp } from "../utils/time";
import { Layout } from "./Layout";
import { getId } from "../utils/secure";
import { Dictionary } from "lodash";

export const Space = ({ id, epriv, readerEpriv }: {
    id: string;
    epriv?: string;
    readerEpriv?: string;
}) => {
    const [encryptedStreams, setEncryptedStreams] = useState<Dictionary<StreamEntity>>({})
    const [encryptedMessages, setEncryptedMessages] = useState<Dictionary<MessageEntity>>({})
    const [streamEprivs, setStreamEprivs] = useState<Dictionary<string>>({});
    const [streamReaderEprivs, setStreamReaderEprivs] = useState<Dictionary<string>>({});
    const [streams, setStreams] = useState<Dictionary<StreamEntity>>({})
    const [messages, setMessages] = useState<Dictionary<MessageEntity>>({})
    const [space, setSpace] = useState<SpaceEntity>(null);

    useEffect(() => {
        getStreams().onSpace(id, async (space) => setSpace(await getStreams().decryptSpace({ epriv, readerEpriv, space })))
    }, [])

    readerEpriv = readerEpriv || space && space["reader-epriv"]

    useEffect(() => {
        if (!readerEpriv) {
            return;
        }
        getStreams().onSpaceStream({
            id,
            streamEprivListener: async (batch) => {
                if (!epriv) {
                    return
                }
                const decryptedBatch = [];
                for (const { data, key } of batch) {
                    decryptedBatch.push({
                        data: await getStreams().Gun.SEA.decrypt(data, epriv),
                        key
                    })
                }
                setStreamEprivs(streamEprivs => {
                    const newStreamEprivs = { ...streamEprivs };
                    for (const { data, key } of decryptedBatch) {
                        newStreamEprivs[key] = data;
                    }

                    return newStreamEprivs
                })
            },
            streamReaderEprivListener: async (batch) => {
                const decryptedBatch = [];
                for (const { data, key } of batch) {
                    decryptedBatch.push({
                        data: await getStreams().Gun.SEA.decrypt(data, readerEpriv),
                        key
                    })
                }
                setStreamReaderEprivs(streamReaderEprivs => {
                    const newStreamReaderEprivs = { ...streamReaderEprivs };
                    for (const { data, key } of decryptedBatch) {
                        newStreamReaderEprivs[key] = data;
                    }
                    return newStreamReaderEprivs
                })
            },
            streamListener: (batch) => setEncryptedStreams(streams => {
                const newStreams = { ...streams };
                for (const { data, key } of batch) {
                    newStreams[key] = {
                        ...streams[key],
                        ...data,
                    }
                }
                return newStreams
            }),
            lastMessageListener: (batch) => setEncryptedMessages(messages => {
                const newMessages = { ...messages };
                for (const { data } of batch) {
                    const key = getId(data);
                    newMessages[key] = {
                        ...newMessages[key],
                        ...data,
                    }
                }
                return newMessages
            })
        })
    }, [id, epriv, readerEpriv])

    useEffect(() => {
        (async () => {
            const streams = {};
            for (const key of Object.keys(encryptedStreams)) {
                if (streamReaderEprivs[key] || streamEprivs[key]) {
                    streams[key] = await getStreams().decryptStream({
                        epriv: streamEprivs[key],
                        readerEpriv: streamReaderEprivs[key],
                        stream: encryptedStreams[key]
                    });
                }
            }
            setStreams(streams);

            const messages = {};
            for (const messageId of Object.keys(encryptedMessages)) {
                const streamId = /(~.+)\.$/.exec(messageId)[1]
                if (streamReaderEprivs[streamId] || streamEprivs[streamId]) {
                    messages[messageId] = await getStreams().decryptMessage({
                        epriv: streamEprivs[streamId],
                        readerEpriv: streamReaderEprivs[streamId],
                        message: encryptedMessages[messageId]
                    });
                }
            }
            setMessages(messages);
        })()
    }, [streamReaderEprivs, streamEprivs, encryptedStreams, encryptedMessages]);

    const isWritable = space
        && getId(space).startsWith('~')
        && space.priv // needed for signing
        && space.epriv // needed for encryption of stream epriv
        && space["reader-epriv"] // needed for encryption;

    return (
        <Layout title={space && space.name || 'Space'}>
            <header><h1>{space && space.name}
                {isWritable &&
                    <a
                        className="space-permalink"
                        href={`/space/${id}/reader/${space["reader-epriv"]}`}
                        target="_blank"
                        onClick={e => {
                            e.preventDefault();
                            navigator.clipboard.writeText(`${location.origin}/space/${id}/reader/${space["reader-epriv"]}`);
                            alert('Readonly URL copied to clipboard!')
                        }}
                    >#</a>}
            </h1>
            </header>
            <div className="body">
                <div className="body-content">
                    <div className="content">
                        <ul
                            style={{
                                margin: 0,
                                listStyle: "none"
                            }}
                        >
                            {Object.keys(streams).sort(streamComparator(streams, messages)).map(id => {
                                const stream = streams[id]
                                const lastMessage = messages[stream.lastMessage && stream.lastMessage['#']];
                                return <li key={id}>
                                    <a href={streamEprivs[id] ? `/stream/${id}/member/${streamEprivs[id]}` : `/stream/${id}/reader/${streamReaderEprivs[id]}`} target="_blank" className="stream-item"
                                    ><span className="stream-item-name">{stream.name}</span>
                                        <span className="stream-item-date">{formatTime(getStreamTimestamp(stream, messages))}</span>
                                        <span className="stream-item-last-message">{lastMessage && lastMessage.text && <ShortMessageContent message={lastMessage} />}</span>
                                    </a>
                                </li>
                            })}
                        </ul>
                    </div>
                </div>
            </div>
            {isWritable && <NewStream space={space} />}
        </Layout>
    );
}

const NewStream = ({ space }: { space: SpaceEntity }) => {
    const name = useRef(null);
    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const streamName = name.current.value
                name.current.value = ''
                let match;
                if (match = /(~.+)\/(reader|member)\/([\w\-_]+)/.exec(streamName)) {
                    if (match[2] === 'reader') {
                        await getStreams().addStream({ space, streamId: match[1], streamReaderEpriv: match[3] })
                    } else {
                        await getStreams().addStream({ space, streamId: match[1], streamEpriv: match[3] })
                    }
                } else {
                    await getStreams().createStream({ space, streamName })
                }
            }}
        >
            <input ref={name} placeholder="new stream (or URL of existing stream)" style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "none",
                border: "none",
                borderTop: "1px solid lightgray"
            }} />
        </form>
    );
};