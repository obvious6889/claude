import { GameState } from '../state.js';
import { PRODUCTS, PRODUCTS_MAP } from '../data/products.js';

const EXIT_DOOR     = { x: 60,  y: 630 };
const PLAYER_START  = { x: 500, y: 620 };
const PLAYER_SPEED  = 190;
const INTERACTION_R = 80;
const CONV_Y        = 490;
const CONV_X1       = 80;
const CONV_X2       = 900;
const CONV_SPD      = 75;  // px per second

// Row 1 (y=180): fridge + first shelf items
const ROW1_IDS = ['milk','eggs','cream','cherries','bananas','bread','potato'];
// Row 2 (y=330): remaining shelf items
const ROW2_IDS = ['flour','cucumbers','tomatoes','pepper','salt','sugar'];

const SHELF_POS = {};
ROW1_IDS.forEach((id, i) => { SHELF_POS[id] = { x: 80 + i * 124, y: 190 }; });
ROW2_IDS.forEach((id, i) => { SHELF_POS[id] = { x: 122 + i * 140, y: 340 }; });

export default class BackRoomScene extends Phaser.Scene {
  constructor() { super({ key: 'BackRoomScene' }); }

  create() {
    this.playerPos    = { x: PLAYER_START.x, y: PLAYER_START.y };
    this.carrying     = null;
    this.convItems    = [];
    this.shipped      = {};   // { orderNum: { productId: count } }
    this.convTime     = 0;
    this.productSlots = {};
    this._hintTimer   = 0;
    this._typedNumber = '';

    this._drawRoom();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this._refreshOrderDisplay();

    this.events.on('wake', () => {
      this._arrowKeys.left = this._arrowKeys.right =
      this._arrowKeys.up   = this._arrowKeys.down  = false;
      this.playerPos = { x: PLAYER_START.x, y: PLAYER_START.y };
      this.playerSprite.setPosition(PLAYER_START.x, PLAYER_START.y);
      this.carrying = null;
      this.convItems = [];
      this.shipped = {};
      this._hintTimer = 0;
      this._typedNumber = '';
      this._updateNumberInput();
      this._refreshOrderDisplay();
    });
  }

  // ─── Room ────────────────────────────────────────────────────────────────

