// Base44 SDK client - uses window.base44 injected by the platform.
// All property accesses and function calls are deferred to call-time,
// so chained access like base44.auth.me() or base44.entities.Foo.list()
// works even if this module is evaluated before window.base44 is injected.

function makeLazyProxy(getRoot, path) {
  return new Proxy(function(){}, {
    get(_t, prop) {
      return makeLazyProxy(getRoot, [...path, prop]);
    },
    apply(_t, _this, args) {
      let obj = getRoot();
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj?.[path[i]];
      }
      const fn = obj?.[path[path.length - 1]];
      if (typeof fn === 'function') return fn.apply(obj, args);
      throw new Error(`base44.${path.join('.')} is not a function (SDK may not be ready)`);
    }
  });
}

export const base44 = makeLazyProxy(() => window.base44, []);