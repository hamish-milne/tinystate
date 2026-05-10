const V = /* @__PURE__ */ Symbol("atom"), m = /* @__PURE__ */ Symbol("Store"), {
  freeze: u,
  preventExtensions: R,
  entries: F,
  fromEntries: z,
  keys: $,
  assign: w
} = Object, { isArray: A, from: K } = Array, b = /* @__PURE__ */ new WeakMap();
function g(e, n) {
  return e && typeof e == "object" ? e[n] : void 0;
}
function B(e) {
  return String(e).match(/[^.]+/g) || [];
}
function q(e, n) {
  let s = e;
  for (const t of B(n))
    s = g(s, t);
  return s;
}
function f(e, n) {
  return e === "" ? n : n === "" ? e : `${e}.${n}`;
}
function x(e) {
  const n = b.get(e.root || e);
  if (!n)
    throw new Error("Invalid store");
  return n;
}
function L(e) {
  if (N(e))
    return e;
  if (typeof e == "function")
    return e();
  const n = u({
    [m]: u([!0, null]),
    root: null,
    prefix: ""
  }), s = R({
    n: U(null, "", e, null, null),
    t: /* @__PURE__ */ new Map(),
    r: /* @__PURE__ */ new Map()
  });
  return b.set(n, s), n;
}
function D(e) {
  b.delete(e.root || e);
}
function N(e) {
  return b.has(e);
}
function O(e, n = "") {
  return q(x(e).n, f(e.prefix, n));
}
function j(e, n, s, t = !1) {
  const o = x(e), r = f(e.prefix, n);
  let a = o.t.get(r);
  return a || (a = /* @__PURE__ */ new Set(), o.t.set(r, a)), a.add(s), t && s(O(e, n), n), () => a.delete(s);
}
function G(e, n, s = !1) {
  const { r: t } = x(e);
  return t.set(n, s), () => t.delete(n);
}
function J(e, n) {
  return n === "" ? e : u({
    [m]: e[m],
    root: e.root || e,
    prefix: f(e.prefix, n)
  });
}
function Q(e, n, s) {
  const t = L(void 0);
  return j(e, n, (o) => W(t, s(o)), !0), t;
}
function C(e, n, s) {
  const [t, o, r] = e[e.length - 1], a = g(t, n), i = g(o, n);
  e.push([
    a,
    typeof i == "function" ? i(a) : i,
    f(r, n),
    n,
    s,
    []
  ]);
}
function U(e, n, s, t, o) {
  const r = [[e, void 0, "", "", [], []]];
  for (const c of B(n))
    C(r, c, []);
  const a = r[r.length - 1];
  a[1] = typeof s == "function" ? s(a[0]) : s, a[4] = null;
  const i = /* @__PURE__ */ new WeakSet();
  for (; ; ) {
    const [c, l, y, E, P, v] = r[r.length - 1];
    let p;
    if (P) {
      const d = P.pop();
      if (d) {
        C(r, d, null);
        continue;
      }
      if (v.length > 0) {
        const M = c && typeof c == "object" ? F(c) : [];
        A(c) && M.push(["length", c.length]);
        const S = new Map(M);
        for (const [k, h] of v)
          h === null ? S.delete(k) : h !== void 0 && S.set(k, h);
        const T = z(S);
        p = u(typeof T.length == "number" ? w([], T) : T);
      }
    } else if (c !== l)
      if (typeof l != "object" || !l || H(l))
        p = l, typeof c == "object" && c && o && o.add(y);
      else {
        if (i.has(l))
          throw new Error(`Circular reference detected at path "${y}"`);
        i.add(l);
        const d = $(l).reverse();
        A(l) && d.push("length"), r[r.length - 1][4] = d;
        continue;
      }
    if (i.delete(l), r.pop(), p !== void 0)
      if (t?.set(y, p ?? void 0), r.length)
        r[r.length - 1][5].push([E, p]);
      else
        return p;
    if (!r.length)
      return e;
  }
}
function _(e, n, s, t, o, r) {
  n.n = U(
    n.n,
    f(e.prefix, s),
    t,
    o,
    r
  );
}
function I(e, n, s) {
  for (const [t, o] of n) {
    const r = e.t.get(t);
    if (r)
      for (const a of r)
        a(o, t);
    if (s.has(t)) {
      const a = `${t}.`;
      for (const [i, c] of e.t)
        if (typeof i == "string" && i.startsWith(a))
          for (const l of c)
            l(void 0, i);
    }
  }
  if (e.r.size > 0) {
    const t = u(
      K(n.entries()).map(([r, a]) => u([r, a ?? null])).concat(K(s).map((r) => u([r, null])))
    ), o = u(
      t.filter(([, r]) => typeof r != "object" || r === null || H(r))
    );
    for (const [r, a] of e.r)
      r(a ? t : o);
  }
}
function X(e, ...n) {
  const s = x(e), t = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
  for (const [r, a] of n)
    _(e, s, r, a, t, o);
  I(s, t, o);
}
function W(e, n) {
  const s = x(e), t = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set();
  _(e, s, "", n, t, o), I(s, t, o);
}
function Y(e, n, s) {
  return W(e, n()), j(e, "", () => {
    s(O(e, ""));
  });
}
function Z(e) {
  return w(e, { [V]: !0 });
}
function H(e) {
  return typeof e == "object" && e !== null && e[V] === !0;
}
/* v8 ignore start -- @preserve */
export {
  Q as computed,
  L as createStore,
  D as destroyStore,
  J as focus,
  H as isAtom,
  N as isStore,
  j as listen,
  G as listenAll,
  W as patch,
  O as peek,
  Z as setAtom,
  Y as sync,
  X as update
};
//# sourceMappingURL=core.js.map
