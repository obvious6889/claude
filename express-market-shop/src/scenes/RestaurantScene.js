import { GameState, LEVEL_CONFIG } from '../state.js';

const PLAYER_SPEED = 175;
const IR = 88; // interaction radius

const DISHES = [
  { id: 'borsch',   emoji: '🍲', name: 'Борщ',     price: 3.50, cookSec: 2.5 },
  { id: 'pizza',    emoji: '🍕', name: 'Піца',     price: 5.00, cookSec: 4.0 },
  { id: 'varenyky', emoji: '🥟', name: 'Вареники', price: 4.00, cookSec: 3.0 },
  { id: 'kava',     emoji: '☕', name: 'Кава',     price: 1.50, cookSec: 1.0 },
  { id: 'salat',    emoji: '🥗', name: 'Салат',    price: 2.50, cookSec: 1.5 },
];

const STATION_Y = 165;
const STATION_XS = [108, 264, 420, 576, 732];

const TABLES = [
  { x: 175, y: 415 }, { x: 450, y: 415 }, { x: 725, y: 415 },
  { x: 310, y: 570 }, { x: 590, y: 570 }, { x: 860, y: 570 },
];

const MAX_WAIT    = 30000;
const IMPATIENT   = 20000;
const EAT_TIME    = 3500;
const SPAWN_RATES = [null, 9500, 7500, 5500];

export default class RestaurantScene extends Phaser.Scene {
  constructor() { super({ key: 'RestaurantScene' }); }

  create() {
    this.playerPos    = { x: 450, y: 490 };
    this.customers    = [];
    this.pendingOrder = null;   // { dishId, tableIdx }
    this.carrying     = null;   // { dishId, tableIdx }
    this.activeCooking = null;  // { stationIdx, timer, maxTimer, dishId, tableIdx }
    this.served       = 0;
    this.spawned      = 0;
    this.todayMax     = LEVEL_CONFIG[GameState.level].customers;
    this.done         = false;
    this._spawnTimer  = 2000;   // first customer after 2s

    this._drawBackground();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this.cameras.main.fadeIn(400);
  }

  // ─── Background ─────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this.add.graphics();

    // Kitchen floor (tiles)
    g.fillStyle(0xEEDDCC); g.fillRect(0, 56, 1024, 205);
    g.lineStyle(1, 0xDDCCBB, 0.5);
    for (let x = 0; x < 1024; x += 64) g.strokeRect(x, 56, 1, 205);
    for (let y = 56; y < 261; y += 64) g.strokeRect(0, y, 1024, 1);

    // Back kitchen wall
    g.fillStyle(0xF5F0E8); g.fillRect(0, 56, 1024, 36);
    g.fillStyle(0x8B5E3C); g.fillRect(0, 56, 1024, 6);

    // Cooking stations
    DISHES.forEach((dish, i) => {
      const sx = STATION_XS[i];
      g.fillStyle(0x777777); g.fillRect(sx-38, STATION_Y-34, 76, 68);
      g.fillStyle(0x444444); g.fillRect(sx-35, STATION_Y-31, 70, 62);
      g.fillStyle(0x1A1A1A);
      [-14, 14].forEach(ox => [-10, 12].forEach(oy => g.fillCircle(sx+ox, STATION_Y+oy, 10)));
      g.fillStyle(0x2A2A2A);
      [-14, 14].forEach(ox => [-10, 12].forEach(oy => g.fillCircle(sx+ox, STATION_Y+oy, 6)));
      this.add.text(sx, STATION_Y+39, dish.emoji, { fontSize: '20px' }).setOrigin(0.5, 0);
      this.add.text(sx, STATION_Y+64, dish.name,  { fontSize: '10px', color: '#664422', fontStyle: 'bold' }).setOrigin(0.5, 0);
    });

