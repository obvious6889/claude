import { GameState } from '../state.js';
import { PRODUCTS, PRODUCTS_MAP } from '../data/products.js';

// ─── Layout constants ────────────────────────────────────────────────────────
const FRIDGE_ROOM  = { x: 15,  y: 58,  w: 368, h: 495 };
const SHELVES_ROOM = { x: 398, y: 58,  w: 611, h: 495 };
const REGISTER_POS = { x: 160, y: 600 };
const COMPUTER_POS = { x: 790, y: 600 };
const DOOR_POS     = { x: 512, y: 655 };
const PLAYER_START = { x: 460, y: 560 };

const PRODUCT_POS = {
  milk:      { x: 130, y: 200 }, eggs:      { x: 280, y: 200 },
  cream:     { x: 130, y: 360 }, cherries:  { x: 280, y: 360 },
  bananas:   { x: 490, y: 165 }, bread:     { x: 670, y: 165 }, potato: { x: 850, y: 165 },
  flour:     { x: 490, y: 315 }, cucumbers: { x: 670, y: 315 }, tomatoes: { x: 850, y: 315 },
  pepper:    { x: 490, y: 465 }, salt:      { x: 670, y: 465 }, sugar:  { x: 850, y: 465 },
};

const PLAYER_SPEED    = 190;
const CUSTOMER_SPEED  = 95;
const INTERACTION_R   = 85;
const SPAWN_INTERVAL  = (11 * 60 * 1000) / 50; // ms between customers
const CUSTOMER_COLORS = [0xFF6B6B, 0x6B6BFF, 0x00CC88, 0xFFAA00, 0xFF44FF, 0x00CCFF, 0xFF8800];

