import { GameState, LEVEL_CONFIG } from '../state.js';
import { PRODUCTS, PRODUCTS_MAP } from '../data/products.js';

let _orderSeq = 0;

// ─── Layout constants ────────────────────────────────────────────────────────
const FRIDGE_ROOM  = { x: 15,  y: 58,  w: 368, h: 495 };
const SHELVES_ROOM = { x: 398, y: 58,  w: 611, h: 495 };
const REGISTER_POS = { x: 160, y: 600 };
const COMPUTER_POS = { x: 790, y: 600 };
const ENTER_DOOR   = { x: 340, y: 655 };
const EXIT_DOOR    = { x: 690, y: 655 };
const PLAYER_START    = { x: 460, y: 560 };
const BACKROOM_DOOR   = { x: 940, y: 600 };

const PRODUCT_POS = {
  milk:      { x: 130, y: 200 }, eggs:      { x: 280, y: 200 },
  cream:     { x: 130, y: 360 }, cherries:  { x: 280, y: 360 },
  bananas:   { x: 490, y: 165 }, bread:     { x: 670, y: 165 }, potato: { x: 850, y: 165 },
  flour:     { x: 490, y: 315 }, cucumbers: { x: 670, y: 315 }, tomatoes: { x: 850, y: 315 },
  pepper:    { x: 490, y: 465 }, salt:      { x: 670, y: 465 }, sugar:  { x: 850, y: 465 },
};

const PLAYER_SPEED   = 190;
const CUSTOMER_SPEED = 95;
const INTERACTION_R  = 85;

const CUSTOMER_VARIANTS = [
  { shirt: 0xCC2222, pants: 0x222266, skin: 0xFFCC99, hair: 0x4A2800 },
  { shirt: 0x2244BB, pants: 0x333333, skin: 0xFFBB88, hair: 0x111111 },
  { shirt: 0x228833, pants: 0x224422, skin: 0xFFCC99, hair: 0xAA6622 },
  { shirt: 0xCC8800, pants: 0x333366, skin: 0xFFCC99, hair: 0x662200 },
  { shirt: 0x882299, pants: 0x333333, skin: 0xFFAA77, hair: 0x331133 },
  { shirt: 0x008899, pants: 0x224466, skin: 0xFFCC99, hair: 0x884422 },
  { shirt: 0xBB4411, pants: 0x443322, skin: 0xFFBB88, hair: 0x221100 },
];

// ─── Scene ───────────────────────────────────────────────────────────────────
export default class ShopScene extends Phaser.Scene {
  constructor() { super({ key: 'ShopScene' }); }