    // Counter
    g.fillStyle(0x9B7A4E); g.fillRect(0, 261, 1024, 34);
    g.fillStyle(0xBB9A6E); g.fillRect(0, 261, 1024, 9);
    // Pass-through gap in counter
    g.fillStyle(0xEEDDCC); g.fillRect(444, 261, 136, 34);
    g.lineStyle(2, 0x7A5A2E); g.strokeRect(444, 261, 136, 34);
    this.add.text(512, 271, '↑ КУХНЯ', { fontSize: '11px', color: '#AA7744', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Dining floor
    g.fillStyle(0xF8EED8); g.fillRect(0, 295, 1024, 405);
    g.lineStyle(1, 0xEADBC2, 0.5);
    for (let x = 0; x < 1024; x += 80) g.strokeRect(x, 295, 1, 405);
    for (let y = 295; y < 700; y += 80) g.strokeRect(0, y, 1024, 1);

    // Tables + chairs
    TABLES.forEach(({ x, y }) => {
      // Chairs
      g.fillStyle(0x6B4A2A);
      g.fillRect(x-48, y-18, 12, 36);
      g.fillRect(x+36, y-18, 12, 36);
      g.fillRect(x-22, y-42, 44, 12);
      g.fillRect(x-22, y+30, 44, 12);
      // Table
      g.fillStyle(0x8B5E3C); g.fillRect(x-42, y-30, 84, 60);
      g.fillStyle(0xAA7744); g.fillRect(x-39, y-27, 78, 54);
      // Table legs
      g.fillStyle(0x6B3A1A);
      g.fillRect(x-36, y+20, 8, 12); g.fillRect(x+28, y+20, 8, 12);
      g.fillRect(x-36, y-32, 8, 12); g.fillRect(x+28, y-32, 8, 12);
    });

    // Entry/exit door
    g.fillStyle(0x5A8A3A); g.fillRect(466, 668, 92, 32);
    g.lineStyle(2, 0x3A6A2A); g.strokeRect(466, 668, 92, 32);
    this.add.text(512, 684, 'ВХІД/ВИХІД', { fontSize: '10px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);

    // Restaurant sign
    this.add.text(512, 73, '🍽 РЕСТОРАН «СМАЧНОГО!»', {
      fontSize: '16px', color: '#8B5E3C', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Cooking bar and ready-text graphics (updated each frame)
    this.cookBarG = this.add.graphics().setDepth(9);
    this.cookReadyText = this.add.text(0, 0, '', {
      fontSize: '14px', color: '#00FF88', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(9);
  }

  // ─── Player ─────────────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    // Shoes
    g.fillStyle(0x1A1A1A); g.fillRect(-13, 30, 11, 8); g.fillRect(2, 30, 11, 8);
    // Pants
    g.fillStyle(0x224488); g.fillRect(-11, 8, 9, 24); g.fillRect(2, 8, 9, 24);
    // Apron (white top)
    g.fillStyle(0xFFFFFF); g.fillRect(-13, -20, 26, 30);
    // Arms (skin)
    g.fillStyle(0xFFCC99); g.fillCircle(-17, 5, 5); g.fillCircle(17, 5, 5);
    // Head
    g.fillStyle(0xFFCC99); g.fillCircle(0, -30, 12);
    // Chef hat
    g.fillStyle(0xFFFFFF); g.fillRect(-10, -46, 20, 18); g.fillRect(-6, -56, 12, 12);
    g.lineStyle(1, 0xCCCCCC); g.strokeRect(-10, -46, 20, 18);

    this.playerSprite = this.add.container(this.playerPos.x, this.playerPos.y, [g]).setDepth(10);
    this.carryText    = this.add.text(0, 0, '', { fontSize: '22px' }).setDepth(11);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.95); bg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, `🍽 Ресторан — День ${GameState.day}`,
      { fontSize: '20px', color: '#FF88CC', fontStyle: 'bold' }).setDepth(21);

    this.moneyText = this.add.text(1008, 8, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '20px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    this.add.text(1008, 32, `Ціль: ${goal} €`,
      { fontSize: '12px', color: '#88BBFF' }).setOrigin(1, 0).setDepth(21);

    this.taskText = this.add.text(512, 9, '',
      { fontSize: '14px', color: '#FFDD88', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(21);
    this.servedText = this.add.text(512, 30, '',
      { fontSize: '11px', color: '#AADDFF' }).setOrigin(0.5, 0).setDepth(21);

    const hb = this.add.graphics().setDepth(20);
    hb.fillStyle(0x0a0a1a, 0.9); hb.fillRect(0, 660, 1024, 40);
    this.add.text(512, 670,
      '↑ ↓ ← →  рух   |   E — взаємодіяти   |   C — кінець зміни',
      { fontSize: '13px', color: '#FFFF88' }).setOrigin(0.5, 0).setDepth(21);

    this.hintText = this.add.text(512, 632, '',
      { fontSize: '14px', color: '#FF8844', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 } })
      .setOrigin(0.5).setDepth(22);
  }

  _updateHUD() {
    this.moneyText.setText(`${GameState.earnings.toFixed(2)} €`);
    this.servedText.setText(`Обслужено: ${this.served}/${this.todayMax}`);

    let task = '';
    if (this.carrying) {
      const d = DISHES.find(x => x.id === this.carrying.dishId);
      task = `Несеш ${d.emoji} → Стіл ${this.carrying.tableIdx + 1}`;
    } else if (this.activeCooking) {
      const d = DISHES[this.activeCooking.stationIdx];
      if (this.activeCooking.timer >= this.activeCooking.maxTimer) {
        task = `${d.emoji} готово! Підійди до станції «${d.name}»`;
      } else {
        const left = ((this.activeCooking.maxTimer - this.activeCooking.timer) / 1000).toFixed(1);
        task = `Готується ${d.emoji} ${d.name}... (${left}с)`;
      }
    } else if (this.pendingOrder) {
      const d = DISHES.find(x => x.id === this.pendingOrder.dishId);
      const si = DISHES.findIndex(x => x.id === this.pendingOrder.dishId) + 1;
      task = `Замовлення: ${d.emoji} ${d.name} — готуй (${si}-а станція)`;
    } else if (this.customers.some(c => c.state === 'waiting')) {
      task = 'E — підійди та прийми замовлення';
    } else if (this.spawned < this.todayMax) {
      task = 'Чекай гостей...';
    } else {
      task = 'C — кінець зміни, їхати додому';
    }
    this.taskText.setText(task);

    const allDone = this.spawned >= this.todayMax && this.customers.length === 0;
    this.hintText.setText(allDone ? '✓ Зміна завершена! C — їхати додому' : '');
  }

  // ─── Input ──────────────────────────────────────────────────────────────────

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey('E').on('down', () => this._handleE());
    this.input.keyboard.addKey('C').on('down', () => this._goHome());
  }

  _handleE() {
    if (this.done) return;

    // 1. Serve: carrying dish and near matching customer
    if (this.carrying) {
      const tbl = TABLES[this.carrying.tableIdx];
      const c = this.customers.find(cu =>
        cu.tableIdx === this.carrying.tableIdx &&
        cu.state === 'ordered' &&
        Math.hypot(this.playerPos.x - tbl.x, this.playerPos.y - tbl.y) < IR);
      if (c) {
        const d = DISHES.find(x => x.id === this.carrying.dishId);
        c.state = 'eating';
        c.eatTimer = EAT_TIME;
        c.bubbleText.setText('😊✨');
        GameState.earnings = parseFloat((GameState.earnings + d.price).toFixed(2));
        this.served++;
        this.carrying = null;
        this._updateHUD();
        return;
      }
    }

    // 2. Pick up finished dish
    if (this.activeCooking && this.activeCooking.timer >= this.activeCooking.maxTimer) {
      const si = this.activeCooking.stationIdx;
      if (Math.hypot(this.playerPos.x - STATION_XS[si], this.playerPos.y - STATION_Y) < IR) {
        this.carrying     = { dishId: this.activeCooking.dishId, tableIdx: this.activeCooking.tableIdx };
        this.activeCooking = null;
        this.pendingOrder  = null;
        this._updateHUD();
        return;
      }
    }

    // 3. Start cooking
    if (this.pendingOrder && !this.activeCooking && !this.carrying) {
      const si = DISHES.findIndex(d => d.id === this.pendingOrder.dishId);
      if (Math.hypot(this.playerPos.x - STATION_XS[si], this.playerPos.y - STATION_Y) < IR) {
        const d = DISHES[si];
        this.activeCooking = {
          stationIdx: si,
          dishId:     d.id,
          tableIdx:   this.pendingOrder.tableIdx,
          timer:      0,
          maxTimer:   d.cookSec * 1000,
        };
        this._updateHUD();
        return;
      }
    }

    // 4. Take order
    if (!this.pendingOrder && !this.carrying && !this.activeCooking) {
      let best = null, bestDist = IR;
      this.customers.forEach(c => {
        if (c.state !== 'waiting') return;
        const dist = Math.hypot(this.playerPos.x - TABLES[c.tableIdx].x, this.playerPos.y - TABLES[c.tableIdx].y);
        if (dist < bestDist) { bestDist = dist; best = c; }
      });
      if (best) {
        best.state = 'ordered';
        best.bubbleText.setText('⏳');
        this.pendingOrder = { dishId: best.dishId, tableIdx: best.tableIdx };
        this._updateHUD();
      }
    }
  }

  // ─── Customer spawning ───────────────────────────────────────────────────────

  _spawnCustomer() {
    if (this.spawned >= this.todayMax) return;
    const emptyIdx = TABLES.findIndex((_, ti) =>
      !this.customers.some(c => c.tableIdx === ti));
    if (emptyIdx === -1) return;

    this.spawned++;
    const dish = DISHES[Math.floor(Math.random() * DISHES.length)];
    const tbl  = TABLES[emptyIdx];

    const bodyG = this.add.graphics().setDepth(7);
    this._drawCustomerBody(bodyG, tbl.x, tbl.y, 0xFFCC99, 0x3355AA);

    const bubbleText = this.add.text(tbl.x, tbl.y - 50, dish.emoji, {
      fontSize: '22px', backgroundColor: '#FFFFFFDD',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(8);

    this.customers.push({
      tableIdx:  emptyIdx,
      state:     'waiting',
      dishId:    dish.id,
      waitTimer: 0,
      eatTimer:  0,
      bodyG,
      bubbleText,
    });
  }

  _drawCustomerBody(g, x, y, skinColor, shirtColor) {
    g.clear();
    g.fillStyle(0x1A1A1A); g.fillRect(x-10, y+18, 8, 6); g.fillRect(x+2, y+18, 8, 6);
    g.fillStyle(0x224488);  g.fillRect(x-9,  y+4,  7, 16); g.fillRect(x+2, y+4, 7, 16);
    g.fillStyle(shirtColor); g.fillRect(x-11, y-14, 22, 20);
    g.fillStyle(skinColor);  g.fillCircle(x, y-22, 11);
    g.fillStyle(0x3A1A00);   g.fillRect(x-11, y-36, 22, 10);
  }

  _removeCustomer(c) {
    if (!this.customers.includes(c)) return;
    c.bodyG.destroy();
    c.bubbleText.destroy();
    if (this.pendingOrder?.tableIdx === c.tableIdx) this.pendingOrder = null;
    if (this.activeCooking?.tableIdx === c.tableIdx) this.activeCooking = null;
    if (this.carrying?.tableIdx === c.tableIdx)      this.carrying = null;
    this.customers.splice(this.customers.indexOf(c), 1);
    this._updateHUD();
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this.done) return;
    const dt = delta / 1000;

    // Player movement
    const { left, right, up, down } = this.cursors;
    if (left.isDown)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (right.isDown) this.playerPos.x += PLAYER_SPEED * dt;
    if (up.isDown)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (down.isDown)  this.playerPos.y += PLAYER_SPEED * dt;
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 22, 1002);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 66, 650);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    // Carry indicator above player
    if (this.carrying) {
      const d = DISHES.find(x => x.id === this.carrying.dishId);
      this.carryText.setText(d.emoji).setPosition(this.playerPos.x + 8, this.playerPos.y - 54);
    } else {
      this.carryText.setText('');
    }

    // Customer AI
    for (const c of [...this.customers]) {
      if (c.state === 'waiting') {
        c.waitTimer += delta;
        if (c.waitTimer > IMPATIENT && c.waitTimer - delta <= IMPATIENT) {
          // Turn red when impatient
          this._drawCustomerBody(c.bodyG, TABLES[c.tableIdx].x, TABLES[c.tableIdx].y, 0xFF6666, 0xAA2222);
          c.bubbleText.setStyle({ backgroundColor: '#FF444488' });
        }
        if (c.waitTimer >= MAX_WAIT) {
          c.state = 'leaving';
          c.bubbleText.setText('😤');
          this.time.delayedCall(700, () => this._removeCustomer(c));
        }
      } else if (c.state === 'eating') {
        c.eatTimer -= delta;
        if (c.eatTimer <= 0) {
          c.state = 'leaving';
          c.bubbleText.setText('😋👍');
          this.time.delayedCall(800, () => this._removeCustomer(c));
        }
      }
    }

    // Cooking timer
    this.cookBarG.clear();
    this.cookReadyText.setText('');
    if (this.activeCooking) {
      this.activeCooking.timer = Math.min(this.activeCooking.timer + delta, this.activeCooking.maxTimer);
      const pct = this.activeCooking.timer / this.activeCooking.maxTimer;
      const si  = this.activeCooking.stationIdx;
      const bx  = STATION_XS[si] - 32, by = STATION_Y - 48;
      this.cookBarG.fillStyle(0x222222); this.cookBarG.fillRect(bx, by, 64, 8);
      this.cookBarG.fillStyle(pct >= 1 ? 0x00FF88 : 0xFF8800);
      this.cookBarG.fillRect(bx, by, Math.floor(64 * pct), 8);
      if (pct >= 1) {
        this.cookReadyText.setText('✓ ГОТОВО!').setPosition(STATION_XS[si], by - 18);
      }
    }

    // Customer spawner
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = SPAWN_RATES[GameState.level] || 9500;
      this._spawnCustomer();
    }

    this._updateHUD();
  }

  _goHome() {
    if (this.done) return;
    this.done = true;
    GameState.day++;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start('CommuteScene', { destination: 'home' }));
  }
}
