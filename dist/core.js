const w = /* @__PURE__ */ Symbol("atom"), m = /* @__PURE__ */ Symbol("Store"), {
  freeze: u,
  preventExtensions: H,
  entries: E,
  fromEntries: F,
  keys: R,
  assign: K
} = Object, { isArray: B, from: q } = Array, y = /* @__PURE__ */ new WeakMap();
function g(e, t) {
  return e && typeof e == "object" ? e[t] : void 0;
}
function C(e) {
  return String(e).match(/[^.]+/g) || [];
}
function z(e, t) {
  let s = e;
  for (const n of C(t))
    s = g(s, n);
  return s;
}
function x(e, t) {
  return e === "" ? t : t === "" ? e : `${e}.${t}`;
}
function d(e) {
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
    [m]: u([!0, null]),
    root: null,
    prefix: ""
  }), s = H({
    n: P(null, "", e, null, null),
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
  return z(d(e).n, x(e.prefix, t));
}
function O(e, t, s, n = !1) {
  const r = d(e), o = x(e.prefix, t);
  let a = r.r.get(o);
  return a || (a = /* @__PURE__ */ new Set(), r.r.set(o, a)), a.add(s), n && s(j(e, t), t), () => a.delete(s);
}
function D(e, t, s = !1) {
  const { o: n } = d(e);
  return n.set(t, s), () => n.delete(t);
}
function G(e) {
  const t = d(e), s = /* @__PURE__ */ new Map();
  return P(void 0, "", t.n, s, null), Array.from(s.entries()).filter(
    ([n, r]) => typeof r != "object" || r === null || v(r)
  );
}
function J(e, t) {
  return t === "" ? e : u({
    [m]: e[m],
    root: e.root || e,
    prefix: x(e.prefix, t)
  });
}
function X(e, t, s) {
  const n = $(void 0);
  return O(e, t, (r) => I(n, s(r)), !0), n;
}
function U(e, t, s) {
  const [n, r, o] = e[e.length - 1], a = g(n, t), i = g(r, t);
  e.push([
    a,
    typeof i == "function" ? i(a) : i,
    x(o, t),
    t,
    s,
    []
  ]);
}
function P(e, t, s, n, r) {
  const o = [[e, void 0, "", "", [], []]];
  for (const c of C(t))
    U(o, c, []);
  const a = o[o.length - 1];
  a[1] = typeof s == "function" ? s(a[0]) : s, a[4] = null;
  const i = /* @__PURE__ */ new WeakSet();
  for (; ; ) {
    const [c, l, f, W, k, M] = o[o.length - 1];
    let p;
    if (k) {
      const b = k.pop();
      if (b) {
        U(o, b, null);
        continue;
      }
      if (M.length > 0) {
        const V = c && typeof c == "object" ? E(c) : [];
        B(c) && V.push(["length", c.length]);
        const h = new Map(V);
        for (const [A, T] of M)
          T === null ? h.delete(A) : T !== void 0 && h.set(A, T);
        const S = F(h);
        p = u(typeof S.length == "number" ? K([], S) : S);
      }
    } else if (c !== l)
      if (typeof l != "object" || !l || v(l))
        p = l, typeof c == "object" && c && r && r.add(f);
      else {
        if (i.has(l))
          throw new Error(`Circular reference detected at path "${f}"`);
        i.add(l);
        const b = R(l).reverse();
        B(l) && b.push("length"), o[o.length - 1][4] = b;
        continue;
      }
    if (i.delete(l), o.pop(), p !== void 0)
      if (n?.set(f, p ?? void 0), o.length)
        o[o.length - 1][5].push([W, p]);
      else
        return p;
    if (!o.length)
      return e;
  }
}
function _(e) {
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
      e.n = P(e.n, o, a, t, s);
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
            for (const f of l)
              f(void 0, c);
      }
    }
    if (e.o.size > 0) {
      const r = u(
        q(t.entries()).map(([a, i]) => u([a, i ?? null]))
      ), o = u(
        r.filter(([, a]) => typeof a != "object" || a === null || v(a))
      );
      for (const [a, i] of e.o)
        a(i ? r : o);
    }
    e.t.splice(0, n);
  }
}
function Y(e, ...t) {
  const s = d(e), n = s.t.length > 0;
  for (const [r, o] of t)
    s.t.push([x(e.prefix, r), o]);
  n || _(s);
}
function I(e, t) {
  const s = d(e), n = s.t.length > 0;
  s.t.push([e.prefix, t]), n || _(s);
}
function Z(e, t, s) {
  return I(e, t()), O(e, "", () => {
    s(j(e, ""));
  });
}
function ee(e) {
  return K(e, { [w]: !0 });
}
function v(e) {
  return typeof e == "object" && e !== null && e[w] === !0;
}
/* v8 ignore start -- @preserve */
export {
  X as computed,
  $ as createStore,
  Q as destroyStore,
  J as focus,
  G as getPrimitiveEntries,
  v as isAtom,
  L as isStore,
  O as listen,
  D as listenAll,
  I as patch,
  j as peek,
  ee as setAtom,
  Z as sync,
  Y as update
};
//# sourceMappingURL=core.js.map
