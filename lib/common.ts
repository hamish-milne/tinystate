export type AnyMembers = { [_ in string]: Schema } & { [_ in number]: Schema };
export type AnyMutations = Record<string, (this: void, ...args: any[]) => void>;

export type EntryOf<T extends Schema> = T extends Schema<infer A, infer B, infer C, infer D>
  ? Entry<A, B, C, D>
  : never;

export type ValueOf<T extends Schema> = T extends Schema<infer V> ? V : never;

export type MemberPairs<T extends AnyMembers> = {
  [K in keyof T]: [K, EntryOf<T[K]>];
}[keyof T];

export const UNCHANGED = Symbol("unchanged");

export class NotImplementedError extends Error {
  constructor() {
    super("This method is not implemented");
  }
}

export class ReadonlyError extends Error {
  constructor() {
    super("This object is read-only and cannot be modified");
  }
}

export class NoParentError extends Error {
  constructor() {
    super("This entry has no parent, so it cannot be used in this context");
  }
}

export class InvalidMemberError extends Error {
  constructor() {
    super("The key provided is not a valid member of this schema");
  }
}

export type Empty = { [k: string]: never };

export const KIND_SCALAR = Symbol("scalar");
export const KIND_NARROWING = Symbol("narrowing");
export const KIND_WIDENING = Symbol("widening");
export type Kind = typeof KIND_SCALAR | typeof KIND_NARROWING | typeof KIND_WIDENING;

export type Listener<T, TParent, TMembers extends AnyMembers, TMutations extends AnyMutations> = (
  this: void,
  value: T,
  previous: T | typeof UNCHANGED,
  entry: Entry<T, TParent, TMembers, TMutations>,
) => void;
export type Cleanup = (this: void) => void;

export interface Schema<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> {
  readonly __proto__?: unknown; // To allow setting the prototype in initializers
  compute(
    entry: Entry<T, TParent, TMembers, TMutations>,
    value: T | typeof UNCHANGED,
    flags: MembersFlags,
  ): T | typeof UNCHANGED;
  computeDefault(): T;
  change(
    entry: Entry<T, TParent, TMembers, TMutations>,
    value: T,
    prev: T | typeof UNCHANGED,
  ): T | typeof UNCHANGED;
  getMember<K extends keyof TMembers>(key: K): TMembers[K];
  getMember(key: keyof TMembers): TMembers[keyof TMembers];
  isMemberPermanent(key: keyof TMembers): boolean;
  get kind(): Kind;
  mutations(entry: Entry<T, TParent, TMembers, TMutations>): TMutations;
  hasValue(entry: Entry<T, TParent, TMembers, TMutations>, value: T | typeof UNCHANGED): boolean;
  unset(entry: Entry<T, TParent, TMembers, TMutations>): void;
}

export function isSchema<T = any>(value: unknown): value is Schema<T> {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }
  switch (value.kind) {
    case KIND_SCALAR:
    case KIND_NARROWING:
    case KIND_WIDENING:
      return true;
    default:
      return false;
  }
}

export const MEMBERS_DEFAULT = 0;
export const MEMBERS_DEPENDANTS = 1;
export const MEMBERS_UNCHANGED = 2;
export const MEMBERS_ALL = 3;
export type MembersFlags =
  | typeof MEMBERS_DEFAULT
  | typeof MEMBERS_DEPENDANTS
  | typeof MEMBERS_UNCHANGED
  | typeof MEMBERS_ALL;

export interface Entry<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> {
  get(flags?: MembersFlags): T;
  set(value: T): void;
  unset(): void;
  invalidate(): void;
  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup;
  hasValue(): boolean;
  members(flags?: MembersFlags): IterableIterator<MemberPairs<TMembers>>;
  member<K extends keyof TMembers>(key: K): EntryOf<TMembers[K]>;
  get mutations(): TMutations;
  get parent(): Entry<TParent>;
  get kind(): Kind;
  get default(): T;
  get oid(): object; // Unique identifier for the entry
}

const entryImpl = new WeakMap<object, EntryImpl>();

