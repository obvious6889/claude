import { GameState } from '../state.js';

const KEY = 'expressMarket_v1';
const FIELDS = [
  'job', 'earnings', 'day', 'level', 'maxUnlocked',
  'stock', 'prices', 'pendingDeliveries', 'pendingStock',
  'homeOrders', 'nextOrderNumber',
  'hasVacuum', 'hasCashier',
  'materials', 'houseGrid', 'houseComplete', 'upgrades',
];

export function saveGame() {
  const d = {};
  FIELDS.forEach(f => { d[f] = GameState[f]; });
  localStorage.setItem(KEY, JSON.stringify(d));
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}

export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    FIELDS.forEach(f => { if (d[f] !== undefined) GameState[f] = d[f]; });
    return true;
  } catch (_) { return false; }
}
