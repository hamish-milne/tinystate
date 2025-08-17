export type AnyMembers = { [_ in string]: Schema } & { [_ in number]: Schema };
export type AnyMutations = Record<string, (this: void, ...args: any[]) => void>;

export type EntryOf<T extends Schema> = T extends Schema<infer A, infer B, infer C, infer D>
  ? Entry<A, B, C, D>
  : never;

export type ValueOf<T extends Schema> = T extends Schema<infer V> ? V : never;

type MemberPairs<T extends AnyMembers> = {
  [K in keyof T]: [K, EntryOf<T[K]>];
}[keyof T];

export const VALUE_UNSET = Symbol("value unset");
export const VALUE_KEEP = Symbol("value keep");

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
  previous: T | typeof VALUE_UNSET,
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
    value: T | typeof VALUE_UNSET,
  ): T | typeof VALUE_KEEP;
  computeDefault(): T;
  change(
    entry: Entry<T, TParent, TMembers, TMutations>,
    value: T,
    prev: T | typeof VALUE_UNSET,
  ): T | typeof VALUE_KEEP;
  getMember<K extends keyof TMembers>(key: K): TMembers[K];
  getMember(key: keyof TMembers): TMembers[keyof TMembers];
  get kind(): Kind;
  mutations(entry: Entry<T, TParent, TMembers, TMutations>): TMutations;
  hasValue(entry: Entry<T, TParent, TMembers, TMutations>, value: T | typeof VALUE_UNSET): boolean;
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

export interface Entry<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> {
  get(): T;
  set(value: T): void;
  unset(): void;
  invalidate(): void;
  recompute(): void;
  notify(): void;
  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup;
  isEmpty(): boolean;
  hasValue(): boolean;
  members(): IterableIterator<MemberPairs<TMembers>, undefined>;
  member<K extends keyof TMembers>(key: K): EntryOf<TMembers[K]>;
  get mutations(): TMutations;
  get parent(): Entry<TParent>;
  get kind(): Kind;
  get default(): T;
}

const entryProxy: ProxyHandler<Entry> = {
  get(target, p, _receiver) {
    if (typeof p === "symbol" || p in target) {
      return target[p as keyof Entry];
    } else if (p in target.mutations) {
      return target.mutations[p];
    } else {
      // biome-ignore lint/suspicious/noGlobalIsNan: we're deliberately coercing to number
      return target.member(isNaN(p as any) ? p : Number(p));
    }
  },
};

export type ProxyOf<T> = T extends Schema<any, any, infer C, infer D>
  ? (string extends keyof D
      ? unknown
      : {
          [K in Exclude<keyof D, keyof Entry>]: D[K];
        }) &
      (string extends keyof C
        ? unknown
        : {
            [K in Exclude<keyof C, keyof Entry>]: ProxyOf<C[K]>;
          }) &
      EntryOf<T>
  : never;

