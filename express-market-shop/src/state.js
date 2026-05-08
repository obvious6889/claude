import { PRODUCTS } from './data/products.js';

export const LEVEL_CONFIG = [
  null,
  { customers: 80,  goal: 200 },
  { customers: 120, goal: 300 },
  { customers: 310, goal: 500 },
];

export const GameState = {
  job: null,   // 'shop' | 'construction' | 'restaurant' — set once in JobSelectScene
  earnings: 10,
  day: 1,
  level: 1,
  maxUnlocked: 1,
  stock: {},
  prices: {},
  pendingDeliveries: [],
  pendingStock: {},
  homeOrders: [],
  nextOrderNumber: 1,
  hasVacuum: false,
  hasCashier: false,
  materials: { floor: 0, wall: 0, roof: 0, bed: 0, table: 0, chair: 0 },
  houseGrid: [],   // flat GRID_COLS×GRID_ROWS array, managed by HomeBuildScene
  houseComplete: false,
};

PRODUCTS.forEach(p => {
  GameState.stock[p.id]  = 20;
  GameState.prices[p.id] = parseFloat((p.supplierPrice * 1.5).toFixed(2));
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
  GameState.materials  = { floor: 0, wall: 0, roof: 0, bed: 0, table: 0, chair: 0 };
  GameState.houseGrid  = [];
  GameState.houseComplete = false;
  PRODUCTS.forEach(p => {
    GameState.stock[p.id]  = 20;
    GameState.prices[p.id] = parseFloat((p.supplierPrice * 1.5).toFixed(2));
  });
}
