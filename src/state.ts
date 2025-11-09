type Primitive = string | number | boolean | null | undefined;

export type StateValue = Primitive | StateObject | StateArray;
type StateObject = { readonly [key in string]?: StateValue };
type StateArray = readonly StateValue[];

export type Key = string | number;

type ConcatPrefix<Prefix extends Key, Suffix extends Key> = Prefix extends ""
  ? Suffix
  : `${Prefix}.${Suffix}`;

type IsRecursive<T> = T extends Primitive ? false : T extends T[keyof T] ? true : false;

type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: type magic
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type _PathMap<Prefix extends Key, T> = T extends Primitive
  ? // biome-ignore lint/complexity/noBannedTypes: we need a type with no keys here
    {}
  : T extends readonly unknown[]
    ? PathMap<ConcatPrefix<Prefix, number>, T[number]>
    : UnionToIntersection<
        {
          [K in keyof T & Key]: PathMap<ConcatPrefix<Prefix, K>, T[K]>;
        }[keyof T & Key]
      >;
export type PathMap<Prefix extends Key, T> = true extends IsRecursive<T>
  ? { "": T }
  : { [K in Prefix]: T } & _PathMap<Prefix, T>;

export type PathOf<T> = keyof PathMap<"", T> & Key;

export type ValueOf<T, P extends Key | undefined> = P extends keyof PathMap<"", T>
  ? PathMap<"", T>[P]
  : never;

export type AnyState = Partial<Record<Key, StateValue>>;

const brand = Symbol("Store");

export interface Store<_T = AnyState> {
  readonly [brand]: true;
  readonly prefix: Key;
}

interface StoreImpl {
  _state: StateValue;
  // biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
  readonly _listeners: Map<Key, Set<(value: any, path: any) => void>>;
}

const implMap = new WeakMap<Store, StoreImpl>();

function index(obj: StateValue, key: string): StateValue | undefined {
  return obj && typeof obj === "object" ? obj[key as string & number] : undefined;
}

function segments(path: Key): string[] {
  return String(path).match(/[^.]+/g) || [];
}

function concatPrefix(prefix: Key, key: Key): Key {
  return prefix !== "" ? `${prefix}.${key}` : key;
}

function getImpl(store: Store): StoreImpl {
  const storeImpl = implMap.get(store);
  if (!storeImpl) {
    throw new Error("Invalid store");
  }
  return storeImpl;
}

export function createStore<T extends StateValue>(initialState: T): Store<PathMap<"", T>> {
  const store = Object.freeze<Store<T>>({
    [brand]: true,
    prefix: "",
  });
  const storeImpl = Object.preventExtensions<StoreImpl>({
    _state: patch(null, "", initialState, null, false),
    _listeners: new Map(),
  });
  implMap.set(store, storeImpl);
  return store;
}

export function isStore(value: unknown): value is Store {
  return implMap.has(value as Store);
}

export function getState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
): T[P] {
  let result: StateValue = getImpl(store)._state;
  for (const segment of segments(path)) {
    result = index(result, segment);
  }
  return result as T[P];
}

