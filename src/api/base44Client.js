// Base44 SDK client - uses window.base44 injected by the platform
// Returns window.base44 at call time so it's always resolved after injection.

export const base44 = new Proxy({}, {
  get(_target, prop) {
    return window.base44?.[prop];
  }
});