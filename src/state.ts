type Primitive = string | number | boolean | null | undefined;

/**
 * A value that can be stored in the state: a primitive, a readonly object of `StateValue`s, or a readonly array of `StateValue`s.
 */
export type StateValue = Primitive | StateObject | StateArray;
type StateObject = { readonly [key in Key]?: StateValue };
type StateArray = readonly StateValue[];

/**
 * A supported key type for state paths.
 */
export type Key = string | number;

type ConcatPrefix<Prefix extends Key, Suffix extends Key> = Prefix extends ""
  ? Suffix
  : `${Prefix}.${Suffix}`;

// Determines if `T` is recursive (i.e., contains itself as a property) to prevent infinite path expansion.
// Note that this doesn't detect indirect recursion.
type IsRecursive<T> = T extends Primitive ? false : T extends T[keyof T] ? true : false;

// Converts `A | B | C` to `A & B & C`
type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: type magic
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/**
 * A mapping of all possible paths in `T` to their corresponding value types.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type Paths = PathMap<"", State>;
 * // Result:
 * // {
 * //   "foo": { bar: number; baz: string[] };
 * //   "foo.bar": number;
 * //   "foo.baz": string[];
 * //   "foo.baz.0": string;
 * //   "qux": boolean;
 * // }
 * ```
 */
export type PathMap<Prefix extends Key, T> = true extends IsRecursive<T>
  ? { "": T }
  : { [K in Prefix]: T } & _PathMap<Prefix, T>;
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

/**
 * A union of all possible paths in `T`.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type Paths = PathOf<State>;
 * // Result: "foo" | "foo.bar" | "foo.baz" | `foo.baz.${number}` | "qux"
 * ```
 */
export type PathOf<T> = keyof PathMap<"", T> & Key;

/**
 * The value type at path `P` in state type `T`.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type FooBarType = ValueOf<State, "foo.bar">; // Result: number
 * type FooBazType = ValueOf<State, "foo.baz">; // Result: string[]
 * type QuxType = ValueOf<State, "qux">;       // Result: boolean
 * ```
 */
export type ValueOf<T, P extends Key | undefined> = P extends keyof PathMap<"", T>
  ? PathMap<"", T>[P]
  : never;

/**
 * A state object with any keys and values, as a fallback type.
 */
export type AnyState = Partial<Record<Key, StateValue>>;

// Unique brand to identify Store objects. In practice we check for presence in implMap,
// but this symbol ensures type safety as well.
const brand = Symbol("Store");

/**
 * An opaque object that points to a state tree. These cannot be constructed directly; use {@link createStore} instead.
 * @template T  The `PathMap` type representing the shape of the state in the store
 */
// biome-ignore lint/correctness/noUnusedVariables: used for inference
export interface Store<T = AnyState> {
  /**
   * Brand to identify Store objects
   */
  readonly [brand]: true;

  /**
   * The prefix path for this store (empty string for the root store)
   */
  readonly prefix: Key;
}

// Holds the actual mutable state and listeners for a Store
interface StoreImpl {
  _state: StateValue;
  // biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
  readonly _listeners: Map<Key, Set<(value: any, path: any) => void>>;
}

// Maps Store objects to their implementations
const implMap = new WeakMap<Store, StoreImpl>();

// Safely indexes into a StateValue object or array
function index(obj: StateValue, key: string): StateValue | undefined {
  return obj && typeof obj === "object" ? obj[key as string & number] : undefined;
}

// Splits a path string into segments separated by dots, ignoring empty segments
function segments(path: Key): string[] {
  return String(path).match(/[^.]+/g) || [];
}

// Concatenates a prefix and key into a dot-separated path
function concatPath(prefix: Key, key: Key): Key {
  return prefix !== "" ? `${prefix}.${key}` : key;
}

function getImpl(store: Store): StoreImpl {
  const storeImpl = implMap.get(store);
  if (!storeImpl) {
    throw new Error("Invalid store");
  }
  return storeImpl;
}

/**
 * Creates a new state store with the given initial state.
 * @param initialState The initial state value
 * @returns A new Store object
 */
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

/**
 * Destroys a store, cleaning up its resources. Future operations on the store will throw errors.
 * Note that this does not affect any focused sub-stores created from this store.
 * @param store The Store object to destroy
 */