class EntryImpl<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> extends null {
  private declare readonly _schema: Schema<T, TParent, TMembers, TMutations>;
  private declare readonly _listeners: Set<Listener<T, TParent, TMembers, TMutations>>;
  private declare readonly _parent: EntryImpl<TParent> | undefined;
  private declare readonly _members: Map<string, EntryImpl>;
  private declare readonly _manager: Manager;
  declare readonly _oid: object; // Unique identifier for the entry
  declare readonly _wrapper: EntryWrapper<T, TParent, TMembers, TMutations>;
  declare readonly _depth: number;
  private declare _mutations: TMutations | undefined;
  private declare _value: T | typeof UNCHANGED;
  private declare _previous: T | typeof UNCHANGED;
  private declare _isComputing: boolean;
  private declare _default: T | typeof UNCHANGED;

  constructor(
    schema: Schema<T, TParent, TMembers, TMutations>,
    manager: Manager,
    parent?: EntryImpl,
  ) {
    const oid = Object.freeze({ __proto__: null });
    const obj: EntryImpl<T, TParent, TMembers, TMutations> = {
      // @ts-expect-error
      __proto__: EntryImpl.prototype,
      _schema: schema,
      _listeners: new Set(),
      _parent: parent,
      _members: new Map(),
      _manager: manager,
      _mutations: undefined,
      _value: UNCHANGED,
      _previous: UNCHANGED,
      _isComputing: false,
      _default: UNCHANGED,
      _oid: oid,
      _wrapper: new EntryWrapper(oid),
      _depth: parent ? parent._depth + 1 : 0,
    };
    entryImpl.set(oid, obj);
    return obj;
  }

  _getParent() {
    if (!this._parent) {
      throw new NoParentError();
    }
    return this._parent._wrapper;
  }

  _getDefault(): T {
    if (this._default === UNCHANGED) {
      this._default = this._schema.computeDefault();
    }
    return this._default;
  }

  _get(flags?: MembersFlags): T {
    if (this._value === UNCHANGED) {
      try {
        if (this._isComputing) {
          throw new Error("Recursive compute call detected");
        }
        this._isComputing = true;
        const newValue = this._schema.compute(this._wrapper, this._value, flags ?? MEMBERS_DEFAULT);
        if (newValue === UNCHANGED) {
          throw new Error("compute() returned UNCHANGED for entry without a value");
        }
        this._value = newValue;
      } finally {
        this._isComputing = false;
      }
    }
    return this._value;
  }

  _getKind(): Kind {
    return this._schema.kind;
  }

  _hasValue(): boolean {
    return this._schema.hasValue(this._wrapper, this._value);
  }

  _isEmpty(): boolean {
    return !(this._listeners.size || this._members.size || this._hasValue());
  }

  _set(value: T): void {
    const newValue = this._schema.change(this._wrapper, value, this._value);
    if (newValue !== UNCHANGED) {
      this._value = newValue;
      this._invalidate();
      this._checkDelete();
    }
  }

  _unset(): void {
    this._schema.unset(this._wrapper);
  }

  _invalidate(): void {
    const { kind } = this._schema;
    if (kind === KIND_WIDENING) {
      this._value = UNCHANGED;
    } else {
      if (this._manager._scheduleRecompute(this)) {
        for (const [_, member] of this._members) {
          member._invalidate();
        }
      }
    }
    if (kind !== KIND_NARROWING) {
      this._parent?._invalidate();
      if (this._manager._scheduleNotify(this)) {
        for (const [_, member] of this._members) {
          if (member._getKind() === KIND_NARROWING) {
            member._invalidate();
          }
        }
      }
    }
  }

  private _checkDelete() {
    if (this._isEmpty()) {
      this._manager._scheduleDestroy(this);
    }
  }

  _garbageCollect(): void {
    for (const [key, member] of this._members) {
      if (!this._schema.isMemberPermanent(key) && member._isEmpty()) {
        this._members.delete(String(key));
        entryImpl.delete(member._oid);
      }
    }
    if (this._isEmpty()) {
      this._parent?._garbageCollect();
    }
  }

