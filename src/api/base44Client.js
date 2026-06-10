// Base44 SDK client - uses window.base44 injected by the platform at runtime.
// Uses a lazy proxy so chained access (e.g. base44.auth.me()) never throws
// at module evaluation time. If the SDK isn't ready when a function is called,
// the call returns a rejected Promise so async callers handle it gracefully.

function makeLazyProxy(getRoot, path) {
  return new Proxy(function () {}, {
    get(_t, prop) {
      // Support .then check (Promise-like detection) — return undefined so
      // the proxy itself is not treated as a thenable.
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
      return makeLazyProxy(getRoot, [...path, prop]);
    },
    apply(_t, _this, args) {
      const root = getRoot();
      if (!root) {
        // SDK not ready yet — return a rejected promise so await callers don't crash
        return Promise.reject(new Error(`base44 SDK not ready (called ${path.join('.')})`));
      }
      let obj = root;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj?.[path[i]];
      }
      const fn = obj?.[path[path.length - 1]];
      if (typeof fn === 'function') return fn.apply(obj, args);
      return Promise.reject(new Error(`base44.${path.join('.')} is not a function`));
    },
  });
}

export const base44 = makeLazyProxy(() => window.base44, []);