// Base44 SDK client
// window.base44 is injected by the platform at runtime.
// We expose it via a simple getter so all imports always reference
// the live object, even if this module is evaluated before injection.

export const base44 = new Proxy({}, {
  get(_target, prop) {
    return window.base44?.[prop];
  }
});