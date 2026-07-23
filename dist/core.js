const w = /* @__PURE__ */ Symbol("atom"), g = /* @__PURE__ */ Symbol("Store"), {
  freeze: u,
  preventExtensions: E,
  entries: F,
  fromEntries: R,
  keys: q,
  assign: K
} = Object, { isArray: B, from: C } = Array, y = /* @__PURE__ */ new WeakMap();
function P(e, t) {
  return e && typeof e == "object" ? e[t] : void 0;
}
function O(e) {
  return String(e).match(/[^.]+/g) || [];
}
function z(e, t) {
  let s = e;
  for (const n of O(t))
    s = P(s, n);
  return s;
}
function x(e, t) {
  return e === "" ? t : t === "" ? e : `${e}.${t}`;
}
function f(e) {
  const t = y.get(e.root || e);
  if (!t)
    throw new Error("Invalid store");
  return t;
}
function $(e) {
  if (L(e))
    return e;
  if (typeof e == "function")
    return e();
  const t = u({
    [g]: u([!0, null]),
    root: null,
    prefix: ""
  }), s = E({
    n: v(null, "", e, null, null),
    r: /* @__PURE__ */ new Map(),
    o: /* @__PURE__ */ new Map(),
    t: []
  });
  return y.set(t, s), t;
}
function Q(e) {
  y.delete(e.root || e);
}
function L(e) {
  return y.has(e);
}
function j(e, t = "") {
  return z(f(e).n, x(e.prefix, t));
}
function U(e, t, s, n = !1) {
  const r = f(e), o = x(e.prefix, t);
  let a = r.r.get(o);
  return a || (a = /* @__PURE__ */ new Set(), r.r.set(o, a)), a.add(s), n && s(j(e, t), t), () => a.delete(s);
}
function D(e, t, s = !1) {
  const { o: n } = f(e);
  return n.set(t, s), () => n.delete(t);
}
function G(e) {
  const t = f(e), s = /* @__PURE__ */ new Map();
  return v(void 0, "", t.n, s, null), C(s.entries()).filter(([, n]) => h(n));
}
function J(e, t) {
  return t === "" ? e : u({
    [g]: e[g],
    root: e.root || e,
    prefix: x(e.prefix, t)
  });
}
function X(e, t, s) {
  const n = $(void 0);
  return U(e, t, (r) => W(n, s(r)), !0), n;
}
function _(e, t, s) {
  const [n, r, o] = e[e.length - 1], a = P(n, t), i = P(r, t);
  e.push([
    a,
    typeof i == "function" ? i(a) : i,
    x(o, t),
    t,
    s,
    []
  ]);
}
function v(e, t, s, n, r) {
  const o = [[e, void 0, "", "", [], []]];
  for (const c of O(t))
    _(o, c, []);
  const a = o[o.length - 1];
  a[1] = typeof s == "function" ? s(a[0]) : s, a[4] = null;
  const i = /* @__PURE__ */ new WeakSet();
  for (; ; ) {
    const [c, l, b, H, k, M] = o[o.length - 1];
    let p;
    if (k) {
      const d = k.pop();
      if (d) {
        _(o, d, null);
        continue;
      }
      if (M.length > 0) {
        const V = c && typeof c == "object" ? F(c) : [];
        B(c) && V.push(["length", c.length]);
        const S = new Map(V);
        for (const [A, m] of M)
          m === null ? S.delete(A) : m !== void 0 && S.set(A, m);
        const T = R(S);
        p = u(typeof T.length == "number" ? K([], T) : T);
      }
    } else if (c !== l)
      if (h(l))
        p = l, typeof c == "object" && c && r && r.add(b);
      else {
        if (i.has(l))
          throw new Error(`Circular reference detected at path "${b}"`);
        const d = q(l).reverse();
        if (B(l) && d.push("length"), d.length === 0 && h(c))
          p = u({});
        else {
          i.add(l), o[o.length - 1][4] = d;
          continue;
        }
      }
    if (i.delete(l), o.pop(), p !== void 0)
      if (n?.set(b, p ?? void 0), o.length)
        o[o.length - 1][5].push([H, p]);
      else
        return p;
    if (!o.length)
      return e;
  }
}
function I(e) {
  try {
    N(e);
  } catch (t) {
    throw e.t.length = 0, t;
  }
}
function N(e) {
  for (; e.t.length > 0; ) {
    const t = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), n = e.t.length;
    for (let r = 0; r < n; r++) {
      const [o, a] = e.t[r];
      e.n = v(e.n, o, a, t, s);
    }
    for (const [r, o] of t) {
      const a = e.r.get(r);
      if (a)
        for (const i of a)
          i(o, r);
      if (s.has(r)) {
        const i = `${r}.`;
        for (const [c, l] of e.r)
          if (!t.has(c) && typeof c == "string" && c.startsWith(i))
            for (const b of l)
              b(void 0, c);
      }
    }
    if (e.o.size > 0) {
      const r = u(
        C(t.entries()).map(([a, i]) => u([a, i ?? null]))
      ), o = u(r.filter(([, a]) => h(a)));
      for (const [a, i] of e.o)
        a(i ? r : o);
    }
    e.t.splice(0, n);
  }
}
function Y(e, ...t) {
  const s = f(e), n = s.t.length > 0;
  for (const [r, o] of t)
    s.t.push([x(e.prefix, r), o]);
  n || I(s);
}
function W(e, t) {
  const s = f(e), n = s.t.length > 0;
  s.t.push([e.prefix, t]), n || I(s);
}
function Z(e, t, s) {
  return W(e, t()), U(e, "", () => {
    s(j(e, ""));
  });
}
function ee(e) {
  return K(e, { [w]: !0 });
}
function h(e) {
  return typeof e != "object" || e === null || e[w] === !0;
}
/* v8 ignore start -- @preserve */
export {
  X as computed,
  $ as createStore,
  Q as destroyStore,
  J as focus,
  G as getPrimitiveEntries,
  h as isAtomic,
  L as isStore,
  U as listen,
  D as listenAll,
  W as patch,
  j as peek,
  ee as setAtom,
  Z as sync,
  Y as update
};
//# sourceMappingURL=core.js.map
