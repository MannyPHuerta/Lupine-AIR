// Base44 SDK client - uses window.base44 injected by the platform
// Uses a Proxy so all property accesses are deferred until call time.
// If the SDK isn't ready yet, returns undefined gracefully (no throw).

function makeProxy(path) {
  return new Proxy(function () {}, {
    get(_target, prop) {
      const sdk = window.base44;
      if (!sdk) return makeProxy([...path, prop]);
      let val = sdk;
      for (const key of path) val = val?.[key];
      const next = val?.[prop];
      if (typeof next === 'function') return next.bind(val);
      if (next && typeof next === 'object') return makeProxy([...path, prop]);
      return next;
    },
    apply(_target, _thisArg, args) {
      const sdk = window.base44;
      if (!sdk) return Promise.reject(new Error('base44 SDK not available yet'));
      let val = sdk;
      for (const key of path.slice(0, -1)) val = val?.[key];
      const fn = val?.[path[path.length - 1]];
      if (typeof fn === 'function') return fn.apply(val, args);
      return Promise.reject(new Error(`base44.${path.join('.')} is not a function`));
    }
  });
}

export const base44 = typeof window !== 'undefined' ? makeProxy([]) : {};