export function destroyStore(store: Store): void {
  implMap.delete(store);
}

/**
 * Checks if a value is a valid Store object.
 * @param value The value to check
 * @returns True if the value is a Store, false otherwise
 */
export function isStore<T>(value: unknown): value is Store<T> {
  return implMap.has(value as Store);
}

/**
 * Retrieves the value at the specified path in the store's state.
 * @param store The Store object
 * @param path The path to retrieve
 * @returns The value at the specified path
 */
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

/**
 * Registers a listener function that is called whenever the value at the specified path changes.
 * @param store The Store object
 * @param path The path to listen to
 * @param listener The listener function to call on changes
 * @returns A function to unregister the listener
 */
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

/**
 * Type that represents a sub-store focused on the state at the specified path prefix.
 */
export type Focus<T extends Record<Key, StateValue>, P extends keyof T & Key> = "" extends P
  ? T
  : { [K in keyof T as P extends K ? "" : K extends `${P}.${infer Rest}` ? Rest : never]: T[K] };

/**
 * Creates a sub-store that focuses on the state at the specified path prefix.
 * @param store The parent Store object
 * @param path The path prefix for the sub-store
 * @returns A new Store object representing the sub-store
 */
export function focus<T extends Record<Key, StateValue>, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
): Store<Focus<T, P>> {
  if (path === "") {
    return store as Store<Focus<T, P>>;
  }
  const impl = getImpl(store);
  const subStore = Object.freeze<Store<Focus<T, P>>>({
    [brand]: true,
    prefix: concatPath(store.prefix, path),
  });
  implMap.set(subStore, impl);
  return subStore;
}

// Tracks objects that are safe to merge without cloning
const isSafeObject = new WeakSet<StateObject | StateArray>();

type PatchStack = [
  current: StateValue,
  next: StateValue,
  path: Key,
  key: string,
  keys: string[] | null,
  changes: [string, StateValue][],
  merge: boolean,
][];

function patch(
  state: StateValue,
  selector: Key,
  patch: StateValue,
  notify: Map<Key, StateValue> | null,
  mergeInput: boolean,
): StateValue {
  // Setup the stack: add initial descent steps for each segment in the selector
  // We set `keys` to empty and `merge` to true, ensuring that the top-level change is always merged
  const stack: PatchStack = [[state, undefined, "", "", [], [], true]];
  for (const segment of segments(selector)) {
    const [current, _, path] = stack[stack.length - 1];
    stack.push([
      index(current, segment),
      undefined,
      concatPath(path, segment),
      segment,
      [],
      [],
      true,
    ]);
  }
  // Set the patch value at the bottom of the stack, allowing it to merge or replace as needed
  const lastStack = stack[stack.length - 1];
  lastStack[1] = patch;
  lastStack[4] = null;
  lastStack[6] = mergeInput;
  const recursionCheck = new WeakSet();
  while (true) {
    const [current, next, path, key, keys, changes, merge] = stack[stack.length - 1];
    let newValue: StateValue;
    if (keys) {
      // If `keys` is not null, we are iterating over the keys of `next`, or have finished iterating
      const nextKey = keys.pop();
      if (nextKey) {
        // More keys to process
        stack.push([
          index(current, nextKey),
          index(next, nextKey),
          concatPath(path, nextKey),
          nextKey,
          null,
          [],
          merge,
        ]);
        continue;
      }
      // Finished iterating over keys; check for changes
      if (changes.length > 0) {
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
      // If no changes, `nextValue` remains undefined
    } else if (current === next) {
      // No changes
    } else if (typeof next !== "object" || !next || (!merge && isSafeObject.has(next))) {
      // `next` is either a primitive, or a safe object that doesn't need merging
      newValue = next;
    } else {
      // We need to merge `current` and `next` by iterating over the keys of `next`
      if (recursionCheck.has(next)) {
        throw new Error(`Circular reference detected at path "${concatPath(path, key)}"`);
      }
      recursionCheck.add(next);
      const keys = Object.keys(next).reverse();
      if (Array.isArray(next)) {
        keys.push("length");
      }
      stack[stack.length - 1][4] = keys;
      continue;
    }
    // If we're here, we didn't modify the stack this iteration, so we can pop it
    recursionCheck.delete(next as object);
    stack.pop();
    // If the stack is empty, we're done
    if (stack.length === 0) {
      return newValue === undefined ? state : newValue;
    }
    // Otherwise, apply the change to the parent
    if (newValue !== undefined) {
      stack[stack.length - 1][5].push([key, newValue]);
      notify?.set(path, newValue);
    }
  }
}

// Notifies listeners of changes recorded in the `notify` map
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

/**
 * Sets the value at the specified path in the store's state.
 * @param store The Store object
 * @param path The path to set
 * @param newValue The new value to set at the specified path
 */
export function setState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
  newValue: T[P],
): void {
  const storeImpl = getImpl(store);
  const notify = new Map<Key, StateValue>();
  storeImpl._state = patch(storeImpl._state, path, newValue, notify, false);
  notifyChange(storeImpl, notify);
}

