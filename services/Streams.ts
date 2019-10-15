import { moveBetween, Ordered } from '../utils/ordered-list';
import moment from 'moment';
import { GunEntity, Gun, GUN, put, Credentials, create, getPub, Link, Primitive, GunRootEntity, getId, decrypt } from '../utils/secure';

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
  name: string;
}

export type SpaceEntity = Space & GunRootEntity;

export type Stream = {
  name: string;
  lastMessage: Link;
};


export type StreamEntity = Stream & GunRootEntity;

export type Message = {
  text: string;
  highlighted?: boolean;
};

export type MessageEntity = Message & GunEntity & Ordered;

type Group = 'member' | 'reader' | 'guest'

const MAP = {
  _: 'guest' as Group,
  priv: 'member' as Group,
  epriv: 'member' as Group,
  'reader-epriv': 'member' as Group,
  created: 'reader' as Group,
}

export class StreamsService {
  public Gun: GUN;
  public gun: Gun;

  constructor(private servers: string[]) { }

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
  }

  /* WRITE */

  async createSpace(name: string): Promise<Credentials> {
    const cred = await create({ Gun: this.Gun, gun: this.gun });
    const base = {
      Gun: this.Gun,
      gun: this.gun,
      priv: cred.priv,
      pub: cred.pub,
      epriv: cred.readerEpriv,
      id: cred.id,
    }
    await put({ ...base, key: 'name', value: name });

    return cred;
  }

  async createStream({ space, streamName }: { space?: SpaceEntity, streamName: string }) {
    const cred = await create({ Gun: this.Gun, gun: this.gun });
    const base = {
      Gun: this.Gun,
      gun: this.gun,
      pub: cred.pub,
      priv: cred.priv,
      epriv: cred.readerEpriv,
    }
    await put({ ...base, key: 'name', value: streamName });
    if (space) {
      await this.addStream({ space, streamId: `~${cred.pub}`, streamEpriv: cred.epriv, streamReaderEpriv: cred.readerEpriv })
    }
    return cred;
  }

  async addStream({
    space,
    streamId,
    streamEpriv,
    streamReaderEpriv,
  }: {
    space: SpaceEntity,
    streamId: string,
    streamEpriv?: string,
    streamReaderEpriv?: string
  }) {
    const base = {
      Gun: this.Gun,
      gun: this.gun,
      pub: getPub(space),
      priv: space.priv,
      epriv: space['reader-epriv'],
      key: streamId
    }
    await put({ ...base, sub: 'streams', link: streamId });
    if (streamEpriv) {
      await put({ ...base, epriv: space.epriv, sub: 'streams-eprivs', value: streamEpriv });
      if (!streamReaderEpriv) {
        streamReaderEpriv = await this.gun.get(streamId).get('reader-epriv').then() as string;
        streamReaderEpriv = await decrypt(this.Gun, streamReaderEpriv, streamEpriv)
      }
    }
    if (streamReaderEpriv) {
      await put({ ...base, sub: 'streams-reader-eprivs', value: streamReaderEpriv });
    }
  }

  async createMessage({ stream, message, parentId, previous, next }: { stream: StreamEntity, message: Message, parentId?: string, previous?: MessageEntity, next?: MessageEntity }) {
    const uuid = this.getUUID();
    const pub = getPub(stream);
    const base = { Gun: this.Gun, gun: this.gun, priv: stream.priv, epriv: stream["reader-epriv"], pub: pub }
    const messageId = `${uuid}~${pub}.`;
    await put({ ...base, sub: uuid, key: 'created', value: +new Date() })
    for (const key of Object.keys(message)) {
      await put({ ...base, sub: uuid, key, value: message[key] });
    }
    if (parentId) {
      await this.append({ stream, messageId, parentId });
    }
    if (previous || next) {
      await this.moveBetween({ stream, currentId: messageId, previous, next });
    }
    await put({ ...base, sub: 'messages', key: messageId, link: messageId })
    await put({ ...base, key: 'lastMessage', link: messageId })
    return messageId;
  }

  async updateMessage({ stream, messageId, key, value }: { stream: StreamEntity, messageId: string, key: string, value: Primitive }) {
    await put({ Gun: this.Gun, gun: this.gun, pub: getPub(stream), priv: stream.priv, epriv: stream["reader-epriv"], id: messageId, key, value })
  }

  async deleteMessage({ stream, messageId }: { stream: StreamEntity, messageId: string }) {
    await put({
      Gun: this.Gun,
      gun: this.gun,
      priv: stream.priv,
      epriv: stream["reader-epriv"],
      pub: getPub(stream),
      sub: 'messages',
      key: messageId,
      link: null
    })
  }

  async deleteStream({ space, streamId }: { space: SpaceEntity, streamId: string }) {
    await put({
      Gun: this.Gun,
      gun: this.gun,
      priv: space.priv,
      epriv: space["reader-epriv"],
      pub: getPub(space),
      sub: 'streams',
      key: streamId,
      link: null
    })
  }

  async moveBetween({ stream, ...rest }: { stream: StreamEntity, currentId: string, previous: MessageEntity, next: MessageEntity }) {
    await moveBetween({ Gun: this.Gun, gun: this.gun, pub: getPub(stream), priv: stream.priv, epriv: stream["reader-epriv"], ...rest });
  }

  async append({ stream, messageId, parentId }: { stream: StreamEntity, messageId: string, parentId: string }) {
    await put({ Gun: this.Gun, gun: this.gun, pub: getPub(stream), priv: stream.priv, epriv: stream["reader-epriv"], id: messageId, key: 'parent', link: parentId })
  }

  /* DECRYPT */

  async decryptSpace({ epriv, readerEpriv, space }: { epriv?: string, readerEpriv?: string, space: SpaceEntity }) {
    return this.decrypt({
      epriv, readerEpriv, entity: space, map: {
        ...MAP,
        name: 'reader',
      }
    })
  }

  async decryptStream({ epriv, readerEpriv, stream }: { epriv?: string, readerEpriv?: string, stream: StreamEntity }) {
    return this.decrypt({
      epriv, readerEpriv, entity: stream, map: {
        ...MAP,
        name: 'reader',
        lastMessage: 'guest'
      }
    })
  }

  async decryptMessage({ epriv, readerEpriv, message }: { epriv?: string, readerEpriv?: string, message: MessageEntity }) {
    return this.decrypt({
      epriv, readerEpriv, entity: message, map: {
        ...MAP,
        highlighted: 'reader',
        index: 'reader',
        text: 'reader'
      }
    })
  }

  async decrypt<T extends GunEntity>({ epriv, readerEpriv, entity, map }: { epriv?: string, readerEpriv?: string, entity: T, map: { [x in keyof T]: Group } }): Promise<T> {
    if (entity === null) {
      return entity;
    }
    if (!readerEpriv && epriv) {
      if (!entity["reader-epriv"]) {
        throw new Error('Too early to decript this entity.')
      }
      readerEpriv = await decrypt(this.Gun, entity["reader-epriv"], epriv);
    }
    const keysByRole = {
      member: epriv,
      reader: readerEpriv,
    }
    entity = { ...entity };
    for (const key of Object.keys(entity)) {
      if (typeof entity[key] === 'string' && entity[key].startsWith('SEA{')) {
        if (keysByRole[map[key]]) {
          entity[key] = await decrypt(this.Gun, entity[key], keysByRole[map[key]])
        } else {
          delete entity[key]
        }
      }
    }
    return entity;
  }

  /* READ */

  async onSpace(id: string, listener: (data: SpaceEntity, id: string) => void) {
    this.gun.get(id).on(listener);
  }

  onStream(id: string, listener: (data: StreamEntity, id: string) => void) {
    this.gun.get(id).on(listener);
  }

  onLastMessage(id: string, listener: (message: MessageEntity, id: string) => void) {
    this.gun.get(id).get('lastMessage').on(listener);
  }

  onSpaceStream({
    id,
    streamEprivListener,
    streamReaderEprivListener,
    streamListener,
    lastMessageListener
  }: {
    id: string,
    streamEprivListener: (data: { data: string; key: string }[]) => void,
    streamReaderEprivListener: (data: { data: string; key: string }[]) => void,
    streamListener: (data: { data: StreamEntity; key: string }[]) => void,
    lastMessageListener: (data: { data: MessageEntity; key: string }[]) => void
  }) {
    batch((streamEprivListener, streamReaderEprivListener, streamListener, lastMessageListener) => {
      this.gun.get(`streams-eprivs${id}.`).map().on(streamEprivListener)
      this.gun.get(`streams-reader-eprivs${id}.`).map().on(streamReaderEprivListener)
      this.gun
        .get(`streams${id}.`)
        .map()
        .on(streamListener)
        .get('lastMessage')
        .on(lastMessageListener)
    }, streamEprivListener, streamReaderEprivListener, streamListener, lastMessageListener)
  }

  onMessage(streamId: string, listener: (data: { data: MessageEntity, key: string }[]) => void) {
    batch(cb =>
      this.gun
        .get(`messages${streamId}.`)
        .map(messageMap)
        .on(cb),
      listener);
  }

  getUUID() {
    return this.gun.opt()._.opt.uuid()
  }
}