  _subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup {
    this._listeners.add(listener);
    return () => {
      if (this._listeners.delete(listener)) {
        this._checkDelete();
      }
    };
  }

  _notify(): void {
    const previous = this._previous;
    const value = this._get();
    this._previous = value;
    for (const listener of this._listeners) {
      listener(value, previous, this._wrapper);
    }
  }

  _recompute(): void {
    const newValue = this._schema.compute(this._wrapper, this._value, MEMBERS_DEFAULT);
    if (newValue !== UNCHANGED) {
      this._value = newValue;
      this._manager._scheduleNotify(this);
    }
  }

  _getMembers(flags: MembersFlags = MEMBERS_DEFAULT): IterableIterator<MemberPairs<TMembers>> {
    const inner = this._members.entries();
    return {
      next() {
        let result = inner.next();
        if ((flags & MEMBERS_DEPENDANTS) === 0) {
          while (!result.done && result.value[1]._getKind() === KIND_NARROWING) {
            result = inner.next();
          }
        }
        if (result.done) {
          return result;
        }
        const [key, { _wrapper: value }] = result.value;
        return {
          value: [key, value] as MemberPairs<TMembers>,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  _member<K extends keyof TMembers>(key: K): EntryOf<TMembers[K]> {
    let member = this._members.get(String(key));
    if (!member) {
      const schemaMember = this._schema.getMember(key);
      member = new EntryImpl(schemaMember, this._manager, this);
      this._members.set(String(key), member);
    }
    return member._wrapper as Entry as EntryOf<TMembers[K]>;
  }

  _getMutations(): TMutations {
    this._mutations ||= Object.freeze(this._schema.mutations(this._wrapper));
    return this._mutations;
  }
}

function sortEntries(a: EntryImpl, b: EntryImpl): number {
  return a._depth - b._depth;
}

function getEntryImpl<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
>(
  entry: EntryWrapper<T, TParent, TMembers, TMutations>,
): EntryImpl<T, TParent, TMembers, TMutations> {
  const impl = entryImpl.get(entry.oid);
  if (!impl) {
    throw new Error("Entry is not initialized or has been destroyed");
  }
  return impl;
}

class EntryWrapper<
    T = any,
    TParent = any,
    TMembers extends AnyMembers = any,
    TMutations extends AnyMutations = any,
  >
  extends null
  implements Entry<T, TParent, TMembers, TMutations>
{
  declare readonly oid: object; // Unique identifier for the entry

  constructor(oid: object) {
    // @ts-expect-error
    return Object.freeze({
      __proto__: EntryWrapper.prototype,
      oid,
    });
  }

  get(flags?: MembersFlags): T {
    return getEntryImpl(this)._get(flags);
  }

  set(value: T): void {
    getEntryImpl(this)._set(value);
  }

  unset(): void {
    getEntryImpl(this)._unset();
  }

  invalidate(): void {
    getEntryImpl(this)._invalidate();
  }

  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup {
    return getEntryImpl(this)._subscribe(listener);
  }

  hasValue(): boolean {
    return getEntryImpl(this)._hasValue();
  }

  members(flags?: MembersFlags): IterableIterator<MemberPairs<TMembers>> {
    return getEntryImpl(this)._getMembers(flags);
  }

  member<K extends keyof TMembers>(key: K): EntryOf<TMembers[K]> {
    return getEntryImpl(this)._member(key);
  }

  get mutations(): TMutations {
    return getEntryImpl(this)._getMutations();
  }

  get parent(): Entry<TParent> {
    return getEntryImpl(this)._getParent();
  }

  get kind(): Kind {
    return getEntryImpl(this)._getKind();
  }

  get default(): T {
    return getEntryImpl(this)._getDefault();
  }
}

export function isEntry(value: unknown): value is Entry {
  return value instanceof EntryImpl;
}

type Scheduler = (callback: () => void) => number | undefined;

class Manager extends null {
  private declare readonly _updateIterationMax: number; // Maximum iterations to prevent infinite loops
  private declare readonly _scheduler: Scheduler;
  private declare readonly _toNotify: Set<EntryImpl>;
  private declare readonly _toRecompute: Set<EntryImpl>;
  private declare readonly _toDestroy: Set<EntryImpl>;
  private declare _timeoutId: number | undefined;
  private declare _updateIteration: number;
  private declare _update: (() => void) | undefined;

  constructor(scheduler: Scheduler) {
    // @ts-expect-error
    return {
      // @ts-expect-error
      __proto__: Manager.prototype,
      _updateIterationMax: 3,
      _scheduler: scheduler,
      _toNotify: new Set(),
      _toRecompute: new Set(),
      _toDestroy: new Set(),
      _timeoutId: undefined,
      _updateIteration: 0,
      _update: undefined,
    };
  }

  private _scheduleUpdate() {
    if (this._timeoutId === undefined) {
      this._updateIteration++;
      if (this._updateIteration > this._updateIterationMax) {
        throw new Error("Too many iterations in state manager timeout, possible infinite loop");
      }
      this._update ||= this._doUpdate.bind(this);
      this._timeoutId = this._scheduler(this._update);
    }
  }

  private _doUpdate() {
    this._timeoutId = undefined;

    for (const [set, method] of [
      [this._toRecompute, EntryImpl.prototype._recompute],
      [this._toNotify, EntryImpl.prototype._notify],
      [this._toDestroy, EntryImpl.prototype._garbageCollect],
    ] as const) {
      const setCopy = Array.from(set);
      set.clear();
      setCopy.sort(sortEntries);
      for (const entry of setCopy) {
        try {
          method.call(entry);
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Only reset the iteration count if another update was not scheduled
    if (this._timeoutId === undefined) {
      this._updateIteration = 0;
    }
  }

  private _schedule(entry: EntryImpl, set: Set<EntryImpl>): boolean {
    if (set.has(entry)) {
      return false; // Already scheduled
    }
    set.add(entry);
    this._scheduleUpdate();
    return true;
  }

  _scheduleNotify(entry: EntryImpl): boolean {
    return this._schedule(entry, this._toNotify);
  }
  _scheduleRecompute(entry: EntryImpl): boolean {
    return this._schedule(entry, this._toRecompute);
  }
  _scheduleDestroy(entry: EntryImpl): void {
    this._schedule(entry, this._toDestroy);
  }
}

export function createRoot<T extends Schema>(
  schema: T,
  scheduler: Scheduler = (u) => window.setTimeout(u, 0),
) {
  return new EntryImpl(schema, new Manager(scheduler))._wrapper as EntryOf<T>;
}

const NARROWING_PROTO: Omit<Schema, "compute" | "change"> = {
  computeDefault() {
    throw new NotImplementedError();
  },
  get kind(): Kind {
    return KIND_NARROWING;
  },
  mutations() {
    return {}; // Computed values do not support mutations
  },
  hasValue() {
    return false; // Computed values never store state
  },
  unset() {
    // Computed values do not support unset, as they are derived from their parent
  },
  getMember() {
    throw new InvalidMemberError();
  },
  isMemberPermanent() {
    throw new InvalidMemberError();
  },
};

export function narrowing<T, TParent, TMembers extends AnyMembers>(
  schema: Pick<Schema<T, TParent, TMembers, Empty>, "compute" | "change"> &
    Partial<Schema<T, TParent, TMembers, Empty>>,
) {
  return { __proto__: NARROWING_PROTO, ...schema } as Schema<T, TParent, TMembers, Empty>;
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot } = await import("./");
  const { map, scalar } = await import("./");
  vi.useFakeTimers();

  test("garbageCollect removes unset members", () => {
    const schema = map(scalar(0));
    const root = createRoot(schema);
    const entry1 = root.member("a");
    entry1.set(1);
    vi.runAllTimers();
    expect(root.member("a")).toBe(entry1);
    entry1.unset();
    vi.runAllTimers();
    expect(root.member("a") === entry1).toBe(false);
    expect(() => entry1.get()).toThrow(Error);
  });
}