  create() {
    const cfg = LEVEL_CONFIG[GameState.level];
    this.spawnInterval = (11 * 60 * 1000) / cfg.customers;

    this._resetState();
    this._drawStore();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this._setupOrderPanel();
    this.cameras.main.fadeIn(400);
    this.events.on('wake', () => {
      this._arrowKeys.left = this._arrowKeys.right =
      this._arrowKeys.up   = this._arrowKeys.down  = false;
      const n = GameState.homeOrders.length;
      this.backroomBadge.setText(n > 0 ? `${n}` : '').setVisible(n > 0);
      this.cameras.main.fadeIn(300);
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _resetState() {
    this.customers    = [];
    this.spawnedCount = 0;
    this.spawnTimer   = 0;
    this.gameMin      = 9 * 60;
    this.orderOpen    = false;
    this.orderQty     = {};
    this.notifiedLow      = new Set();
    this.productSlots     = {};
    this.homeOrderTimer   = 0;
    this._nextHomeOrderIn = 40 + Math.floor(Math.random() * 21);
  }

  // ─── Human sprite helper ──────────────────────────────────────────────────

  _drawHuman(g, v) {
    const { shirt, pants, skin, hair } = v;
    g.fillStyle(0x1A1A1A);
    g.fillRect(-13, 30, 11, 8); g.fillRect(2, 30, 11, 8);
    g.fillStyle(pants);
    g.fillRect(-11, 8, 9, 24); g.fillRect(2, 8, 9, 24);
    g.fillStyle(shirt); g.fillRect(-13, -20, 26, 30);
    g.fillRect(-21, -18, 8, 22); g.fillRect(13, -18, 8, 22);
    g.fillStyle(skin); g.fillCircle(-17, 5, 5); g.fillCircle(17, 5, 5);
    g.fillStyle(skin); g.fillRect(-4, -28, 8, 10); g.fillCircle(0, -38, 12);
    g.fillStyle(hair); g.fillRect(-12, -50, 24, 14);
  }

  // ─── Store drawing ────────────────────────────────────────────────────────

  _drawStore() {
    const g = this.add.graphics();

    g.fillStyle(0xD2B48C); g.fillRect(0, 56, 1024, 644);

    g.lineStyle(3, 0x6B3A1A);
    g.strokeRect(FRIDGE_ROOM.x, FRIDGE_ROOM.y, FRIDGE_ROOM.w, FRIDGE_ROOM.h);
    g.strokeRect(SHELVES_ROOM.x, SHELVES_ROOM.y, SHELVES_ROOM.w, SHELVES_ROOM.h);

    g.fillStyle(0xB8D4F0, 0.3);
    g.fillRect(FRIDGE_ROOM.x + 2, FRIDGE_ROOM.y + 2, FRIDGE_ROOM.w - 4, FRIDGE_ROOM.h - 4);

    this.add.text(FRIDGE_ROOM.x + FRIDGE_ROOM.w / 2, FRIDGE_ROOM.y + 8,
      '❄ ХОЛОДИЛЬНИК', { fontSize: '13px', color: '#2244CC', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.add.text(SHELVES_ROOM.x + SHELVES_ROOM.w / 2, SHELVES_ROOM.y + 8,
      '📦 ПОЛИЦІ', { fontSize: '13px', color: '#664400', fontStyle: 'bold' }).setOrigin(0.5, 0);

    g.fillStyle(0x5C3317); g.fillRect(REGISTER_POS.x - 45, REGISTER_POS.y - 22, 90, 44);
    g.fillStyle(0x222222); g.fillRect(REGISTER_POS.x - 20, REGISTER_POS.y - 32, 40, 14);
    this.add.text(REGISTER_POS.x, REGISTER_POS.y - 42, '💰 КАСА',
      { fontSize: '12px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);

    g.fillStyle(0x222222); g.fillRect(COMPUTER_POS.x - 38, COMPUTER_POS.y - 28, 76, 50);
    g.fillStyle(0x3366FF); g.fillRect(COMPUTER_POS.x - 32, COMPUTER_POS.y - 24, 64, 38);
    g.fillStyle(0x222222); g.fillRect(COMPUTER_POS.x - 15, COMPUTER_POS.y + 22, 30, 8);
    this.add.text(COMPUTER_POS.x, COMPUTER_POS.y - 40, "🖥 ЗАМОВЛЕННЯ",
      { fontSize: '12px', color: '#AADDFF', fontStyle: 'bold' }).setOrigin(0.5);

    g.fillStyle(0x5A8A3A);
    g.fillRect(BACKROOM_DOOR.x - 30, BACKROOM_DOOR.y - 36, 60, 70);
    g.lineStyle(2, 0x3A6A2A);
    g.strokeRect(BACKROOM_DOOR.x - 30, BACKROOM_DOOR.y - 36, 60, 70);
    this.add.text(BACKROOM_DOOR.x, BACKROOM_DOOR.y - 48, '🏠 СКЛАД',
      { fontSize: '12px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);
    this.backroomBadge = this.add.text(BACKROOM_DOOR.x + 24, BACKROOM_DOOR.y - 50, '',
      { fontSize: '11px', color: '#fff', backgroundColor: '#CC2222',
        padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(8);

    g.fillStyle(0x5A8A3A);
    g.fillRect(ENTER_DOOR.x - 38, ENTER_DOOR.y - 10, 76, 45);
    g.lineStyle(2, 0x3A6A2A);
    g.strokeRect(ENTER_DOOR.x - 38, ENTER_DOOR.y - 10, 76, 45);
    this.add.text(ENTER_DOOR.x, ENTER_DOOR.y + 12, 'ВХІД',
      { fontSize: '12px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    g.fillStyle(0x8A3A3A);
    g.fillRect(EXIT_DOOR.x - 38, EXIT_DOOR.y - 10, 76, 45);
    g.lineStyle(2, 0x6A2A2A);
    g.strokeRect(EXIT_DOOR.x - 38, EXIT_DOOR.y - 10, 76, 45);
    this.add.text(EXIT_DOOR.x, EXIT_DOOR.y + 12, 'ВИХІД',
      { fontSize: '12px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    PRODUCTS.forEach(p => {
      const pos = PRODUCT_POS[p.id];
      const slotG = this.add.graphics();
      slotG.fillStyle(p.zone === 'fridge' ? 0xCCE8FF : 0xFFF8E8);
      slotG.fillRoundedRect(pos.x - 34, pos.y - 32, 68, 60, 6);
      slotG.lineStyle(2, p.color);
      slotG.strokeRoundedRect(pos.x - 34, pos.y - 32, 68, 60, 6);

      this.add.rectangle(pos.x, pos.y - 10, 44, 26, p.color);
      this.add.text(pos.x, pos.y + 14, p.name,
        { fontSize: '9px', color: '#333', wordWrap: { width: 64 } }).setOrigin(0.5, 0);

      const stockText = this.add.text(pos.x, pos.y - 34, `${GameState.stock[p.id]}`,
        { fontSize: '11px', color: '#006600', fontStyle: 'bold' }).setOrigin(0.5);
      this.productSlots[p.id] = { stockText, pos };
    });
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    this._drawHuman(g, { shirt: 0x2255BB, pants: 0x224488, skin: 0xFFCC99, hair: 0x4A2800 });
    g.fillStyle(0xF0EED8); g.fillRect(-9, -16, 18, 28);
    g.fillStyle(0xDDCCBB); g.fillRect(-6, -26, 12, 10);

    this.playerSprite = this.add.container(PLAYER_START.x, PLAYER_START.y, [g]);
    this.playerSprite.setDepth(10);
    this.playerPos = { x: PLAYER_START.x, y: PLAYER_START.y };
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const hudBg = this.add.graphics().setDepth(20);
    hudBg.fillStyle(0x1a1a2e, 0.92); hudBg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, `🛒 Рівень ${GameState.level}`,
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' }).setDepth(21);

    this.clockText = this.add.text(450, 10, '09:00',
      { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(21);

    this.dayText = this.add.text(560, 16, `День ${GameState.day}`,
      { fontSize: '15px', color: '#aaa' }).setDepth(21);

    this.starsText = this.add.text(700, 8, '★☆☆☆',
      { fontSize: '24px', color: '#FFD700' }).setDepth(21);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    this.add.text(810, 36, `Ціль: ${goal} €`,
      { fontSize: '10px', color: '#88BBFF' }).setDepth(21);

    this.earningsText = this.add.text(1014, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '22px', color: '#00FF88', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(21);
    this.add.text(1014, 36, 'Заробіток',
      { fontSize: '10px', color: '#aaa' }).setOrigin(1, 0).setDepth(21);

    const pbG = this.add.graphics().setDepth(21);
    pbG.fillStyle(0x333333); pbG.fillRect(810, 22, 140, 10);
    this.progressBar = this.add.graphics().setDepth(21);

    this.hintText = this.add.text(512, 672, '',
      { fontSize: '14px', color: '#FFFF44', backgroundColor: '#00000099',
        padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(22);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    this._arrowKeys = { left: false, right: false, up: false, down: false };
    const onKeyDown = (e) => {
      if (e.code === 'ArrowLeft')  { this._arrowKeys.left  = true; e.preventDefault(); }
      if (e.code === 'ArrowRight') { this._arrowKeys.right = true; e.preventDefault(); }
      if (e.code === 'ArrowUp')    { this._arrowKeys.up    = true; e.preventDefault(); }
      if (e.code === 'ArrowDown')  { this._arrowKeys.down  = true; e.preventDefault(); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowLeft')  this._arrowKeys.left  = false;
      if (e.code === 'ArrowRight') this._arrowKeys.right = false;
      if (e.code === 'ArrowUp')    this._arrowKeys.up    = false;
      if (e.code === 'ArrowDown')  this._arrowKeys.down  = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    this.events.once('destroy', () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    });
    this.events.on('sleep', () => {
      this._arrowKeys.left = this._arrowKeys.right =
      this._arrowKeys.up   = this._arrowKeys.down  = false;
    });

    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.enterKey.on('down', () => this._handleEnter());
    this.input.keyboard.addKey('SPACE').on('down', () => this._handleSpace());
    this.input.keyboard.addKey('ESC').on('down', () => this._closeOrderPanel());
  }

  // ─── Order panel (DOM) ────────────────────────────────────────────────────

  _setupOrderPanel() {
    document.getElementById('btn-cancel-order').addEventListener('click', () => this._closeOrderPanel());
    document.getElementById('btn-confirm-order').addEventListener('click', () => this._confirmOrder());
  }

  _openOrderPanel() {
    this.orderOpen = true;
    this.orderQty  = {};
    PRODUCTS.forEach(p => { this.orderQty[p.id] = 0; });

    const grid = document.getElementById('order-grid');
    grid.innerHTML = '';
    PRODUCTS.forEach(p => {
      const sellPrice = (p.supplierPrice * 1.5).toFixed(2);
      const div = document.createElement('div');
      div.className = 'order-item';
      div.innerHTML = `
        <div class="prod-name">${p.name}</div>
        <div class="prod-stock">Залишок: <b>${GameState.stock[p.id]}</b></div>
        <div class="prod-price">${p.supplierPrice.toFixed(2)}€ → ${sellPrice}€</div>
        <div class="qty-control">
          <button class="qty-btn" data-id="${p.id}" data-action="minus">−</button>
          <span class="qty-display" id="qty-${p.id}">0</span>
          <button class="qty-btn" data-id="${p.id}" data-action="plus">+</button>
        </div>`;
      grid.appendChild(div);
    });
    grid.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        const delta = e.currentTarget.dataset.action === 'plus' ? 1 : -1;
        this.orderQty[id] = Math.max(0, (this.orderQty[id] || 0) + delta);
        document.getElementById(`qty-${id}`).textContent = this.orderQty[id];
      });
    });
    document.getElementById('order-panel').style.display = 'block';
  }

  _closeOrderPanel() {
    this.orderOpen = false;
    document.getElementById('order-panel').style.display = 'none';
    document.activeElement?.blur();
    this._arrowKeys.left = this._arrowKeys.right =
    this._arrowKeys.up   = this._arrowKeys.down  = false;
  }

  _confirmOrder() {
    const deliveryAt = this.gameMin + 5.5 * 60;
    let ordered = false;
    PRODUCTS.forEach(p => {
      const qty = this.orderQty[p.id] || 0;
      if (qty > 0) {
        GameState.pendingDeliveries.push({ productId: p.id, quantity: qty, deliverAtMinute: deliveryAt });
        ordered = true;
      }
    });
    if (ordered) this._showNotification('Замовлення відправлено! Доставка через ~5.5 год.');
    this._closeOrderPanel();
  }

  _spawnHomeOrder() {
    const available = PRODUCTS.filter(p => GameState.stock[p.id] > 0);
    if (available.length === 0) return;
    const numItems = 1 + Math.floor(Math.random() * Math.min(3, available.length));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const chosen   = shuffled.slice(0, numItems);
    const items    = chosen.map(p => ({ productId: p.id, qty: 1 }));
    const earn     = items.reduce((s, i) => s + PRODUCTS_MAP[i.productId].supplierPrice * 0.75, 0);
    const orderNum = ++_orderSeq;
    GameState.homeOrders.push({ items, earn, orderNum });
    const n = GameState.homeOrders.length;
    this.backroomBadge.setText(`${n}`).setVisible(true);
    this._showNotification(`🏠 Нове замовлення #${orderNum}! (${n} в черзі)`);
  }

  // ─── Game logic ───────────────────────────────────────────────────────────

  _handleEnter() {
    if (this.orderOpen) return;
    if (this._near(this.playerPos, BACKROOM_DOOR, INTERACTION_R)) {
      this.scene.switch('BackRoomScene');
      return;
    }
    if (this._near(this.playerPos, REGISTER_POS, INTERACTION_R)) {
      this._scanOneItem();
    }
  }

  _handleSpace() {
    if (this.orderOpen) return;
    if (this._near(this.playerPos, COMPUTER_POS, INTERACTION_R)) {
      this._openOrderPanel();
    }
  }

  _scanOneItem() {
    const c = this.customers.find(c => c.state === 'at_register');
    if (!c) return;

    if (c.scanIdx === undefined) c.scanIdx = 0;
    if (c.scanIdx >= c.cart.length) return;

    const { productId, qty } = c.cart[c.scanIdx];
    const p = PRODUCTS_MAP[productId];
    const earned = p.supplierPrice * 0.5 * qty;

    GameState.earnings += earned;
    GameState.stock[productId] = Math.max(0, GameState.stock[productId] - qty);
    this._refreshSlot(productId);
    this._checkLowStock(productId);
    this._floatText(`+${earned.toFixed(2)} € (${p.name})`, REGISTER_POS.x, REGISTER_POS.y - 30);

    c.scanIdx++;
    if (c.scanIdx >= c.cart.length) c.state = 'leaving';
  }

  _checkLowStock(id) {
    if (GameState.stock[id] < 5 && !this.notifiedLow.has(id)) {
      this.notifiedLow.add(id);
      this._showNotification(`⚠ Запаси "${PRODUCTS_MAP[id].name}" низькі! Замовте новий товар.`);
    }
  }

  _refreshSlot(id) {
    const slot = this.productSlots[id];
    if (!slot) return;
    const s = GameState.stock[id];
    slot.stockText.setText(`${s}`);
    slot.stockText.setColor(s < 5 ? '#FF3300' : '#006600');
  }

  _processDeliveries() {
    const arrived = GameState.pendingDeliveries.filter(d => d.deliverAtMinute <= this.gameMin);
    arrived.forEach(d => {
      GameState.stock[d.productId] += d.quantity;
      this._refreshSlot(d.productId);
      this.notifiedLow.delete(d.productId);
      this._showNotification(`📦 Доставлено ${d.quantity}× ${PRODUCTS_MAP[d.productId].name}!`);
    });
    GameState.pendingDeliveries = GameState.pendingDeliveries.filter(d => d.deliverAtMinute > this.gameMin);
  }

  // ─── Customer AI ──────────────────────────────────────────────────────────

  _spawnCustomer() {
    const maxCustomers = LEVEL_CONFIG[GameState.level].customers;
    if (this.spawnedCount >= maxCustomers) return;
    const available = PRODUCTS.filter(p => GameState.stock[p.id] > 0);
    if (available.length === 0) return;

    const numItems = 1 + Math.floor(Math.random() * Math.min(3, available.length));
    const chosen   = [...available].sort(() => Math.random() - 0.5).slice(0, numItems);
    const variant  = CUSTOMER_VARIANTS[this.spawnedCount % CUSTOMER_VARIANTS.length];

    const g = this.add.graphics();
    this._drawHuman(g, variant);
    const sprite = this.add.container(ENTER_DOOR.x, ENTER_DOOR.y, [g]);
    sprite.setDepth(9);

    const waypoints = [
      { x: ENTER_DOOR.x + Math.floor(Math.random() * 41) - 20, y: 620 },
      ...chosen.map(p => ({ ...PRODUCT_POS[p.id] })),
      { x: REGISTER_POS.x + 65, y: REGISTER_POS.y },
    ];

    this.customers.push({
      x: ENTER_DOOR.x, y: ENTER_DOOR.y,
      state: 'walking',
      cart: chosen.map(p => ({ productId: p.id, qty: 1 })),
      scanIdx: 0,
      waypoints, wpIdx: 0,
      sprite, remove: false,
    });
    this.spawnedCount++;
  }

  _updateCustomers(dt) {
    for (const c of this.customers) {
      if (c.state === 'walking') {
        if (c.wpIdx >= c.waypoints.length) { c.state = 'at_register'; continue; }
        const t = c.waypoints[c.wpIdx];
        const dx = t.x - c.x, dy = t.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) { c.wpIdx++; }
        else {
          c.x += (dx / dist) * CUSTOMER_SPEED * dt;
          c.y += (dy / dist) * CUSTOMER_SPEED * dt;
          c.sprite.setPosition(c.x, c.y);
        }
      } else if (c.state === 'leaving') {
        const dx = EXIT_DOOR.x - c.x, dy = EXIT_DOOR.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) { c.sprite.destroy(); c.remove = true; }
        else {
          c.x += (dx / dist) * CUSTOMER_SPEED * dt;
          c.y += (dy / dist) * CUSTOMER_SPEED * dt;
          c.sprite.setPosition(c.x, c.y);
        }
      }
    }
    this.customers = this.customers.filter(c => !c.remove);
  }

  // ─── HUD update ───────────────────────────────────────────────────────────

  _updateHUD() {
    const h = Math.floor(this.gameMin / 60), m = Math.floor(this.gameMin) % 60;
    this.clockText.setText(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    this.earningsText.setText(`${GameState.earnings.toFixed(2)} €`);
    this.dayText.setText(`День ${GameState.day}`);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    const pct   = Math.min(1, GameState.earnings / goal);
    const stars = pct < 0.33 ? 1 : pct < 0.66 ? 2 : pct < 1 ? 3 : 4;
    this.starsText.setText('★'.repeat(stars) + '☆'.repeat(4 - stars));
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00AA44);
    this.progressBar.fillRect(810, 22, 140 * pct, 10);

    const atReg   = this._near(this.playerPos, REGISTER_POS, INTERACTION_R);
    const atComp  = this._near(this.playerPos, COMPUTER_POS, INTERACTION_R);
    const waiting = this.customers.find(c => c.state === 'at_register');

    if (atReg && waiting) {
      const idx  = waiting.scanIdx || 0;
      const left = waiting.cart.length - idx;
      if (left > 0) {
        const nextItem = PRODUCTS_MAP[waiting.cart[idx].productId].name;
        this.hintText.setText(`ENTER — сканувати "${nextItem}" (залишилось: ${left})`);
      }
    } else if (this._near(this.playerPos, BACKROOM_DOOR, INTERACTION_R)) {
      const n = GameState.homeOrders.length;
      this.hintText.setText(n > 0
        ? `ENTER — перейти до складу (${n} замовлень)`
        : 'ENTER — перейти до складу');
    } else if (atComp) {
      this.hintText.setText("ПРОБІЛ — відкрити комп'ютер замовлень");
    } else {
      this.hintText.setText('');
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  _near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }

  _showNotification(text) {
    const el = document.getElementById('notification');
    el.textContent = text; el.style.display = 'block';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  _floatText(text, x, y) {
    const t = this.add.text(x, y, text, {
      fontSize: '17px', color: '#00FF88', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 55, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  // ─── Update loop ──────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.orderOpen) return;
    const dt = delta / 1000;

    this.gameMin += dt;

    if (this._arrowKeys.left)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (this._arrowKeys.right) this.playerPos.x += PLAYER_SPEED * dt;
    if (this._arrowKeys.up)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (this._arrowKeys.down)  this.playerPos.y += PLAYER_SPEED * dt;
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 25, 1000);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 65, 650);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this._spawnCustomer();
    }
    this._updateCustomers(dt);
    this._processDeliveries();
    this._updateHUD();

    // Home order spawn: every 40-60 game-minutes
    this.homeOrderTimer += dt;
    if (this.homeOrderTimer >= this._nextHomeOrderIn) {
      this.homeOrderTimer = 0;
      this._nextHomeOrderIn = 40 + Math.floor(Math.random() * 21);
      this._spawnHomeOrder();
    }

    if (this.gameMin >= 20 * 60) {
      document.getElementById('notification').style.display = 'none';
      document.getElementById('order-panel').style.display = 'none';
      GameState.day++;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('CommuteScene', { destination: 'home' }));
    }
  }
}
