import {
  type AnyMembers,
  type AnyMutations,
  createRoot,
  type Entry,
  InvalidMemberError,
  type MembersFlags,
  type Schema,
} from "./common";

export type ProxyPairs<T extends AnyMembers> = {
  [K in keyof T]: [K, ProxyOf<T[K]>];
}[keyof T];

export type EntryProxy<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> = (string extends keyof TMutations
  ? unknown
  : {
      [K in Exclude<keyof TMutations, keyof Entry>]: TMutations[K];
    }) &
  (string extends keyof TMembers
    ? unknown
    : {
        [K in Exclude<keyof TMembers, keyof Entry>]: ProxyOf<TMembers[K]>;
      }) &
  Entry<T, TParent, TMembers, TMutations> & {
    member<K extends keyof TMembers>(key: K): ProxyOf<TMembers[K]>;
    members(flags?: MembersFlags): IterableIterator<ProxyPairs<TMembers>>;
  };

export type ProxyOf<T extends Schema> = T extends Schema<
  infer V,
  infer TParent,
  infer TMembers,
  infer TMutations
>
  ? EntryProxy<V, TParent, TMembers, TMutations>
  : never;

const proxies = new WeakMap<object, ProxyOf<Schema>>();

const entryProxyHandler = Object.freeze<ProxyHandler<Entry>>({
  get(target, p) {
    if (typeof p === "symbol" || p in target) {
      return target[p as keyof Entry];
    } else if (p in target.mutations) {
      return target.mutations[p];
    } else {
      try {
        // biome-ignore lint/suspicious/noGlobalIsNan: we're deliberately coercing to number
        return target.member(isNaN(p as any) ? p : Number(p));
      } catch (e) {
        if (e instanceof InvalidMemberError) {
          return undefined;
        }
        throw e;
      }
    }
  },
});

export function createProxy<
  T,
  TParent,
  TMembers extends AnyMembers,
  TMutations extends AnyMutations,
>(entry: Entry<T, TParent, TMembers, TMutations>): EntryProxy<T, TParent, TMembers, TMutations> {
  let proxy = proxies.get(entry.oid);
  if (!proxy) {
    proxy = new Proxy(
      Object.freeze<Entry<T, TParent, TMembers, TMutations>>({
        // @ts-expect-error
        __proto__: entry,
        members(flags?: MembersFlags): IterableIterator<ProxyPairs<TMembers>> {
          const inner = super.members(flags);
          return {
            next() {
              const result = inner.next();
              if (result.done) {
                return result;
              }
              return {
                value: [result.value[0], createProxy(result.value[1])],
              };
            },
            [Symbol.iterator]() {
              return this;
            },
          };
        },
        member<K extends keyof TMembers>(key: K): ProxyOf<TMembers[K]> {
          return createProxy(super.member(key)) as ProxyOf<TMembers[K]>;
        },
      }),
      entryProxyHandler,
    ) as EntryProxy;
    proxies.set(entry.oid, proxy);
  }
  return proxy as EntryProxy<T, TParent, TMembers, TMutations>;
}

export function createRootProxy<T extends Schema>(schema: T): ProxyOf<T> {
  return createProxy(createRoot(schema)) as ProxyOf<T>;
}
