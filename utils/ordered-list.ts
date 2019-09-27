/* OPERATIONS FOR A UNIVERSALLY ORDERED LIST */

export const moveBetween = (gun: Gun, current: GunEntity, previous: GunEntity & Ordered, next: GunEntity & Ordered) => {
  update(gun, current, 'index', JSON.stringify(getIndexBetween(getKey(current), previous, next)));
};

export const sort = <T extends GunEntity & Ordered>(entities: T[]) => entities.sort(compare);

/* UTILITY FUNCTIONS */

export type Gun = {
  get: (key: string) => Gun;
  put: (o: Object) => Gun;
  set: (o: Object) => Gun;
};

export type GunEntity = {
  _: {
    ['#']?: string;
    get?: string;
  };
};

export type Ordered = {
  index: string;
};

export type Primitive = string | boolean | number;

export const update = (gun: Gun, o: GunEntity, key: string, value: Primitive) => {
  gun.get(getKey(o)).put({ [key]: value });
};

export const getKey = (o: GunEntity) => o._['#'] || o._.get;

type IndexPart = string | undefined | null;

export const compare = (a: GunEntity & Ordered, b: GunEntity & Ordered) => {
  const indexA = getIndex(a);
  const indexB = getIndex(b);

  for (let i = 0; i < Math.max(indexA.length, indexB.length); i++) {
    const comparison = compareIndexPart(indexA[i], indexB[i]);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
};

const compareIndexPart = (a: IndexPart, b: IndexPart) => {
  if (a == b) {
    // using == on purpose
    return 0;
  }
  if (!a) {
    return -1;
  }
  if (!b) {
    return 1;
  }
  return a < b ? -1 : 1;
};

export const getIndexBetween = (currentKey: string, prev: GunEntity & Ordered, next: GunEntity & Ordered) => {
  // note how [] = MIN and undefined = MAX
  const prevIndex = prev ? getIndex(prev) : [];
  const nextIndex = next ? getIndex(next) : undefined;

  const index = [];
  if (nextIndex) {
    // make sure we are between prev and next
    while (compareIndexPart(prevIndex[index.length], nextIndex[index.length]) === 0) {
      index.push(prevIndex[index.length]);
    }
    // make sure we are before next
    if (compareIndexPart(nextIndex[index.length], currentKey) <= 0) {
      index.push(prevIndex[index.length]);
    }
  }
  // make sure we are before prev
  while (compareIndexPart(currentKey, prevIndex[index.length]) <= 0) {
    index.push(prevIndex[index.length]);
  }
  index.push(currentKey);
  return index;
};

export const getIndex = (entity: GunEntity & Ordered) => {
  if (entity.index) {
    return JSON.parse(entity.index);
  }

  return [getKey(entity)];
};