  _drawRoom() {
    const g = this.add.graphics();

    // Background
    g.fillStyle(0x1E1408); g.fillRect(0, 56, 1024, 644);
    g.fillStyle(0x2A1E0C); g.fillRect(0, 56, 1024, 430);
    g.fillStyle(0x3A2E1A); g.fillRect(0, 486, 1024, 214);

    // Floor planks
    g.lineStyle(1, 0x2A2210, 0.5);
    for (let x = 0; x < 1024; x += 90)  g.lineBetween(x, 486, x, 700);
    for (let y = 496; y < 700; y += 28)  g.lineBetween(0, y, 1024, y);

    // Shelf backboard row 1
    g.fillStyle(0x5C3E1A); g.fillRect(30, 148, 964, 96);
    g.lineStyle(2, 0x3A2810); g.strokeRect(30, 148, 964, 96);
    g.lineStyle(1, 0x7A5A2A, 0.4);
    g.lineBetween(30, 244, 994, 244);

    // Shelf backboard row 2
    g.fillStyle(0x5C3E1A); g.fillRect(30, 298, 964, 96);
    g.lineStyle(2, 0x3A2810); g.strokeRect(30, 298, 964, 96);
    g.lineStyle(1, 0x7A5A2A, 0.4);
    g.lineBetween(30, 394, 994, 394);

    // Conveyor belt base
    g.fillStyle(0x2A2A2A); g.fillRect(CONV_X1 - 12, CONV_Y - 12, CONV_X2 - CONV_X1 + 24, 40);

    // Rollers
    g.fillStyle(0x181818);
    for (let x = CONV_X1; x <= CONV_X2; x += 36) {
      g.fillRect(x - 2, CONV_Y - 12, 4, 40);
    }

    // Shipping box at the end of conveyor
    const bx = CONV_X2 + 12;
    g.fillStyle(0x7A4010); g.fillRect(bx, CONV_Y - 22, 56, 56);
    g.fillStyle(0x4A2808); g.fillRect(bx, CONV_Y - 22, 56, 5);
    g.fillStyle(0xFFD700, 0.3); g.fillRect(bx + 4, CONV_Y - 18, 48, 48);
    g.lineStyle(2, 0xFFD700, 0.6); g.strokeRect(bx, CONV_Y - 22, 56, 56);
    this.add.text(bx + 28, CONV_Y - 34, '📦 ВІДПРАВКА',
      { fontSize: '10px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);

    // Exit door
    g.fillStyle(0x3A6A2A); g.fillRect(EXIT_DOOR.x - 28, EXIT_DOOR.y - 40, 56, 72);
    g.lineStyle(2, 0x2A5A1A); g.strokeRect(EXIT_DOOR.x - 28, EXIT_DOOR.y - 40, 56, 72);
    this.add.text(EXIT_DOOR.x, EXIT_DOOR.y + 8, '← МАГАЗИН',
      { fontSize: '10px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5);

    // Product slots on both shelf rows
    PRODUCTS.forEach(p => {
      const pos = SHELF_POS[p.id];
      if (!pos) return;
      const slotG = this.add.graphics().setDepth(3);
      slotG.fillStyle(p.zone === 'fridge' ? 0xBBDDFF : 0xFFF4E0);
      slotG.fillRoundedRect(pos.x - 30, pos.y - 26, 60, 50, 5);
      slotG.lineStyle(2, p.color);
      slotG.strokeRoundedRect(pos.x - 30, pos.y - 26, 60, 50, 5);

      this.add.rectangle(pos.x, pos.y - 8, 36, 20, p.color).setDepth(4);
      this.add.text(pos.x, pos.y + 10, p.name,
        { fontSize: '8px', color: '#222', wordWrap: { width: 56 } })
        .setOrigin(0.5, 0).setDepth(4);

      const stockText = this.add.text(pos.x, pos.y - 28, `${GameState.stock[p.id]}`,
        { fontSize: '10px', color: '#004400', fontStyle: 'bold' })
        .setOrigin(0.5).setDepth(4);
      this.productSlots[p.id] = { stockText };
    });

    // Conveyor graphics object — redrawn every frame
    this.convG = this.add.graphics().setDepth(6);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    g.fillStyle(0x1A1A1A); g.fillRect(-13, 30, 11, 8); g.fillRect(2, 30, 11, 8);
    g.fillStyle(0x224488); g.fillRect(-11, 8, 9, 24); g.fillRect(2, 8, 9, 24);
    g.fillStyle(0x2255BB); g.fillRect(-13, -20, 26, 30);
    g.fillRect(-21, -18, 8, 22); g.fillRect(13, -18, 8, 22);
    g.fillStyle(0xFFCC99); g.fillCircle(-17, 5, 5); g.fillCircle(17, 5, 5);
    g.fillStyle(0xFFCC99); g.fillRect(-4, -28, 8, 10); g.fillCircle(0, -38, 12);
    g.fillStyle(0x4A2800); g.fillRect(-12, -50, 24, 14);
    g.fillStyle(0xF0EED8); g.fillRect(-9, -16, 18, 28);
    g.fillStyle(0xDDCCBB); g.fillRect(-6, -26, 12, 10);
    this.playerSprite = this.add.container(PLAYER_START.x, PLAYER_START.y, [g]).setDepth(10);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x080818, 0.95); bg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 10, '🏠 СКЛАД',
      { fontSize: '18px', color: '#FFD700', fontStyle: 'bold' }).setDepth(21);

    this.earningsText = this.add.text(200, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold' }).setDepth(21);

    this.orderHeadText = this.add.text(512, 6, '',
      { fontSize: '13px', color: '#AADDFF', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(21);

    this.orderItemsText = this.add.text(512, 28, '',
      { fontSize: '12px', color: '#FFE066' })
      .setOrigin(0.5, 0).setDepth(21);

    this.orderCountText = this.add.text(1010, 10, '',
      { fontSize: '13px', color: '#88BBFF' }).setOrigin(1, 0).setDepth(21);

    this.completeBtnBg = this.add.graphics().setDepth(21);
    this.completeBtnText = this.add.text(880, 36, '✔ ЗАКІНЧИТИ ЗАМОВЛЕННЯ',
      { fontSize: '13px', color: '#fff', fontStyle: 'bold' })
      .setOrigin(0, 0.5).setDepth(22)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.completeBtnBg.clear();
        this.completeBtnBg.fillStyle(0x2A7A2A); this.completeBtnBg.fillRoundedRect(874, 26, 138, 20, 5);
      })
      .on('pointerout', () => {
        this.completeBtnBg.clear();
        this.completeBtnBg.fillStyle(0x1A5A1A); this.completeBtnBg.fillRoundedRect(874, 26, 138, 20, 5);
      })
      .on('pointerdown', () => this._completeOrder());
    this.completeBtnBg.fillStyle(0x1A5A1A);
    this.completeBtnBg.fillRoundedRect(874, 26, 138, 20, 5);

    this.numberInputDisplay = this.add.text(490, 550, '',
      { fontSize: '26px', color: '#FFD700', backgroundColor: '#000000CC',
        padding: { x: 14, y: 8 }, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(24).setVisible(false);

    this.hintText = this.add.text(512, 672, '',
      { fontSize: '14px', color: '#FFFF44', backgroundColor: '#00000099',
        padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(22);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    this._arrowKeys = { left: false, right: false, up: false, down: false };
    const onKeyDown = (e) => {
      if (e.code === 'ArrowLeft')  { this._arrowKeys.left  = true; e.preventDefault(); return; }
      if (e.code === 'ArrowRight') { this._arrowKeys.right = true; e.preventDefault(); return; }
      if (e.code === 'ArrowUp')    { this._arrowKeys.up    = true; e.preventDefault(); return; }
      if (e.code === 'ArrowDown')  { this._arrowKeys.down  = true; e.preventDefault(); return; }
      if (e.key >= '0' && e.key <= '9') {
        this._typedNumber += e.key;
        this._updateNumberInput();
        e.preventDefault();
      }
      if (e.code === 'Backspace') {
        this._typedNumber = this._typedNumber.slice(0, -1);
        this._updateNumberInput();
        e.preventDefault();
      }
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
      this._typedNumber = '';
      if (this.numberInputDisplay) this.numberInputDisplay.setVisible(false);
    });

    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.enterKey.on('down', () => this._handleEnter());
  }

  // ─── Logic ────────────────────────────────────────────────────────────────

  _handleEnter() {
    // Exit back to shop
    if (this._near(this.playerPos, EXIT_DOOR, INTERACTION_R)) {
      this._exitToShop();
      return;
    }

    const orders = GameState.homeOrders;

    // Place item on conveyor — requires typed order number
    const onConveyor = this.playerPos.y >= CONV_Y - INTERACTION_R
                    && this.playerPos.x >  CONV_X1 - 30
                    && this.playerPos.x <  CONV_X2 + 30;
    if (this.carrying && onConveyor) {
      if (!orders.length) { this._showHint('Немає замовлень!'); return; }
      if (!this._typedNumber) {
        this._showHint('Введи номер замовлення цифрами + ENTER');
        return;
      }
      const orderNum = parseInt(this._typedNumber, 10);
      const order = orders.find(o => o.orderNum === orderNum);
      if (!order) {
        this._showHint(`Замовлення #${orderNum} не існує`);
        this._typedNumber = '';
        this._updateNumberInput();
        return;
      }
      const shippedForOrder = this.shipped[orderNum] || {};
      const needed = order.items.find(i =>
        i.productId === this.carrying.productId &&
        (shippedForOrder[i.productId] || 0) < i.qty
      );
      if (!needed) {
        this._showHint(`${PRODUCTS_MAP[this.carrying.productId].name} — не потрібен для #${orderNum}`);
        return;
      }
      this.convItems.push({
        x: CONV_X1 + 20,
        productId: this.carrying.productId,
        color: PRODUCTS_MAP[this.carrying.productId].color,
        name:  PRODUCTS_MAP[this.carrying.productId].name,
        orderNum,
      });
      this.carrying = null;
      this._typedNumber = '';
      this._updateNumberInput();
      return;
    }

    // Pick up from shelf — any order that needs this product
    if (!this.carrying && orders.length > 0) {
      for (const p of PRODUCTS) {
        const pos = SHELF_POS[p.id];
        if (!pos || !this._near(this.playerPos, pos, INTERACTION_R)) continue;
        const anyNeeds = orders.some(o =>
          o.items.some(i => i.productId === p.id &&
            ((this.shipped[o.orderNum] || {})[p.id] || 0) < i.qty)
        );
        if (!anyNeeds) {
          this._showHint(`${PRODUCTS_MAP[p.id].name} — не потрібен жодному замовленню`);
          return;
        }
        if (GameState.stock[p.id] <= 0) {
          this._showHint(`${PRODUCTS_MAP[p.id].name} — немає на складі`);
          return;
        }
        GameState.stock[p.id]--;
        this._updateSlot(p.id);
        this.carrying = { productId: p.id };
        return;
      }
    }
  }

  _updateNumberInput() {
    if (this._typedNumber.length > 0) {
      this.numberInputDisplay.setText(`Замовлення #: ${this._typedNumber}_`).setVisible(true);
    } else {
      this.numberInputDisplay.setVisible(false);
    }
  }

  _exitToShop() {
    if (this.carrying) {
      GameState.stock[this.carrying.productId]++;
      this.carrying = null;
    }
    this.scene.switch('ShopScene');
  }

  _updateSlot(id) {
    const slot = this.productSlots[id];
    if (!slot) return;
    const s = GameState.stock[id];
    slot.stockText.setText(`${s}`);
    slot.stockText.setColor(s < 5 ? '#FF4400' : '#004400');
  }

  _near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }

  _showHint(txt) { this.hintText.setText(txt); this._hintTimer = 150; }

  _refreshOrderDisplay() {
    const orders = GameState.homeOrders;
    const total  = orders.length;
    this.orderCountText.setText(total > 0 ? `${total} замовл.` : '');

    this.completeBtnText.setVisible(total > 0);
    this.completeBtnBg.setVisible(total > 0);

    if (!orders.length) {
      this.orderHeadText.setText('Немає замовлень — поверніться до магазину');
      this.orderItemsText.setText('');
      return;
    }

    // Show up to 3 orders in the header
    const summaries = orders.slice(0, 3).map(o => {
      const sf = this.shipped[o.orderNum] || {};
      const parts = o.items.map(i => {
        const done = (sf[i.productId] || 0) >= i.qty;
        return done ? `✓${PRODUCTS_MAP[i.productId].name}` : PRODUCTS_MAP[i.productId].name;
      });
      return `#${o.orderNum}: ${parts.join(',')}  ${o.earn.toFixed(2)}€`;
    });
    this.orderHeadText.setText(summaries.join('    '));
    this.orderItemsText.setText(total > 3 ? `... ще ${total - 3}` : '');
  }

  _checkOrderComplete(orderNum) {
    const order = GameState.homeOrders.find(o => o.orderNum === orderNum);
    if (!order) return;
    const sf = this.shipped[orderNum] || {};
    const done = order.items.every(i => (sf[i.productId] || 0) >= i.qty);
    if (!done) return;

    GameState.earnings += order.earn;
    this._floatText(`🏠 +${order.earn.toFixed(2)} € Замовлення #${orderNum} відправлено!`, 512, 440);
    GameState.homeOrders = GameState.homeOrders.filter(o => o.orderNum !== orderNum);
    delete this.shipped[orderNum];
    this._refreshOrderDisplay();
  }

  _completeOrder() {
    const orders = GameState.homeOrders;
    if (!orders.length) return;

    // Use typed number to pick which order, otherwise take the first
    const orderNum = this._typedNumber
      ? parseInt(this._typedNumber, 10)
      : orders[0].orderNum;
    const order = orders.find(o => o.orderNum === orderNum);
    if (!order) {
      this._showHint(`Замовлення #${orderNum} не знайдено`);
      return;
    }

    // Count conveyor items for this order as shipped
    const sf = this.shipped[orderNum] || {};
    for (const ci of this.convItems.filter(c => c.orderNum === orderNum)) {
      const needed = order.items.find(i => i.productId === ci.productId && (sf[i.productId] || 0) < i.qty);
      if (needed) sf[ci.productId] = (sf[ci.productId] || 0) + 1;
    }
    this.convItems = this.convItems.filter(c => c.orderNum !== orderNum);

    // Return carried item to stock
    if (this.carrying) {
      GameState.stock[this.carrying.productId]++;
      this.carrying = null;
    }

    const totalQty   = order.items.reduce((s, i) => s + i.qty, 0);
    const shippedQty = order.items.reduce((s, i) => s + Math.min(i.qty, sf[i.productId] || 0), 0);
    const earn = totalQty > 0 ? (shippedQty / totalQty) * order.earn : 0;

    if (earn > 0) {
      GameState.earnings += earn;
      this._floatText(`🏠 +${earn.toFixed(2)} € Відправлено #${orderNum}!`, 512, 440);
    } else {
      this._floatText(`❌ Замовлення #${orderNum} скасовано`, 512, 440);
    }

    GameState.homeOrders = GameState.homeOrders.filter(o => o.orderNum !== orderNum);
    delete this.shipped[orderNum];
    this._typedNumber = '';
    this._updateNumberInput();
    this._refreshOrderDisplay();
  }

  _floatText(text, x, y) {
    const t = this.add.text(x, y, text, {
      fontSize: '22px', color: '#00FF88', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 2200,
      onComplete: () => t.destroy() });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    const dt = delta / 1000;
    this.convTime += dt;

    // Player movement
    if (this._arrowKeys.left)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (this._arrowKeys.right) this.playerPos.x += PLAYER_SPEED * dt;
    if (this._arrowKeys.up)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (this._arrowKeys.down)  this.playerPos.y += PLAYER_SPEED * dt;
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 25, 1000);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 140, 685);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    // Move conveyor items
    const arrived = [];
    this.convItems.forEach(ci => { ci.x += CONV_SPD * dt; if (ci.x >= CONV_X2) arrived.push(ci); });
    this.convItems = this.convItems.filter(ci => ci.x < CONV_X2);
    arrived.forEach(ci => {
      if (!this.shipped[ci.orderNum]) this.shipped[ci.orderNum] = {};
      this.shipped[ci.orderNum][ci.productId] = (this.shipped[ci.orderNum][ci.productId] || 0) + 1;
      this._checkOrderComplete(ci.orderNum);
      this._refreshOrderDisplay();
    });

    // Draw conveyor belt (animated stripes + items)
    this.convG.clear();
    const sw = 24, offset = (this.convTime * 50) % (sw * 2);
    this.convG.fillStyle(0x555555);
    this.convG.fillRect(CONV_X1, CONV_Y - 5, CONV_X2 - CONV_X1, 26);
    this.convG.fillStyle(0x666666);
    for (let x = CONV_X1 - sw * 2 + offset; x < CONV_X2; x += sw * 2) {
      const x1 = Math.max(x, CONV_X1), x2 = Math.min(x + sw, CONV_X2);
      if (x2 > x1) this.convG.fillRect(x1, CONV_Y - 5, x2 - x1, 26);
    }
    this.convItems.forEach(ci => {
      this.convG.fillStyle(ci.color);
      this.convG.fillRoundedRect(ci.x - 13, CONV_Y - 2, 26, 20, 4);
    });

    // Hint text
    this.earningsText.setText(`${GameState.earnings.toFixed(2)} €`);
    if (this._hintTimer > 0) {
      this._hintTimer -= delta / 16;
      if (this._hintTimer <= 0) this.hintText.setText('');
    } else {
      this._updateHint();
    }
  }

  _updateHint() {
    if (this._near(this.playerPos, EXIT_DOOR, INTERACTION_R)) {
      this.hintText.setText('ENTER — повернутись до магазину');
      return;
    }
    const orders = GameState.homeOrders;
    if (this.carrying) {
      const onConveyor = this.playerPos.y >= CONV_Y - INTERACTION_R
                      && this.playerPos.x > CONV_X1 - 30
                      && this.playerPos.x < CONV_X2 + 30;
      if (onConveyor) {
        this.hintText.setText(this._typedNumber
          ? `ENTER — покласти ${PRODUCTS_MAP[this.carrying.productId].name} для замовлення #${this._typedNumber}`
          : `Введи номер замовлення + ENTER щоб покласти ${PRODUCTS_MAP[this.carrying.productId].name}`);
      } else {
        this.hintText.setText(`Несеш ${PRODUCTS_MAP[this.carrying.productId].name} → підійди до конвеєра`);
      }
      return;
    }
    for (const p of PRODUCTS) {
      const pos = SHELF_POS[p.id];
      if (!pos || !this._near(this.playerPos, pos, INTERACTION_R)) continue;
      const anyNeeds = orders.some(o =>
        o.items.some(i => i.productId === p.id && ((this.shipped[o.orderNum] || {})[p.id] || 0) < i.qty)
      );
      if (anyNeeds) {
        this.hintText.setText(`ENTER — взяти ${PRODUCTS_MAP[p.id].name}`);
        return;
      }
    }
    this.hintText.setText('');
  }
}
