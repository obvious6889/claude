import { PRODUCTS } from './data/products.js';

export const GameState = {
  earnings: 10,
  day: 1,
  stock: {},
  pendingDeliveries: [], // { productId, quantity, deliverAtMinute }
};

PRODUCTS.forEach(p => {
  GameState.stock[p.id] = 20;
});
