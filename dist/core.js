const V = /* @__PURE__ */ Symbol("atom"), m = /* @__PURE__ */ Symbol("Store"), {
  freeze: u,
  preventExtensions: H,
  entries: E,
  fromEntries: F,
  keys: R,
  assign: A
} = Object, { isArray: w, from: z } = Array, y = /* @__PURE__ */ new WeakMap();
function g(e, t) {
  return e && typeof e == "object" ? e[t] : void 0;
}
function K(e) {
  return String(e).match(/[^.]+/g) || [];
}
function $(e, t) {
  let s = e;
  for (const n of K(t))
    s = g(s, n);
  return s;
}
function b(e, t) {
  return e === "" ? t : t === "" ? e : `${e}.${t}`;
}
function x(e) {
  const t = y.get(e.root || e);
  if (!t)
    throw new Error("Invalid store");
  return t;
}
function q(e) {
  if (L(e))
    return e;
  if (typeof e == "function")
    return e();
  const t = u({
    [m]: u([!0, null]),
    root: null,
    prefix: ""
  }), s = H({
    r: j(null, "", e, null, null),
    n: /* @__PURE__ */ new Map(),
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
function B(e, t = "") {
  return $(x(e).r, b(e.prefix, t));
}
function C(e, t, s, n = !1) {
  const r = x(e), o = b(e.prefix, t);
  let a = r.n.get(o);
  return a || (a = /* @__PURE__ */ new Set(), r.n.set(o, a)), a.add(s), n && s(B(e, t), t), () => a.delete(s);
}
function D(e, t, s = !1) {
  const { o: n } = x(e);
  return n.set(t, s), () => n.delete(t);
}
function G(e, t) {
  return t === "" ? e : u({
    [m]: e[m],
    root: e.root || e,
    prefix: b(e.prefix, t)
  });
}
function J(e, t, s) {
  const n = q(void 0);
  return C(e, t, (r) => _(n, s(r)), !0), n;
}
function O(e, t, s) {
  const [n, r, o] = e[e.length - 1], a = g(n, t), i = g(r, t);
  e.push([
    a,
    typeof i == "function" ? i(a) : i,
    b(o, t),
    t,
    s,
    []
  ]);
}
function j(e, t, s, n, r) {
  const o = [[e, void 0, "", "", [], []]];
  for (const c of K(t))
    O(o, c, []);
  const a = o[o.length - 1];
  a[1] = typeof s == "function" ? s(a[0]) : s, a[4] = null;
  const i = /* @__PURE__ */ new WeakSet();
  for (; ; ) {
    const [c, l, d, W, P, v] = o[o.length - 1];
    let p;
    if (P) {
      const f = P.pop();
      if (f) {
        O(o, f, null);
        continue;
      }
      if (v.length > 0) {
        const k = c && typeof c == "object" ? E(c) : [];
        w(c) && k.push(["length", c.length]);
        const h = new Map(k);
        for (const [M, T] of v)
          T === null ? h.delete(M) : T !== void 0 && h.set(M, T);
        const S = F(h);
        p = u(typeof S.length == "number" ? A([], S) : S);
      }
    } else if (c !== l)
      if (typeof l != "object" || !l || I(l))
        p = l, typeof c == "object" && c && r && r.add(d);
      else {
        if (i.has(l))
          throw new Error(`Circular reference detected at path "${d}"`);
        i.add(l);
        const f = R(l).reverse();
        w(l) && f.push("length"), o[o.length - 1][4] = f;
        continue;
      }
    if (i.delete(l), o.pop(), p !== void 0)
      if (n?.set(d, p ?? void 0), o.length)
        o[o.length - 1][5].push([W, p]);
      else
        return p;
    if (!o.length)
      return e;
  }
}
function U(e) {
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
      e.r = j(e.r, o, a, t, s);
    }
    for (const [r, o] of t) {
      const a = e.n.get(r);
      if (a)
        for (const i of a)
          i(o, r);
      if (s.has(r)) {
        const i = `${r}.`;
        for (const [c, l] of e.n)
          if (!t.has(c) && typeof c == "string" && c.startsWith(i))
            for (const d of l)
              d(void 0, c);
      }
    }
    if (e.o.size > 0) {
      const r = u(
        z(t.entries()).map(([a, i]) => u([a, i ?? null]))
      ), o = u(
        r.filter(([, a]) => typeof a != "object" || a === null || I(a))
      );
      for (const [a, i] of e.o)
        a(i ? r : o);
    }
    e.t.splice(0, n);
  }
}
function X(e, ...t) {
  const s = x(e), n = s.t.length > 0;
  for (const [r, o] of t)
    s.t.push([b(e.prefix, r), o]);
  n || U(s);
}
function _(e, t) {
  const s = x(e), n = s.t.length > 0;
  s.t.push([e.prefix, t]), n || U(s);
}
function Y(e, t, s) {
  return _(e, t()), C(e, "", () => {
    s(B(e, ""));
  });
}
function Z(e) {
  return A(e, { [V]: !0 });
}
function I(e) {
  return typeof e == "object" && e !== null && e[V] === !0;
}
/* v8 ignore start -- @preserve */
export {
  J as computed,
  q as createStore,
  Q as destroyStore,
  G as focus,
  I as isAtom,
  L as isStore,
  C as listen,
  D as listenAll,
  _ as patch,
  B as peek,
  Z as setAtom,
  Y as sync,
  X as update
};
//# sourceMappingURL=core.js.map
