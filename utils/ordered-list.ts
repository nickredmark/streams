/* OPERATIONS FOR A UNIVERSALLY ORDERED LIST */

export const moveBetween = (gun: Gun, current: GunEntity, previous: GunEntity & Ordered, next: GunEntity & Ordered) => {
  update(gun, current, 'index', JSON.stringify(getIndexBetween(current, previous, next)));
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
    ['#']: string;
  };
};

export type Ordered = {
  index: string;
};

export const update = (gun: Gun, o: GunEntity, key: string, value: string) => {
  gun.get(getKey(o)).put({ [key]: value });
};

export const getKey = (o: GunEntity) => o._['#'];

export const isBetween = (x: string | undefined, a: string | undefined, b: string | undefined) =>
  (a === undefined || a < x) && (b === undefined || x < b);

export const compare = (a: GunEntity & Ordered, b: GunEntity & Ordered) => {
  const indexA = getIndex(a);
  const indexB = getIndex(b);

  for (let i = 0; i < Math.max(indexA.length, indexB.length); i++) {
    if (indexA[i] !== indexB[i]) {
      return indexA[i] === undefined || indexA[i] < indexB[i] ? -1 : 1;
    }
  }

  return 0;
};

export const getIndexBetween = (current: GunEntity, previous: GunEntity & Ordered, next: GunEntity & Ordered) => {
  const previousIndex = previous ? getIndex(previous) : [];
  const nextIndex = next ? getIndex(next) : [];
  const index = [];
  const currentKey = getKey(current);
  let i = 0;
  while (!isBetween(currentKey, previousIndex[i], nextIndex[i])) {
    index.push(previousIndex[i++]);
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
