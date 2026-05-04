import { PRODUCTS } from './data/products.js';

export const LEVEL_CONFIG = [
  null,
  { customers: 80,  goal: 200 },
  { customers: 120, goal: 300 },
  { customers: 310, goal: 500 },
];

export const GameState = {
  earnings: 10,
  day: 1,
  level: 1,
  maxUnlocked: 1,
  stock: {},
  pendingDeliveries: [],
  pendingStock: {},
  homeOrders: [],
  nextOrderNumber: 1,
  hasVacuum: false,
  hasCashier: false,
};

PRODUCTS.forEach(p => {
  GameState.stock[p.id] = 20;
});

export function resetForLevel(level) {
  GameState.level = level;
  GameState.earnings = 10;
  GameState.day = 1;
  GameState.pendingDeliveries = [];
  GameState.pendingStock = {};
  GameState.homeOrders = [];
  GameState.nextOrderNumber = 1;
  GameState.hasVacuum  = false;
  GameState.hasCashier = false;
  PRODUCTS.forEach(p => { GameState.stock[p.id] = 20; });
}
