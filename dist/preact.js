import {
  createContext as V,
  createElement as p,
  Fragment as T
} from "preact";
import { useCallback as f, useContext as h, useEffect as P, useRef as i, useState as y } from "preact/hooks";
import {
  createStore as w,
  focus as S,
  listen as C,
  peek as v,
  update as b
} from "./core.js";
function A(t) {
  const e = i(null);
  return e.current || (e.current = w(t)), e.current;
}
const m = V(null);
function W(t) {
  const { value: e, children: n } = t;
  return p(m.Provider, { value: A(e) }, n);
}
function B(t = "") {
  const e = h(m);
  if (!e)
    throw new Error("useStore() must be used within a StoreProvider");
  return S(e, t);
}
function x(t, e = "", n = (o) => o, r = []) {
  const [o, u] = y(() => {
    const s = v(t, e);
    return n(s, null);
  });
  return P(
    () => C(t, e, (s) => u((l) => n(s, l)), !0),
    [t, e, ...r]
  ), o;
}
function F(t, e = "") {
  const n = x(t, e), r = f(
    (o) => b(t, [e, o]),
    [t, e]
  );
  return [n, r];
}
function L(t) {
  const { store: e, children: n } = t, { current: r } = i([]), o = x(e, "length");
  for (; r.length < o; ) {
    const u = r.length, s = S(e, u);
    r.push(p(n, { itemStore: s, index: u }));
  }
  return r.length = o, T({ children: r });
}
/* v8 ignore start -- @preserve */
if (0)
  var N;
export {
  L as List,
  W as StoreProvider,
  A as useCreateStore,
  B as useStore,
  F as useStoreState,
  x as useWatch
};
//# sourceMappingURL=preact.js.map