// ─── Scene ───────────────────────────────────────────────────────────────────
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create() {
    this._resetState();
    this._drawStore();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this._setupOrderPanel();
    this.cameras.main.fadeIn(400);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  _resetState() {
    this.customers = [];
    this.spawnedCount = 0;
    this.spawnTimer = 0;
    this.gameMin = 9 * 60;  // 9:00
    this.orderOpen = false;
    this.orderQty = {};
    this.notifiedLow = new Set();
    this.productSlots = {};
  }

  // ─── Store drawing ────────────────────────────────────────────────────────

  _drawStore() {
    const g = this.add.graphics();

    // Floor
    g.fillStyle(0xD2B48C); g.fillRect(0, 56, 1024, 644);

    // Room walls
    g.lineStyle(3, 0x6B3A1A);
    g.strokeRect(FRIDGE_ROOM.x, FRIDGE_ROOM.y, FRIDGE_ROOM.w, FRIDGE_ROOM.h);
    g.strokeRect(SHELVES_ROOM.x, SHELVES_ROOM.y, SHELVES_ROOM.w, SHELVES_ROOM.h);

    // Fridge room fill
    g.fillStyle(0xB8D4F0, 0.3);
    g.fillRect(FRIDGE_ROOM.x + 2, FRIDGE_ROOM.y + 2, FRIDGE_ROOM.w - 4, FRIDGE_ROOM.h - 4);

    // Room labels
    this.add.text(FRIDGE_ROOM.x + FRIDGE_ROOM.w / 2, FRIDGE_ROOM.y + 8,
      '❄ ХОЛОДИЛЬНИК', { fontSize: '13px', color: '#2244CC', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.add.text(SHELVES_ROOM.x + SHELVES_ROOM.w / 2, SHELVES_ROOM.y + 8,
      '📦 ПОЛИЦІ', { fontSize: '13px', color: '#664400', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Cash register
    g.fillStyle(0x5C3317); g.fillRect(REGISTER_POS.x - 45, REGISTER_POS.y - 22, 90, 44);
    g.fillStyle(0x222222); g.fillRect(REGISTER_POS.x - 20, REGISTER_POS.y - 32, 40, 14);
    this.add.text(REGISTER_POS.x, REGISTER_POS.y - 42, '💰 КАСА',
      { fontSize: '12px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);

    // Computer
    g.fillStyle(0x222222); g.fillRect(COMPUTER_POS.x - 38, COMPUTER_POS.y - 28, 76, 50);
    g.fillStyle(0x3366FF); g.fillRect(COMPUTER_POS.x - 32, COMPUTER_POS.y - 24, 64, 38);
    g.fillStyle(0x222222); g.fillRect(COMPUTER_POS.x - 15, COMPUTER_POS.y + 22, 30, 8);
    this.add.text(COMPUTER_POS.x, COMPUTER_POS.y - 40, "🖥 КОМП'ЮТЕР",
      { fontSize: '12px', color: '#AADDFF', fontStyle: 'bold' }).setOrigin(0.5);

    // Door
    g.fillStyle(0x8B6914);
    g.fillRect(DOOR_POS.x - 40, DOOR_POS.y - 10, 80, 45);
    this.add.text(DOOR_POS.x, DOOR_POS.y + 10, 'ВХІД',
      { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    // Product slots
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
    this._drawMario(g);
    this.playerSprite = this.add.container(PLAYER_START.x, PLAYER_START.y, [g]);
    this.playerSprite.setDepth(10);
    this.playerPos = { x: PLAYER_START.x, y: PLAYER_START.y };
  }

  _drawMario(g) {
    g.fillStyle(0xFF0000); g.fillRect(-13, -36, 26, 8); g.fillRect(-9, -44, 18, 10);
    g.fillStyle(0xFFCC99); g.fillCircle(0, -20, 11);
    g.fillStyle(0xFF0000); g.fillRect(-10, -10, 20, 13);
    g.fillStyle(0x0000CC); g.fillRect(-11, 3, 22, 24);
    g.fillStyle(0x4A2800); g.fillRect(-11, 25, 9, 7); g.fillRect(2, 25, 9, 7);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    // Background bar
    const hudBg = this.add.graphics().setDepth(20);
    hudBg.fillStyle(0x1a1a2e, 0.92);
    hudBg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, '🛒 Експрес Маркет Магазин',
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' }).setDepth(21);

    this.clockText = this.add.text(450, 10, '09:00',
      { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(21);

    this.dayText = this.add.text(560, 16, `День ${GameState.day}`,
      { fontSize: '15px', color: '#aaa' }).setDepth(21);

    this.starsText = this.add.text(700, 8, '★☆☆☆',
      { fontSize: '24px', color: '#FFD700' }).setDepth(21);

    // Earnings — top right
    this.earningsText = this.add.text(1014, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '22px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    this.add.text(1014, 36, 'Заробіток',
      { fontSize: '10px', color: '#aaa' }).setOrigin(1, 0).setDepth(21);

    // Progress bar
    const pbG = this.add.graphics().setDepth(21);
    pbG.fillStyle(0x333333); pbG.fillRect(810, 22, 140, 10);
    this.progressBar = this.add.graphics().setDepth(21);

    // Interaction hint (bottom)
    this.hintText = this.add.text(512, 672, '',
      { fontSize: '14px', color: '#FFFF44', backgroundColor: '#00000099',
        padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(22);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey('SPACE').on('down', () => this._handleSpace());
    this.input.keyboard.addKey('ESC').on('down', () => this._closeOrderPanel());
  }

  // ─── Order panel (DOM) ────────────────────────────────────────────────────

  _setupOrderPanel() {
    document.getElementById('btn-cancel-order')
      .addEventListener('click', () => this._closeOrderPanel());
    document.getElementById('btn-confirm-order')
      .addEventListener('click', () => this._confirmOrder());
  }

  _openOrderPanel() {
    this.orderOpen = true;
    this.orderQty = {};
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

  // ─── Game logic helpers ───────────────────────────────────────────────────

  _handleSpace() {
    if (this.orderOpen) return;
    const atReg = this._near(this.playerPos, REGISTER_POS, INTERACTION_R);
    const atComp = this._near(this.playerPos, COMPUTER_POS, INTERACTION_R);
    if (atReg) this._scanCustomer();
    else if (atComp) this._openOrderPanel();
  }

  _scanCustomer() {
    const c = this.customers.find(c => c.state === 'at_register');
    if (!c) return;

    let earned = 0;
    c.cart.forEach(({ productId, qty }) => {
      const p = PRODUCTS_MAP[productId];
      earned += p.supplierPrice * 0.5 * qty;
      GameState.stock[productId] = Math.max(0, GameState.stock[productId] - qty);
      this._refreshSlot(productId);
      this._checkLowStock(productId);
    });

    GameState.earnings += earned;
    this._floatText(`+${earned.toFixed(2)} €`, REGISTER_POS.x, REGISTER_POS.y - 30);
    c.state = 'leaving';
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
    if (this.spawnedCount >= 50) return;
    const available = PRODUCTS.filter(p => GameState.stock[p.id] > 0);
    if (available.length === 0) return;

    const numItems = Phaser.Math.Between(1, Math.min(3, available.length));
    const chosen = Phaser.Utils.Array.Shuffle([...available]).slice(0, numItems);

    const color = CUSTOMER_COLORS[this.spawnedCount % CUSTOMER_COLORS.length];
    const g = this.add.graphics();
    g.fillStyle(color); g.fillCircle(0, -16, 10);
    g.fillRect(-8, -6, 16, 20);
    g.fillStyle(0x333333); g.fillCircle(0, -20, 4);

    const sprite = this.add.container(DOOR_POS.x, DOOR_POS.y, [g]);
    sprite.setDepth(9);

    // Build waypoints: first move up from door, then visit each product
    const waypoints = [
      { x: DOOR_POS.x + Phaser.Math.Between(-30, 30), y: 620 },
      ...chosen.map(p => ({ ...PRODUCT_POS[p.id] })),
      { x: REGISTER_POS.x + 65, y: REGISTER_POS.y },
    ];

    this.customers.push({
      x: DOOR_POS.x,
      y: DOOR_POS.y,
      state: 'walking',
      cart: chosen.map(p => ({ productId: p.id, qty: 1 })),
      waypoints,
      wpIdx: 0,
      sprite,
      remove: false,
    });

    this.spawnedCount++;
  }

  _updateCustomers(dt) {
    for (const c of this.customers) {
      if (c.state === 'walking') {
        if (c.wpIdx >= c.waypoints.length) {
          c.state = 'at_register';
          continue;
        }
        const target = c.waypoints[c.wpIdx];
        const dx = target.x - c.x;
        const dy = target.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          c.wpIdx++;
        } else {
          c.x += (dx / dist) * CUSTOMER_SPEED * dt;
          c.y += (dy / dist) * CUSTOMER_SPEED * dt;
          c.sprite.setPosition(c.x, c.y);
        }
      } else if (c.state === 'leaving') {
        const dx = DOOR_POS.x - c.x;
        const dy = DOOR_POS.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          c.sprite.destroy();
          c.remove = true;
        } else {
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
    const h = Math.floor(this.gameMin / 60);
    const m = Math.floor(this.gameMin) % 60;
    this.clockText.setText(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    this.earningsText.setText(`${GameState.earnings.toFixed(2)} €`);
    this.dayText.setText(`День ${GameState.day}`);

    const pct = Math.min(1, GameState.earnings / 100);
    const stars = pct < 0.33 ? 1 : pct < 0.66 ? 2 : pct < 1 ? 3 : 4;
    this.starsText.setText('★'.repeat(stars) + '☆'.repeat(4 - stars));

    this.progressBar.clear();
    this.progressBar.fillStyle(0x00AA44);
    this.progressBar.fillRect(810, 22, 140 * pct, 10);

    // Interaction hint
    const atReg = this._near(this.playerPos, REGISTER_POS, INTERACTION_R);
    const atComp = this._near(this.playerPos, COMPUTER_POS, INTERACTION_R);
    const waiting = this.customers.some(c => c.state === 'at_register');

    if (atReg && waiting) {
      this.hintText.setText('ПРОБІЛ — сканувати товари покупця');
    } else if (atComp) {
      this.hintText.setText("ПРОБІЛ — відкрити комп'ютер замовлень");
    } else {
      this.hintText.setText('');
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  _near(a, b, r) {
    return Math.hypot(a.x - b.x, a.y - b.y) < r;
  }

  _showNotification(text) {
    const el = document.getElementById('notification');
    el.textContent = text;
    el.style.display = 'block';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  _floatText(text, x, y) {
    const t = this.add.text(x, y, text, {
      fontSize: '20px', color: '#00FF88', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 55, alpha: 0, duration: 1600,
      onComplete: () => t.destroy(),
    });
  }

  // ─── Update loop ──────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.orderOpen) return;

    const dt = delta / 1000;

    // Time: 1 real second = 1 game minute
    this.gameMin += dt;

    // Player movement
    const { left, right, up, down } = this.cursors;
    if (left.isDown)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (right.isDown) this.playerPos.x += PLAYER_SPEED * dt;
    if (up.isDown)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (down.isDown)  this.playerPos.y += PLAYER_SPEED * dt;

    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 25, 1000);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 65, 650);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    // Customers
    this.spawnTimer += delta;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer -= SPAWN_INTERVAL;
      this._spawnCustomer();
    }
    this._updateCustomers(dt);

    // Deliveries
    this._processDeliveries();

    // HUD
    this._updateHUD();

    // End of day: 20:00
    if (this.gameMin >= 20 * 60) {
      document.getElementById('notification').style.display = 'none';
      document.getElementById('order-panel').style.display = 'none';
      GameState.day++;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('CommuteScene', { destination: 'home' }));
    }
  }
}
