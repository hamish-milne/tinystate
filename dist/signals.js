import { signal as c } from "@preact/signals";
import { createContext as S, createElement as p } from "preact";
import { useContext as g, useEffect as d, useRef as f } from "preact/hooks";
import { listen as h, peek as P, update as m } from "./core.js";
import { useCreateStore as x } from "./preact.js";
function v(t) {
  const e = f();
  return d(() => () => {
    for (const r of e.current?.[1] || [])
      r();
  }), function(n) {
    e.current || (e.current = [/* @__PURE__ */ new Map(), []]);
    const [a, s] = e.current, u = a.get(n);
    if (u)
      return u;
    const o = c(P(t, n));
    return s.push(
      h(t, n, (i) => {
        o.value = i;
      })
    ), o.subscribe((i) => m(t, [n, i])), a.set(n, o), o;
  };
}
const l = S(null);
function T(t) {
  const { value: e, children: r } = t, n = x(e), a = v(n);
  return p(l.Provider, { value: a }, r);
}
function M(t = "") {
  const e = g(l);
  if (!e)
    throw new Error("useStoreSignal must be used within a SignalStoreProvider");
  return e(t);
}
/* v8 ignore start -- @preserve */
export {
  T as SignalStoreProvider,
  v as useCreateSignalStore,
  M as useStoreSignal
};
//# sourceMappingURL=signals.js.map