// Patch specification type for patchState. Equivalent to a 'deep partial' but does not affect arrays.
type PatchSpec<T> = T extends Primitive
  ? T
  : T extends readonly unknown[]
    ? { [_ in number]?: PatchSpec<T[number]> | null } | T
    : { [K in keyof T]?: PatchSpec<T[K]> | null };

/**
 * Patches the value at the specified path in the store's state by merging the provided patch object.
 * `null` values in the patch object will delete the corresponding keys in the state, while `undefined` values will leave them unchanged.
 * @param store The Store object
 * @param path The path to patch
 * @param patchValue The patch object to merge at the specified path
 */
export function patchState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
  patchValue: T[P] | PatchSpec<T[P]> | Partial<T[P]>,
): void {
  const storeImpl = getImpl(store);
  const notify = new Map<Key, StateValue>();
  storeImpl._state = patch(storeImpl._state, path, patchValue as T[P], notify, true);
  notifyChange(storeImpl, notify);
}

if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;

  test("get initial state from a new store", () => {
    const store = createStore({ a: 1, b: { c: 2 } });
    expect(getState(store, "a")).toBe(1);
    expect(getState(store, "b.c")).toBe(2);
  });

  test("error after destroy", () => {
    const store = createStore({ a: 1 });
    destroyStore(store);
    expect(() => getState(store, "a")).toThrow("Invalid store");
  });

  test("set state and get updated value", () => {
    const store = createStore({ a: 1, b: { c: 2 } });
    setState(store, "a", 10);
    setState(store, "b.c", 20);
    expect(getState(store, "a")).toBe(10);
    expect(getState(store, "b.c")).toBe(20);
  });

  test("replace object with missing keys", () => {
    const store = createStore({ a: 1, b: { c: 2, d: 3 } as { c: number; d?: number } });
    setState(store, "b", { c: 20 });
    expect(getState(store, "b.c")).toBe(20);
    expect(getState(store, "b.d")).toBeUndefined();
  });

  test("patch state with partial object", () => {
    const store = createStore({ a: 1, b: { c: 2, d: 3 } });
    patchState(store, "b", { c: 20 });
    expect(getState(store, "b.c")).toBe(20);
    expect(getState(store, "b.d")).toBe(3);
  });

  test("patch state with null to delete key", () => {
    const store = createStore({ a: 1, b: { c: 2, d: 3 } });
    patchState(store, "b", { d: null });
    expect(getState(store, "b.c")).toBe(2);
    expect(getState(store, "b.d")).toBeUndefined();
  });

  test("patch array indexes", () => {
    const store = createStore({ arr: [1, 2, 3] });
    patchState(store, "arr", { 1: 20 });
    expect(getState(store, "arr")).toEqual([1, 20, 3]);
  });

  test("listen to state changes", () => {
    const store = createStore({ a: [1, 2, 3] });
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsubscribe1 = listen(store, "a", listener1);
    const unsubscribe2 = listen(store, "a.1", listener2);
    setState(store, "a.1", 20);
    expect(listener1).toHaveBeenCalledWith([1, 20, 3], "a");
    expect(listener2).toHaveBeenCalledWith(20, "a.1");
    unsubscribe1();
    unsubscribe2();
    setState(store, "a.2", 30);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
}
