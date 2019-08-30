let streams: StreamsService;

export const getStreams = () => {
  if (!streams) {
    streams = new StreamsService(
      process.env.NAMESPACE,
      process.env.STREAMS &&
      process.env.STREAMS.split(",").reduce(
        (streams, s) => (
          (streams[s.split(":")[0]] = s.split(":")[1]), streams
        ),
        {}
      )
    );
  }
  return streams;
};

export type Stream = {
  name: string;
};

export type Message = {
  text: string;
};

export class StreamsService {
  public gun;
  public user;

  constructor(
    private namespace: string,
    private streams?: { [key: string]: string }
  ) {
    this.gun = (window as any).Gun('https://gunjs.herokuapp.com/gun');
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

  async createMessage(stream: string, message: Message) {
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
    this.getStream(streamName).get('messages').map(messageMap).on(listener);
  }

  onAnyMessage(listener: (data: Message, key) => void) {
    this.gun.get(this.namespace).map().get('messages').map(messageMap).on(listener);
  }

  setStreamName(key: string, name: string) {
    this.gun.get(this.namespace).get(key).put({
      name
    })
  }

  copyMessages(messages: Message[], to: string) {
    const m = this.getStream(to).get('messages');
    for (const message of messages) {
      console.log('Copying')
      m.set(message);
    }
  }

  deleteMessages(messages: Message[], from: string) {
    const m = this.getStream(from).get('messages');
    for (const message of messages) {
      // this.getStream(from).get('messages').unset(message); doesn't work :/
      m.put({ [getKey(message)]: null });
    }
  }

  private getStream(name: string) {
    if (this.streams) {
      return this.gun.get(this.streams[name]);
    } else {
      return this.gun.get(this.namespace).get(name);
    }
  }
}

const getKey = (o: any) => o._['#']

const messageMap = m => typeof m === 'string' ? undefined : m
