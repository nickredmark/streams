let streams: StreamsService;

export const getStreams = () => {
  if (!streams) {
    streams = new StreamsService(
      process.env.NAMESPACE,
      process.env.SERVERS.split(',').filter(Boolean),
      process.env.STREAMS &&
        process.env.STREAMS.split(',').reduce((streams, s) => ((streams[s.split(':')[0]] = s.split(':')[1]), streams), {}),
    );
  }
  return streams;
};

export type Stream = {
  name: string;
};

export type Message = {
  text: string;
  parent: {
    '#': string;
  };
  _: {
    '#': string;
  };
};

export class StreamsService {
  private Gun;
  public gun;
  public user;

  constructor(private namespace: string, servers: string[], private streams?: { [key: string]: string }) {
    this.Gun = (window as any).Gun;
    this.gun = this.Gun(...servers);
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
    this.gun
      .get(this.namespace)
      .get(name)
      .put({
        name,
      });
  }

  async createMessage(stream: Stream, message: Message) {
    const ref = this.gun
      .get(this.namespace)
      .get(stream)
      .get('messages')
      .set(message);
    this.gun
      .get(this.namespace)
      .get(stream)
      .get('lastMessage')
      .put(ref);
  }

  onStream(listener: (data: Stream, key: string) => void) {
    if (this.streams) {
      Object.values(this.streams).map(key => this.gun.get(key).on(listener));
    } else {
      this.gun
        .get(this.namespace)
        .map()
        .on(listener);
    }
  }

  onMessage(streamName: string, listener: (data: Message, key: string) => void) {
    if (this.streams) {
      this.gun
        .get(this.streams[streamName])
        .get('messages')
        .map()
        .on(listener);
    } else {
      this.gun
        .get(this.namespace)
        .get(streamName)
        .get('messages')
        .map()
        .on(listener);
    }
  }

  onAnyMessage(listener: (data: Message, key) => void) {
    this.gun
      .get(this.namespace)
      .map()
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  setStreamName(key: string, name: string) {
    this.gun
      .get(this.namespace)
      .get(key)
      .put({
        name,
      });
  }

  copyMessages(messages: Message[], to: string) {
    const m = this.getStream(to).get('messages');
    for (const message of messages) {
      m.set(message);
    }
  }

  deleteMessages(messages: Message[], from: string) {
    const m = this.getStream(from).get('messages');
    for (const message of messages) {
      // this.getStream(from).get('messages').unset(message); doesn't work :/
      m.put({ [this.getKey(message)]: null });
    }
  }

  private getStream(name: string) {
    if (this.streams) {
      return this.gun.get(this.streams[name]);
    } else {
      return this.gun.get(this.namespace).get(name);
    }
  }

  public updateMessage(message: Message, text: string) {
    this.gun.get(this.getKey(message)).put({ text });
  }

  public setSub(message: Message, sub: boolean) {
    this.gun.get(this.getKey(message)).put({ sub });
  }

  public setParent(message: Message, parent: Message) {
    this.gun.get(this.getKey(message)).put({ parent });
    if (parent.parent && parent.parent['#'] === this.getKey(message)) {
      this.gun.get(this.getKey(parent));
    }
  }

  public getKey(o: any) {
    return this.Gun.node.soul(o);
  }
}

const messageMap = m => (typeof m === 'string' ? undefined : m);