class EntryImpl<
    T = any,
    TParent = any,
    TMembers extends AnyMembers = any,
    TMutations extends AnyMutations = any,
  >
  extends null
  implements Entry<T, TParent, TMembers, TMutations>
{
  private declare readonly _schema: Schema<T, TParent, TMembers, TMutations>;
  private declare readonly _listeners: Set<Listener<T, TParent, TMembers, TMutations>>;
  private declare readonly _parent: EntryImpl<TParent> | undefined;
  private declare readonly _members: Map<string, ReturnType<typeof Proxy.revocable>>;
  private declare readonly _manager: Manager;
  private declare _mutations: TMutations | undefined;
  private declare _value: T | typeof VALUE_UNSET;
  private declare _previous: T | typeof VALUE_UNSET;
  private declare _isComputing: boolean;
  private declare _default: T | typeof VALUE_UNSET;

  constructor(schema: Schema<T, TParent, TMembers, TMutations>, parent: EntryImpl | Manager) {
    // @ts-expect-error
    return {
      // @ts-expect-error
      __proto__: EntryImpl.prototype,
      _schema: schema,
      _listeners: new Set(),
      _parent: parent instanceof EntryImpl ? parent : undefined,
      _members: new Map(),
      _manager: parent instanceof Manager ? parent : parent._manager,
      _mutations: undefined,
      _value: VALUE_UNSET,
      _previous: VALUE_UNSET,
      _isComputing: false,
      _default: VALUE_UNSET,
    };
  }

  get parent() {
    if (!this._parent) {
      throw new NoParentError();
    }
    return this._parent;
  }

  get default(): T {
    if (this._default === VALUE_UNSET) {
      this._default = this._schema.computeDefault();
    }
    return this._default;
  }

  get(): T {
    if (this._value === VALUE_UNSET) {
      try {
        if (this._isComputing) {
          throw new Error("Recursive compute call detected");
        }
        this._isComputing = true;
        const newValue = this._schema.compute(this, this._value);
        if (newValue === VALUE_KEEP) {
          throw new Error("compute() returned VALUE_KEEP for entry without a value");
        }
        this._value = newValue;
      } finally {
        this._isComputing = false;
      }
    }
    return this._value;
  }

  get kind(): Kind {
    return this._schema.kind;
  }

  hasValue(): boolean {
    return this._schema.hasValue(this, this._value);
  }

  isEmpty(): boolean {
    return !(this._listeners.size || this._members.size || this.hasValue());
  }

  set(value: T): void {
    const newValue = this._schema.change(this, value, this._value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this._checkDelete();
    }
  }

  unset(): void {
    if (this.kind === KIND_WIDENING) {
      for (const [_key, member] of this.members()) {
        member.unset();
      }
    }
    this._schema.unset(this);
  }

  invalidate(): void {
    const { kind } = this._schema;
    if (kind === KIND_WIDENING) {
      this._value = VALUE_UNSET;
    } else {
      if (this._manager._scheduleRecompute(this)) {
        for (const [_, member] of this.members()) {
          member.invalidate();
        }
      }
    }
    if (kind !== KIND_NARROWING) {
      this._parent?.invalidate();
      if (this._manager._scheduleNotify(this)) {
        for (const [_, member] of this.members()) {
          if (member.kind === KIND_NARROWING) {
            member.invalidate();
          }
        }
      }
    }
  }

  private _checkDelete() {
    if (this.isEmpty()) {
      this._manager._scheduleDestroy(this);
    }
  }

  garbageCollect(): void {
    if (this._members) {
      for (const [key, { revoke, proxy: member }] of this._members.entries()) {
        if ((member as Entry).isEmpty()) {
          this._members.delete(String(key));
          revoke();
        }
      }
    }
    if (this.isEmpty()) {
      this._parent?.garbageCollect();
    }
  }

  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup {
    this._listeners.add(listener);
    return () => {
      if (this._listeners.delete(listener)) {
        this._checkDelete();
      }
    };
  }

  notify(): void {
    if (this._listeners) {
      const previous = this._previous;
      const value = this.get();
      this._previous = value;
      for (const listener of this._listeners) {
        listener(value, previous, this);
      }
    }
  }

  recompute(): void {
    const newValue = this._schema.compute(this, this._value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this._manager._scheduleNotify(this);
    }
  }

  members(): IterableIterator<MemberPairs<TMembers>, undefined> {
    const inner = this._members.entries();
    return {
      next() {
        const result = inner.next();
        if (result.done) {
          return result;
        }
        const [key, { proxy: value }] = result.value;
        return {
          value: [key, value] as MemberPairs<TMembers>,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  member<K extends keyof TMembers>(key: K): ProxyOf<TMembers[K]> {
    let member = this._members.get(String(key));
    if (!member) {
      const schemaMember = this._schema.getMember(key);
      member = Proxy.revocable(new EntryImpl(schemaMember, this), entryProxy);
      this._members.set(String(key), member);
    }
    return member.proxy as ProxyOf<TMembers[K]>;
  }

  get mutations(): TMutations {
    this._mutations ||= Object.freeze(this._schema.mutations(this));
    return this._mutations;
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
      [this._toRecompute, "recompute"],
      [this._toNotify, "notify"],
      [this._toDestroy, "garbageCollect"],
    ] as const) {
      const setCopy = Array.from(set);
      set.clear();
      for (const entry of setCopy) {
        try {
          entry[method]();
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
): ProxyOf<T> {
  return new Proxy(new EntryImpl(schema, new Manager(scheduler)), entryProxy) as ProxyOf<T>;
}

const NARROWING_PROTO = {
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
};

export function narrowing<T, TParent, TMembers extends AnyMembers>(
  schema: Pick<Schema<T, TParent, TMembers, Empty>, "compute" | "change" | "getMember">,
) {
  return { __proto__: NARROWING_PROTO, ...schema } as Schema<T, TParent, TMembers, Empty>;
}
