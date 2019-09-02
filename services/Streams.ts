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
  index?: string;
  text: string;
  parent?: {
    '#': string;
  };
  _?: {
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

  public updateMessage(message: Message, key: string, value: string) {
    this.gun.get(this.getKey(message)).put({ [key]: value });
  }

  public getKey(o: any) {
    return this.Gun.node.soul(o);
  }

  public getIndex(message: Message) {
    if (message.index) {
      return JSON.parse(message.index);
    }

    return [this.getKey(message)];
  }

  public moveBetween(message: Message, previous: Message, next: Message) {
    this.updateMessage(message, 'index', JSON.stringify(this.getIndexInBetween(message, previous, next)));
  }

  private getIndexInBetween(message: Message, previous: Message, next: Message) {
    const previousIndex = previous ? this.getIndex(previous) : [];
    const nextIndex = next ? this.getIndex(next) : [];
    const index = [];
    const messageKey = this.getKey(message);
    let i = 0;
    while (!isBetween(messageKey, previousIndex[i], nextIndex[i])) {
      index.push(previousIndex[i++]);
    }
    index.push(messageKey);
    return index;
  }

  public compareMessages = (a: Message, b: Message) => {
    const indexA = this.getIndex(a);
    const indexB = this.getIndex(b);

    for (let i = 0; i < Math.max(indexA.length, indexB.length); i++) {
      if (indexA[i] !== indexB[i]) {
        return indexA[i] === undefined || indexA[i] < indexB[i] ? -1 : 1;
      }
    }

    return 0;
  };
}

const isBetween = (x: string, a: string, b: string) => (a === undefined || a < x) && (b === undefined || x < b);

const messageMap = m => (typeof m === 'string' ? undefined : m);
