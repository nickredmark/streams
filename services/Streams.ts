let streams: StreamsService;

export const getStreams = () => {
    if (!streams) {
        streams = new StreamsService(
            process.env.NAMESPACE,
            process.env.STREAMS && process.env.STREAMS.split(',')
                .reduce((streams, s) => (streams[s.split(':')[0]] = s.split(':')[1], streams), {}));
    }
    return streams;
}

export type Stream = {
    name: string
};

export type Message = {
    text: string
}

export class StreamsService {
    public gun;
    public user;

    constructor(private namespace: string, private streams?: { [key: string]: string }) {
        this.gun = (window as any).Gun('https://gunjs.herokuapp.com/gun')
        this.user = this.gun.user();
    }

    async init() {
        /* no user needed for now
        await Promise.race([
            new Promise(res => this.user.recall({ sessionStorage: true }, res)),
            new Promise(res => setTimeout(res, 5000))
        ]);
        */
    }

    async createStream(name: string) {
        this.gun.get(this.namespace).get(name).put({
            name
        });
    }

    async createMessage(stream: Stream, message: Message) {
        const ref = this.gun.get(this.namespace).get(stream).get('messages').set(message);
        this.gun.get(this.namespace).get(stream).get('lastMessage').put(ref);
    }

    onStream(listener: (data: Stream, key: string) => void) {
        if (this.streams) {
            Object.values(this.streams).map(key => this.gun.get(key).on(listener))
        } else {
            this.gun.get(this.namespace).map().on(listener);
        }
    }

    onMessage(streamName: string, listener: (data: Message, key: string) => void) {
        if (this.streams) {
            this.gun.get(this.streams[streamName]).get('messages').map().on(listener);
        } else {
            this.gun.get(this.namespace).get(streamName).get('messages').map().on(listener)
        }
    }

    setStreamName(key: string, name: string) {
        this.gun.get(this.namespace).get(key).put({
            name
        })
    }
}