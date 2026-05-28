// Shared store cart — persisted in sessionStorage so it survives navigation
// between the construction catalog, event store, and checkout

const CART_KEY = 'store_cart';

export function getCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(items) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(equipment, quantity = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === equipment.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + quantity;
  } else {
    cart.push({ ...equipment, quantity });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(equipmentId) {
  const cart = getCart().filter(i => i.id !== equipmentId);
  saveCart(cart);
  return cart;
}

export function updateQuantity(equipmentId, quantity) {
  const cart = getCart().map(i => i.id === equipmentId ? { ...i, quantity } : i);
  saveCart(cart);
  return cart;
}

export function clearCart() {
  sessionStorage.removeItem(CART_KEY);
}

export function cartCount() {
  return getCart().reduce((sum, i) => sum + (i.quantity || 1), 0);
}