export const messageMap = m => (m && typeof m === 'object' && m._ ? m : undefined);

const INTERVAL = 200;

const batch = (fn, ...listeners) => {
  fn(...listeners.map(listener => {
    let lastMessage;
    let queue = [];

    return (data, key) => {
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
    }
  }));
};

export const getMessageStreamId = (message: MessageEntity) => {
  const id = getId(message);
  return /(~.+)\.$/.exec(id)[1]
}

export const migrate = async (streamId) => new Promise<Credentials>(res => {
  let created;
  getStreams().gun.get(streamId).get('name').once((async streamName => {
    const cred = await getStreams().createStream({ streamName })
    res(cred);
    const base = {
      Gun: getStreams().Gun,
      gun: getStreams().gun,
      pub: cred.pub,
      priv: cred.priv,
      epriv: cred.readerEpriv,
    }
    getStreams().gun.get(streamId).get('lastMessage').once(async lastMessage => {
      if (lastMessage) {
        await put({ ...base, key: 'lastMessage', link: `${lastMessage._['#']}~${cred.pub}.` })
      }
    })
    getStreams().gun.get(streamId).get('messages').map(async (message: MessageEntity) => {
      if (message) {
        const uuid = getId(message);
        const messageId = `${uuid}~${cred.pub}.`
        await put({ ...base, sub: 'messages', key: messageId, link: messageId })
        for (const key of Object.keys(message)) {
          switch (key) {
            case 'text':
              await put({ ...base, sub: uuid, key: 'created', value: message._['>'].text })
              if (!created || message._['>'].text < created) {
                created = message._['>'].text;
                await put({ ...base, key: 'created', value: created })
              }
              await put({ ...base, sub: uuid, key, value: message[key] })
              break;
            case 'highlighted':
              await put({ ...base, sub: uuid, key, value: message[key] })
              break;
            case 'index':
              console.log('index', message[key])
              if (message[key]) {
                const index = JSON.parse(message[key]);
                await put({ ...base, sub: uuid, key, value: JSON.stringify(index.map(id => id ? `${id}~${cred.pub}.` : id)) })
              }
              break;
            case 'parent':
              if (message[key]) {
                await put({ ...base, sub: uuid, key, link: `${message[key]['#']}~${cred.pub}.` })
              }
              break;
          }
        }
      }
    })
  }))
})