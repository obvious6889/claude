export const MATERIALS = [
  { id: 'floor', name: 'Підлога',  price: 0.30, color: 0xC4A265, req: 30 },
  { id: 'wall',  name: 'Стіна',    price: 0.60, color: 0x7A5230, req: 14 },
  { id: 'roof',  name: 'Дах',      price: 2.50, color: 0x607D8B, req: 1  },
  { id: 'bed',   name: 'Ліжко',    price: 5.00, color: 0x3355AA, req: 1  },
  { id: 'table', name: 'Стіл',     price: 4.00, color: 0x8B5E3C, req: 1  },
  { id: 'chair', name: 'Стілець',  price: 2.00, color: 0x6B4A2A, req: 1  },
];

export const MATERIALS_MAP = {};
MATERIALS.forEach(m => { MATERIALS_MAP[m.id] = m; });
