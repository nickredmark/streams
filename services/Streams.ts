import { moveBetween, update, GunEntity, Ordered, getKey, getIndexBetween, Primitive } from '../utils/ordered-list';
import moment from 'moment';

let streams: StreamsService;

export const getStreams = () => {
  if (!streams) {
    streams = new StreamsService(
      process.env.SERVERS.split(',').filter(Boolean),
    );
  }
  return streams;
};

export type Space = {
  name: string
}

export type SpaceEntity = Space & GunEntity;

export type Stream = {
  name: string;
  lastMessage: any;
};

export type StreamEntity = Stream & GunEntity;

export type Message = {
  text: string;
  highlighted?: boolean;
};

export type MessageEntity = Message & GunEntity & Ordered;

export class StreamsService {
  private Gun;
  public gun;
  public user;

  constructor(private servers: string[]) {
  }

  async init() {
    while (!(window as any).Gun) {
      console.warn('Gun not available yet.')
      await new Promise(res => setTimeout(res, 100));
    }
    this.Gun = (window as any).Gun;
    this.gun = this.Gun({
      localStorage: false,
      peers: this.servers,
    });
    /* no user needed for now
    this.user = this.gun.user();
        await Promise.race([
            new Promise(res => this.user.recall({ sessionStorage: true }, res)),
            new Promise(res => setTimeout(res, 5000))
        ]);
        */
  }

  async createSpace(name: string): Promise<SpaceEntity> {
    return await new Promise(res => { const ref = this.gun.get(this.gun.opt()._.opt.uuid()).put({ name }, () => res(ref)) });
  }

  async createStream(space: string, name: string): Promise<StreamEntity> {
    return await new Promise(res => {
      const ref = this.gun
        .get(space)
        .get('streams')
        .set({
          name
        }, () => res(ref))
    });
  }

  async addStream(space: string, streamId: string) {
    return await new Promise(res => {
      const ref = this.gun.get(streamId);
      this.gun.get(space).get('streams').get(streamId).put(ref);
      console.log(ref);
      res();
    })
  }

  async createMessage(stream: string, message: Message, parent?: MessageEntity, prev?: MessageEntity, next?: MessageEntity) {
    let ref;
    for (let i = 0; i < 3; i++) {
      ref = this.gun
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
      throw new Error('Failed 3 times to create message.');
    }
    if (parent) {
      this.append(ref, parent);
    }
    if (prev || next) {
      this.moveBetween(ref, prev, next);
    }
    this.gun
      .get(stream)
      .get('lastMessage')
      .put(ref);
    return getKey(ref);
  }

  onSpace(id: string, listener: (data: SpaceEntity, id: string) => void) {
    this.gun.get(id).on(listener);
  }

  onStream(id: string, listener: (data: StreamEntity, id: string) => void) {
    this.gun.get(id).on(listener);
  }

  onSpaceStream(space: string, listener: (data: StreamEntity, key: string) => void) {
    this.gun
      .get(space)
      .get('streams')
      .map()
      .on(listener);
  }

  onStreams(space: string, listener: (data: { data: StreamEntity; key: string }[]) => void) {
    batch(cb => this.onSpaceStream(space, cb), listener);
  }

  onMessage(streamName: string, listener: (data: MessageEntity, key: string) => void) {
    this.getStream(streamName)
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  onMessages(streamName: string, listener: (data: { data: MessageEntity; key: string }[]) => void) {
    batch(cb => this.onMessage(streamName, cb), listener);
  }

  onAnyMessage(space: string, listener: (data: Message, key) => void) {
    this.gun
      .get(space)
      .map()
      .get('messages')
      .map(messageMap)
      .on(listener);
  }

  setStreamName(key: string, name: string) {
    this.gun
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

  private getStream(key: string) {
    return this.gun.get(key);
  }

  moveBetween(message: MessageEntity, prev: MessageEntity, next: MessageEntity) {
    moveBetween(this.gun, message, prev, next);
  }

  updateMessage(message: MessageEntity, key: string, value: Primitive) {
    update(this.gun, message, key, value);
  }

  append(message: MessageEntity, parent: MessageEntity) {
    this.gun.get(getKey(message)).put({ parent });
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
