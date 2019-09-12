import { moveBetween, update, GunEntity, Ordered, getKey, getIndexBetween } from '../utils/ordered-list';
import moment from 'moment';

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

export type StreamEntity = Stream & GunEntity;

export type Message = {
  text: string;
};

export type MessageEntity = Message & GunEntity & Ordered;

export class StreamsService {
  private Gun;
  public gun;
  public user;

  constructor(private namespace: string, servers: string[], private streams?: { [key: string]: string }) {
    this.Gun = (window as any).Gun;
    this.gun = this.Gun({
      localStorage: false,
      peers: servers,
    });
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
    await new Promise(res =>
      this.gun
        .get(this.namespace)
        .get(name)
        .put(
          {
            name,
          },
          res,
        ),
    );
  }

  async createMessage(stream: string, message: Message, parent?: MessageEntity, prev?: MessageEntity, next?: MessageEntity) {
    const ref = await new Promise<any>(res => {
      const ref = this.gun
        .get(this.namespace)
        .get(stream)
        .get('messages')
        .set(message, () => res(ref));
    });
    if (parent) {
      await this.append(ref, parent);
    }
    if (prev || next) {
      await this.moveBetween(ref, prev, next);
    }
    await new Promise(res =>
      this.gun
        .get(this.namespace)
        .get(stream)
        .get('lastMessage')
        .put(ref, res),
    );
    return getKey(ref);
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

  onStreams(listener: (data: { data: Stream; key: string }[]) => void) {
    batch(cb => this.onStream(cb), listener);
  }

  onMessage(streamName: string, listener: (data: Message, key: string) => void) {
    this.getStream(streamName)
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  onMessages(streamName: string, listener: (data: { data: Message; key: string }[]) => void) {
    batch(cb => this.onMessage(streamName, cb), listener);
  }

  onAnyMessage(listener: (data: Message, key) => void) {
    this.gun
      .get(this.namespace)
      .map()
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  async copyMessages(messages: Message[], to: string) {
    const m = this.getStream(to).get('messages');
    for (const message of messages) {
      await new Promise(res => m.set(message, res));
    }
  }

  async deleteMessages(messages: MessageEntity[], stream: string) {
    const m = this.getStream(stream).get('messages');
    for (const message of messages) {
      // this.getStream(from).get('messages').unset(message); doesn't work :/
      await new Promise(res => m.put({ [getKey(message)]: null }, res));
    }
  }

  private getStream(name: string) {
    if (this.streams) {
      return this.gun.get(this.streams[name]);
    } else {
      return this.gun.get(this.namespace).get(name);
    }
  }

  async moveBetween(message: MessageEntity, prev: MessageEntity, next: MessageEntity) {
    await moveBetween(this.gun, message, prev, next);
  }

  async updateMessage(message: MessageEntity, key: string, value: string) {
    await update(this.gun, message, key, value);
  }

  async append(message: MessageEntity, parent: MessageEntity) {
    await new Promise(res => this.gun.get(getKey(message)).put({ parent }, res));
  }
}

export const messageMap = m => (m && typeof m === 'object' && m._ ? m : undefined);

const INTERVAL = 200;

const batch = (fn, listener) => {
  let lastMessage;
  let queue = [];
  fn((data, key) => {
    if (queue.length) {
      queue.push({ data, key });
      return;
    }

    if (!lastMessage || lastMessage < moment().subtract(INTERVAL, 'ms')) {
      lastMessage = moment();
      listener([{ data, key }]);
      return;
    }

    queue.push({ data, key });
    setTimeout(() => {
      listener(queue);
      lastMessage = undefined;
      queue = [];
    }, INTERVAL);
  });
};

const retry = async fn => {
  let res;
  for (let i = 0; i < 3; i++) {
    res = fn();
    if (res) {
      return res;
    }
    await new Promise(res => setTimeout(res, 0));
  }
  throw new Error('Failed 3 times.');
};
