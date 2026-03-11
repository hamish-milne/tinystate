import {
  createContext as T,
  createElement as l,
  Fragment as f,
  useCallback as V,
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
  update as A
} from "./core.js";
function b(t) {
  const e = i(null);
  return e.current || (e.current = w(t)), e.current;
}
const m = T(null);
function F(t) {
  const { value: e, children: n } = t;
  return l(m.Provider, { value: b(e) }, n);
}
function M(t = "") {
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
function W(t, e = "") {
  const n = x(t, e), r = V(
    (o) => A(t, [e, o]),
    [t, e]
  );
  return [n, r];
}
function B(t) {
  const { store: e, children: n } = t, { current: r } = i([]), o = x(e, "length");
  for (; r.length < o; ) {
    const a = r.length, s = S(e, a);
    r.push(l(n, { itemStore: s, index: a }));
  }
  return r.length = o, l(f, null, ...r);
}
/* v8 ignore start -- @preserve */
if (0)
  var R;
export {
  B as List,
  F as StoreProvider,
  b as useCreateStore,
  M as useStore,
  W as useStoreState,
  x as useWatch
};
//# sourceMappingURL=react.js.map
