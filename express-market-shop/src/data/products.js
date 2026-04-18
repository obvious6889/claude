export const PRODUCTS = [
  { id: 'milk',      name: 'Молоко',    supplierPrice: 0.80, zone: 'fridge',  color: 0xF0F0FF },
  { id: 'eggs',      name: 'Яйця',      supplierPrice: 1.50, zone: 'fridge',  color: 0xFFF8DC },
  { id: 'cream',     name: 'Сливки',    supplierPrice: 1.20, zone: 'fridge',  color: 0xFFFDD0 },
  { id: 'cherries',  name: 'Вишні',     supplierPrice: 2.00, zone: 'fridge',  color: 0x8B0000 },
  { id: 'bananas',   name: 'Банани',    supplierPrice: 1.00, zone: 'shelves', color: 0xFFE135 },
  { id: 'bread',     name: 'Хліб',      supplierPrice: 0.60, zone: 'shelves', color: 0xC4A265 },
  { id: 'potato',    name: 'Картопля',  supplierPrice: 0.50, zone: 'shelves', color: 0xC5A028 },
  { id: 'flour',     name: 'Борошно',   supplierPrice: 0.70, zone: 'shelves', color: 0xF5F5DC },
  { id: 'cucumbers', name: 'Огірки',    supplierPrice: 0.80, zone: 'shelves', color: 0x4CBB17 },
  { id: 'tomatoes',  name: 'Помідори',  supplierPrice: 0.90, zone: 'shelves', color: 0xFF4500 },
  { id: 'pepper',    name: 'Перець',    supplierPrice: 1.10, zone: 'shelves', color: 0xCC2200 },
  { id: 'salt',      name: 'Сіль',      supplierPrice: 0.30, zone: 'shelves', color: 0xE8E8E8 },
  { id: 'sugar',     name: 'Цукор',     supplierPrice: 0.40, zone: 'shelves', color: 0xFAF0E6 },
];

export const PRODUCTS_MAP = {};
PRODUCTS.forEach(p => { PRODUCTS_MAP[p.id] = p; });
