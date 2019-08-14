let think: StreamsService;

export const getStreams = () => {
    if (!think) {
        think = new StreamsService(process.env.NAMESPACE);
    }
    return think;
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

    constructor(private namespace: string) {
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
        this.gun.get(this.namespace).map().on(listener);
    }

    onMessage(streamName: string, listener: (data: Message, key: string) => void) {
        this.gun.get(this.namespace).get(streamName).get('messages').map().on(listener)
    }
}