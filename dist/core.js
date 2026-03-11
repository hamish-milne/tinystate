const h = /* @__PURE__ */ Symbol("Store"), f = /* @__PURE__ */ new WeakMap();
function g(e, n) {
  return e && typeof e == "object" ? e[n] : void 0;
}
function k(e) {
  return String(e).match(/[^.]+/g) || [];
}
function _(e, n) {
  let a = e;
  for (const t of k(n))
    a = g(a, t);
  return a;
}
function d(e, n) {
  return e === "" ? n : n === "" ? e : `${e}.${n}`;
}
function x(e) {
  const n = f.get(e.root || e);
  if (!n)
    throw new Error("Invalid store");
  return n;
}
function U(e) {
  if (I(e))
    return e;
  if (typeof e == "function")
    return e();
  const n = Object.freeze({
    [h]: Object.freeze([!0, null]),
    root: null,
    prefix: ""
  }), a = Object.preventExtensions({
    t: B(null, "", e, null, null),
    e: /* @__PURE__ */ new Map()
  });
  return f.set(n, a), n;
}
function E(e) {
  f.delete(e.root || e);
}
function I(e) {
  return f.has(e);
}
function V(e, n = "") {
  return _(x(e).t, d(e.prefix, n));
}
function w(e, n, a, t = !1) {
  const r = x(e), o = d(e.prefix, n);
  let s = r.e.get(o);
  return s || (s = /* @__PURE__ */ new Set(), r.e.set(o, s)), s.add(a), t && a(V(e, n), n), () => s.delete(a);
}
function H(e, n) {
  return n === "" ? e : Object.freeze({
    [h]: e[h],
    root: e.root || e,
    prefix: d(e.prefix, n)
  });
}
function R(e, n, a) {
  const t = U(void 0);
  return w(e, n, (r) => j(t, a(r)), !0), t;
}
function K(e, n, a) {
  const [t, r, o] = e[e.length - 1], s = g(t, n), i = g(r, n);
  e.push([
    s,
    typeof i == "function" ? i(s) : i,
    d(o, n),
    n,
    a,
    []
  ]);
}
function B(e, n, a, t, r) {
  const o = [[e, void 0, "", "", [], []]];
  for (const c of k(n))
    K(o, c, []);
  const s = o[o.length - 1];
  s[1] = typeof a == "function" ? a(s[0]) : a, s[4] = null;
  const i = /* @__PURE__ */ new WeakSet();
  for (; ; ) {
    const [c, u, y, C, m, P] = o[o.length - 1];
    let p;
    if (m) {
      const l = m.pop();
      if (l) {
        K(o, l, null);
        continue;
      }
      if (P.length > 0) {
        const v = c && typeof c == "object" ? Object.entries(c) : [];
        Array.isArray(c) && v.push(["length", c.length]);
        const b = new Map(v);
        for (const [M, T] of P)
          T === null ? b.delete(M) : T !== void 0 && b.set(M, T);
        const S = Object.fromEntries(b);
        p = Object.freeze(
          typeof S.length == "number" ? Object.assign([], S) : S
        );
      }
    } else if (c !== u)
      if (typeof u != "object" || !u)
        p = u, typeof c == "object" && c && r && r.add(y);
      else {
        if (i.has(u))
          throw new Error(`Circular reference detected at path "${y}"`);
        i.add(u);
        const l = Object.keys(u).reverse();
        Array.isArray(u) && l.push("length"), o[o.length - 1][4] = l;
        continue;
      }
    if (i.delete(u), o.pop(), p !== void 0)
      if (t?.set(y, p ?? void 0), o.length)
        o[o.length - 1][5].push([C, p]);
      else
        return p;
    if (!o.length)
      return e;
  }
}
function A(e, n, a, t, r, o) {
  n.t = B(
    n.t,
    d(e.prefix, a),
    t,
    r,
    o
  );
}
function O(e, n, a) {
  for (const [t, r] of n) {
    const o = e.e.get(t);
    if (o)
      for (const s of o)
        s(r, t);
    if (a.has(t)) {
      const s = `${t}.`;
      for (const [i, c] of e.e)
        if (typeof i == "string" && i.startsWith(s))
          for (const u of c)
            u(void 0, i);
    }
  }
}
function W(e, ...n) {
  const a = x(e), t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
  for (const [o, s] of n)
    A(e, a, o, s, t, r);
  O(a, t, r);
}
function j(e, n) {
  const a = x(e), t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
  A(e, a, "", n, t, r), O(a, t, r);
}
function z(e, n, a) {
  return j(e, n()), w(e, "", () => {
    a(V(e, ""));
  });
}
/* v8 ignore start -- @preserve */
export {
  R as computed,
  U as createStore,
  E as destroyStore,
  H as focus,
  I as isStore,
  w as listen,
  j as patch,
  V as peek,
  z as sync,
  W as update
};
//# sourceMappingURL=core.js.map
