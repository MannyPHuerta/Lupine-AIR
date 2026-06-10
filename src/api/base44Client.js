// Base44 SDK client - uses window.base44 injected by the platform
// Uses a Proxy so all property accesses are deferred until call time,
// guaranteeing window.base44 is resolved AFTER the platform injects it.

export const base44 = typeof window !== 'undefined'
  ? new Proxy({}, {
      get(_target, prop) {
        const sdk = window.base44;
        if (!sdk) throw new Error(`base44 SDK not available yet (accessing .${String(prop)})`);
        const val = sdk[prop];
        return typeof val === 'function' ? val.bind(sdk) : val;
      }
    })
  : {};