export function listen<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
  listener: (value: T[P], path: P) => void,
): () => void {
  const impl = getImpl(store);
  let listeners = impl._listeners.get(path);
  if (!listeners) {
    listeners = new Set();
    impl._listeners.set(path, listeners);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type SelectPrefix<T extends Record<Key, StateValue>, P extends keyof T & Key> = "" extends P
  ? T
  : { [K in keyof T as P extends K ? "" : K extends `${P}.${infer Rest}` ? Rest : never]: T[K] };

export function select<T extends Record<Key, StateValue>, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
): Store<SelectPrefix<T, P>> {
  if (path === "") {
    return store as Store<SelectPrefix<T, P>>;
  }
  const impl = getImpl(store);
  const subStore = Object.freeze<Store<SelectPrefix<T, P>>>({
    [brand]: true,
    prefix: concatPrefix(store.prefix, path),
  });
  implMap.set(subStore, impl);
  return subStore;
}

const isSafeObject = new WeakSet<StateObject | StateArray>();

type PatchStack = [
  current: StateValue,
  next: StateValue,
  prefix: Key,
  key: string,
  keys: string[] | null,
  changes: [string, StateValue][],
  merge: boolean,
][];

function descend(
  stack: PatchStack,
  prefix: Key,
  current: StateValue,
  next: StateValue,
  key: string,
  merge: boolean,
) {
  stack.push([
    index(current, key),
    index(next, key),
    concatPrefix(prefix, key),
    key,
    null,
    [],
    merge,
  ]);
}

function patch<T extends AnyState>(
  state: StateValue,
  selector: Key,
  patch: StateValue,
  notify: Map<keyof T, StateValue> | null,
  mergeInput: boolean,
): StateValue {
  const stack: PatchStack = [[state, undefined, "", "", null, [], true]];

  for (const segment of segments(selector)) {
    const [current, next, prefix] = stack[stack.length - 1];
    descend(stack, prefix, current, next, segment, true);
  }
  stack[stack.length - 1][1] = patch;
  stack[stack.length - 1][6] = mergeInput;
  const recursionCheck = new WeakSet();
  while (true) {
    const [current, next, prefix, key, keys, changes, merge] = stack[stack.length - 1];
    recursionCheck.delete(next as object);
    let newValue: StateValue;
    if (current === next) {
      // No changes
    } else if (typeof next !== "object" || !next || (!merge && isSafeObject.has(next))) {
      newValue = next;
    } else if (keys === null) {
      if (recursionCheck.has(next)) {
        throw new Error(`Circular reference detected at path "${concatPrefix(prefix, key)}"`);
      }
      stack.push([current, next, prefix, key, Object.keys(next).reverse(), [], merge]);
      continue;
    } else {
      const nextKey = keys.pop();
      if (nextKey) {
        descend(stack, prefix, current, next, nextKey, merge);
        continue;
      } else if (changes.length > 0) {
        let changeSet: Iterable<[string, StateValue]>;
        if (merge) {
          const oldEntries = current && typeof current === "object" ? Object.entries(current) : [];
          if (Array.isArray(current)) {
            oldEntries.push(["length", current.length]);
          }
          const changesMap = new Map(oldEntries);
          for (const [k, v] of changes) {
            if (v === null) {
              changesMap.delete(k);
            } else if (v !== undefined) {
              changesMap.set(k, v);
            }
          }
          changeSet = changesMap.entries();
        } else {
          changeSet = changes;
        }
        const newObj = Object.fromEntries(changeSet);
        newValue = Object.freeze(
          typeof newObj.length === "number" ? Object.assign([], newObj) : newObj,
        );
        isSafeObject.add(newValue);
      }
    }
    stack.pop();
    if (stack.length === 0) {
      return newValue === undefined ? state : (newValue as T);
    }
    if (newValue !== undefined) {
      stack[stack.length - 1][5].push([key, newValue]);
      notify?.set(concatPrefix(prefix, key) as keyof T, newValue);
    }
  }
}

function notifyChange(impl: StoreImpl, notify: Map<Key, StateValue>) {
  for (const [changedPath, value] of notify) {
    const listeners = impl._listeners.get(changedPath);
    if (listeners) {
      for (const listener of listeners) {
        listener(value, changedPath);
      }
    }
  }
}

export function setState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
  newValue: T[P],
): void {
  const storeImpl = getImpl(store);
  const notify = new Map<keyof T & Key, StateValue>();
  storeImpl._state = patch<T>(storeImpl._state, path, newValue, notify, false);
  notifyChange(storeImpl, notify);
}

type PatchSpec<T> = T extends Primitive | readonly unknown[]
  ? T
  : { [K in keyof T]?: PatchSpec<T[K]> };

export function patchState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
  patchValue: T[P] | PatchSpec<T[P]> | Partial<T[P]>,
): void {
  const storeImpl = getImpl(store);
  const notify = new Map<keyof T & Key, StateValue>();
  storeImpl._state = patch<T>(storeImpl._state, path, patchValue as T[P], notify, true);
  notifyChange(storeImpl, notify);
}
