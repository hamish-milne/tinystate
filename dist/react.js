import {
  createContext as T,
  createElement as l,
  Fragment as V,
  useCallback as f,
  useContext as h,
  useEffect as P,
  useRef as i,
  useState as y
} from "react";
import {
  createStore as w,
  focus as S,
  listen as v,
  peek as C,
  update as b
} from "./core.js";
function A(t) {
  const e = i(null);
  return e.current || (e.current = w(t)), e.current;
}
const m = T(null);
function k(t) {
  const { value: e, children: n } = t;
  return l(m.Provider, { value: A(e) }, n);
}
function W(t = "") {
  const e = h(m);
  if (!e)
    throw new Error("useStore() must be used within a StoreProvider");
  return S(e, t);
}
function x(t, e = "", n = (o) => o, r = []) {
  const [o, a] = y(() => {
    const s = C(t, e);
    return n(s, null);
  });
  return P(
    () => v(t, e, (s) => a((d) => n(s, d)), !0),
    [t, e, ...r]
  ), o;
}
function B(t, e = "") {
  const n = x(t, e), r = f(
    (o) => b(t, [e, o]),
    [t, e]
  );
  return [n, r];
}
function R(t) {
  const { store: e, children: n } = t, { current: r } = i([]), o = x(e, "length");
  for (; r.length < o; ) {
    const a = r.length, s = S(e, a);
    r.push(l(n, { itemStore: s, index: a }));
  }
  return r.length = o, l(V, null, ...r);
}
/* v8 ignore start -- @preserve */
if (0)
  var F;
export {
  R as List,
  k as StoreProvider,
  A as useCreateStore,
  W as useStore,
  B as useStoreState,
  x as useWatch
};
//# sourceMappingURL=react.js.map
