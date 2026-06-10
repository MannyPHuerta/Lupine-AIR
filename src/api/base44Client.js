// Base44 SDK client - uses window.base44 injected by the platform
// The SDK is available via window.base44 at runtime

export const base44 = typeof window !== 'undefined' ? window.base44 : null;