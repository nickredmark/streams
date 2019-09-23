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
      peers: servers
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
    return await new Promise(res => this.gun
      .get(this.namespace)
      .get(name)
      .put({
        name,
      }, res));
  }

  async createMessage(stream: string, message: Message, parent?: MessageEntity, prev?: MessageEntity, next?: MessageEntity) {
    let ref;
    for (let i = 0; i < 3; i++) {
      ref = this.gun
        .get(this.namespace)
        .get(stream)
        .get('messages')
        .set(message);
      if (ref) {
        break;
      }
      await new Promise(res => setTimeout(res, 0));
    }
    if (!ref) {
      console.log(stream, message);
      throw new Error('Failed 3 times to create message.')
    }
    if (parent) {
      this.append(ref, parent);
    }
    if (prev || next) {
      this.moveBetween(ref, prev, next);
    }
    this.gun
      .get(this.namespace)
      .get(stream)
      .get('lastMessage')
      .put(ref);
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

  onStreams(listener: (data: { data: Stream, key: string }[]) => void) {
    batch((cb) => this.onStream(cb), listener);
  }

  onMessage(streamName: string, listener: (data: Message, key: string) => void) {
    this.getStream(streamName)
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  onMessages(streamName: string, listener: (data: { data: Message, key: string }[]) => void) {
    batch((cb) => this.onMessage(streamName, cb), listener)
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

  deleteMessages(messages: MessageEntity[], stream: string) {
    const m = this.getStream(stream).get('messages');
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

  moveBetween(message: MessageEntity, prev: MessageEntity, next: MessageEntity) {
    moveBetween(this.gun, message, prev, next);
  }

  updateMessage(message: MessageEntity, key: string, value: string) {
    update(this.gun, message, key, value);
  }

  append(message: MessageEntity, parent: MessageEntity) {
    this.gun.get(getKey(message)).put({ parent });
  }
}

export const messageMap = m => m && typeof m === 'object' && m._ ? m : undefined;

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

    queue.push({ data, key })
    setTimeout(() => {
      listener(queue);
      lastMessage = undefined;
      queue = [];
    }, INTERVAL);
  })
}