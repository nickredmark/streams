import { MessageEntity } from "../services/Streams";
import ReactPlayer from "react-player";
import { TwitterTweetEmbed } from 'react-twitter-embed'
import { Chart } from './Chart';

export const MessageContent = ({ message, streamId, epriv, readerEpriv }: { streamId: string; message: MessageEntity, epriv: string, readerEpriv: string }) => {
    if (/^data:image\//.exec(message.text)) {
        return <img src={message.text} />;
    }
    if (/^data:/.exec(message.text)) {
        return <a href={message.text} target="_blank">[unknown attachment]</a>
    }
    if (/youtube\.com\/watch/.exec(message.text) || /youtu\.be\//.exec(message.text)) {
        return <div className="player-wrapper"><ReactPlayer className="react-player" url={message.text} width="100%" height="100%" /></div>
    }
    if (/twitter.com\/\w+\/status\/\d+/.exec(message.text)) {
        return <TwitterTweetEmbed tweetId={message.text.split('/').pop()} options={{ conversation: 'none' }} />
    }
    if (message.text === 'CHART') {
        return <Chart streamId={streamId} epriv={epriv} readerEpriv={readerEpriv} />;
    }
    if (/^(\.+|-+|\*+|~+)$/.exec(message.text)) {
        return <hr />
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

export const ShortMessageContent = ({ message }: { message: MessageEntity }) => {
    if (/^data:image\//.exec(message.text)) {
        return <span>[image]</span>
    }
    if (/^data:/.exec(message.text)) {
        return <span>[attachment]</span>
    }
    if (/youtube\.com\/watch/.exec(message.text) || /youtu\.be\//.exec(message.text)) {
        return <span>[youtube video]</span>
    }
    if (/twitter.com\/\w+\/status\/\d+/.exec(message.text)) {
        return <span>[twitter status]</span>
    }
    if (message.text === 'CHART') {
        return <span>[chart]</span>
    }
    if (/^(\.+|-+|\*+|~+)$/.exec(message.text)) {
        return <span>[end]</span>
    }

    const LENGTH = 50;
    if (message.text.length > LENGTH) {
        return <span>{message.text.substr(0, LENGTH)}...</span>
    }
    return <span>{message.text}</span>
}