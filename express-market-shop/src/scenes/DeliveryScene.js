import { GameState, LEVEL_CONFIG } from '../state.js';
import { UPGRADES } from '../data/upgrades.js';
import { playSound } from '../utils/sound.js';

const BASE_SPEED   = 195;
const TURN_RATE    = 130;
const ACCEL        = 260;
const DECEL        = 190;
const INTERACT_R   = 62;
const TIP_DURATION = 22000;

const DELIVERIES_PER_DAY = [null, 4, 6, 9];
const BASE_PAY           = [null, 11, 14, 18];
const MAX_TIP_TABLE      = [null, 6,  8,  11];

const ROAD_W  = 42;
const H_ROADS = [216, 412, 578];
const V_ROADS = [228, 498, 758];

const DEPOT = { x: 112, y: 133 };

const ALL_ADDR = [
  { x: 364, y: 133, name: 'вул. Шкільна, 3',    emoji: '🏡' },
  { x: 629, y: 133, name: 'пр. Миру, 15',        emoji: '🏠' },
  { x: 893, y: 133, name: 'вул. Садова, 7',      emoji: '🏘' },
  { x: 112, y: 314, name: 'вул. Центральна, 4',  emoji: '🏡' },
  { x: 893, y: 314, name: 'вул. Лісова, 22',     emoji: '🏠' },
  { x: 364, y: 494, name: 'вул. Паркова, 9',     emoji: '🏘' },
  { x: 629, y: 494, name: 'вул. Річна, 1',       emoji: '🏡' },
  { x: 893, y: 494, name: 'вул. Квіткова, 16',   emoji: '🏠' },
];

const BLOCK_COLORS = [
  0xCC8844, 0x8899CC, 0xCC6644, 0x88AA66,
  0x9988BB, 0xCCAA44, 0x88BBAA, 0xCC8866,
  0x8899CC, 0xBBAA88, 0xAA88BB, 0x88AA88,
];

export default class DeliveryScene extends Phaser.Scene {
  constructor() { super({ key: 'DeliveryScene' }); }

  create() {
    this.done          = false;
    this.totalDel      = DELIVERIES_PER_DAY[GameState.level] || 4;
    this.delivered     = 0;
    this.currentOrder  = null;
    this.tipTimer      = 0;
    this.playerPos     = { x: DEPOT.x + 30, y: DEPOT.y + 80 };
    this.angle         = 90;   // facing south at start
    this.speed         = 0;
    this._pulse        = 0;
    GameState.fedBonus = false;

    this._drawMap();
    this._createPlayer();
    this._createHUD();
    this._createUpgradePanel();
    this._setupInput();
    this.time.delayedCall(500, () => this._nextOrder());
    this.cameras.main.fadeIn(400);
  }

  // ─── Map ──────────────────────────────────────────────────────────────────

  _drawMap() {
    const g = this.add.graphics();

    // Grass
    g.fillStyle(0x4A8A3A); g.fillRect(0, 56, 1024, 610);

    // Roads (horizontal)
    H_ROADS.forEach(ry => {
      g.fillStyle(0x777777); g.fillRect(0, ry - ROAD_W/2 - 3, 1024, ROAD_W + 6);
      g.fillStyle(0x555555); g.fillRect(0, ry - ROAD_W/2, 1024, ROAD_W);
      g.fillStyle(0xFFFFFF, 0.45);
      for (let x = 30; x < 1024; x += 72) g.fillRect(x, ry - 2, 42, 4);
    });

    // Roads (vertical)
    V_ROADS.forEach(vx => {
      g.fillStyle(0x777777); g.fillRect(vx - ROAD_W/2 - 3, 56, ROAD_W + 6, 610);
      g.fillStyle(0x555555); g.fillRect(vx - ROAD_W/2, 56, ROAD_W, 610);
      g.fillStyle(0xFFFFFF, 0.45);
      for (let y = 80; y < 670; y += 72) g.fillRect(vx - 2, y, 4, 42);
    });

    // Building blocks
    const hSegs = [58, 195, 237, 391, 433, 557, 599, 666];
    const vSegs = [0,  207, 249, 477, 519, 737, 779, 1024];
    let ci = 0;
    for (let ri = 0; ri < hSegs.length - 1; ri += 2) {
      const by = hSegs[ri], bh = hSegs[ri + 1] - by;
      if (bh < 48) continue;
      for (let ci2 = 0; ci2 < vSegs.length - 1; ci2 += 2) {
        const bx = vSegs[ci2], bw = vSegs[ci2 + 1] - bx;
        if (bw < 36) continue;
        if (ri === 0 && ci2 === 0) { ci++; continue; } // depot block — skip
        const col = BLOCK_COLORS[ci % BLOCK_COLORS.length];
        g.fillStyle(col, 0.55); g.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
        for (let bx2 = bx + 10; bx2 < bx + bw - 44; bx2 += 52) {
          for (let by2 = by + 10; by2 < by + bh - 32; by2 += 44) {
            g.fillStyle(col); g.fillRect(bx2, by2, 40, 30);
            g.lineStyle(1, 0x000000, 0.18); g.strokeRect(bx2, by2, 40, 30);
            g.fillStyle(0x88CCFF, 0.5);
            if (bw > 56 && bh > 44) {
              g.fillRect(bx2 + 4, by2 + 4, 10, 8);
              g.fillRect(bx2 + 22, by2 + 4, 10, 8);
            }
          }
        }
        ci++;
      }
    }

    // Trees
    const rnd = (i, s) => Math.abs(Math.sin(i * 127.3 + s * 311.7));
    for (let i = 0; i < 28; i++) {
      const tx = 20 + rnd(i, 0) * 984;
      const ty = 60 + rnd(i, 1) * 590;
      if (this._onRoad(tx, ty, 28) || Math.hypot(tx - DEPOT.x, ty - DEPOT.y) < 68) continue;
      g.fillStyle(0x2E7D32); g.fillCircle(tx, ty, 15);
      g.fillStyle(0x43A047); g.fillCircle(tx, ty, 11);
      g.fillStyle(0x5A3810); g.fillRect(tx - 3, ty + 10, 6, 9);
    }

    // House icons at each address
    ALL_ADDR.forEach(a => {
      g.fillStyle(0xDEB887); g.fillRect(a.x - 17, a.y - 10, 34, 22);
      g.fillStyle(0x8B2500); g.fillTriangle(a.x, a.y - 28, a.x - 21, a.y - 10, a.x + 21, a.y - 10);
      g.fillStyle(0x6B3A1A); g.fillRect(a.x - 8, a.y + 4, 16, 8);
    });

    // Depot building
    const dx = DEPOT.x, dy = DEPOT.y;
    g.fillStyle(0xCC8800); g.fillRect(dx - 38, dy - 40, 76, 62);
    g.fillStyle(0xEEAA00); g.fillRect(dx - 34, dy - 36, 68, 54);
    g.fillStyle(0x8B3500); g.fillTriangle(dx, dy - 66, dx - 46, dy - 40, dx + 46, dy - 40);
    g.fillStyle(0x6B3A1A); g.fillRect(dx - 12, dy + 6, 24, 16);
    g.fillStyle(0xADD8E6, 0.8);
    g.fillRect(dx - 32, dy - 20, 18, 14); g.fillRect(dx + 14, dy - 20, 18, 14);

    this.add.text(dx, dy - 82, '📦 СКЛАД', {
      fontSize: '13px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(3);
  }

  _onRoad(x, y, margin) {
    for (const ry of H_ROADS) { if (Math.abs(y - ry) < ROAD_W / 2 + margin) return true; }
    for (const vx of V_ROADS) { if (Math.abs(x - vx) < ROAD_W / 2 + margin) return true; }
    return false;
  }

  // ─── Player bike ─────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    // Top-down bicycle (facing right = 0°)
    g.fillStyle(0x1A1A1A); g.fillRoundedRect(-25, -5, 14, 10, 3);  // rear wheel
    g.fillStyle(0x555555); g.fillRoundedRect(-23, -3, 10, 6, 2);
    g.fillStyle(0x1A1A1A); g.fillRoundedRect(11, -5, 14, 10, 3);   // front wheel
    g.fillStyle(0x555555); g.fillRoundedRect(13, -3, 10, 6, 2);
    g.fillStyle(0xFF6600); g.fillRect(-11, -2, 22, 4);              // frame
    g.fillStyle(0x888888); g.fillRect(11, -6, 4, 12);              // handlebar
    g.fillStyle(0x2255BB); g.fillCircle(-2, 0, 8);                  // rider body
    g.fillStyle(0xFFCC99); g.fillCircle(4, 0, 6);                   // head
    g.fillStyle(0xFF4400); g.fillRect(1, -5, 9, 5);                 // helmet front
    g.fillStyle(0xCC3300); g.fillRect(-2, -5, 9, 5);               // helmet back

    this.playerSprite = this.add.container(this.playerPos.x, this.playerPos.y, [g]);
    this.playerSprite.setDepth(10);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.95); bg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, `🚲 Доставка — День ${GameState.day}`, {
      fontSize: '20px', color: '#FF8800', fontStyle: 'bold',
    }).setDepth(21);

    this.orderText = this.add.text(512, 8, '', {
      fontSize: '15px', color: '#FFDD88', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(21);

    this.countText = this.add.text(512, 30, '', {
      fontSize: '11px', color: '#AADDFF',
    }).setOrigin(0.5, 0).setDepth(21);

    this.moneyText = this.add.text(1010, 8, `${GameState.earnings.toFixed(2)} €`, {
      fontSize: '20px', color: '#00FF88', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(21);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    this.add.text(1010, 32, `Ціль: ${goal} €`, {
      fontSize: '12px', color: '#88BBFF',
    }).setOrigin(1, 0).setDepth(21);

    this.tipBarG = this.add.graphics().setDepth(21);

    const hb = this.add.graphics().setDepth(20);
    hb.fillStyle(0x0a0a1a, 0.9); hb.fillRect(0, 664, 1024, 36);
    this.add.text(512, 672,
      '↑ газ  ↓ гальмо  ← → кермо  |  ENTER — доставити  |  C — кінець зміни',
      { fontSize: '12px', color: '#FFFF88' }).setOrigin(0.5, 0).setDepth(21);

    this.hintText = this.add.text(512, 636, '', {
      fontSize: '15px', color: '#FFFF44',
      backgroundColor: '#00000099', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(22);

    // Arrow indicator (pointing to destination)
    this.arrowG    = this.add.graphics().setDepth(15);
    this.markerG   = this.add.graphics().setDepth(8);
    this.addrLabel = this.add.text(0, 0, '', {
      fontSize: '13px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(9);
  }

  _createUpgradePanel() {
    if (this._upgBtns) this._upgBtns.forEach(b => b.destroy());
    this._upgBtns = [];
    const ups = GameState.upgrades.delivery;
    let x = 14;
    UPGRADES.delivery.forEach(upg => {
      const bought    = ups[upg.id];
      const canAfford = GameState.earnings >= upg.cost;
      const label = bought ? `✓ ${upg.label}` : `⬆ ${upg.label} ${upg.cost}€`;
      const color = bought ? '#88FF88' : (canAfford ? '#FFDD44' : '#888888');
      const bg    = bought ? '#002200' : (canAfford ? '#221100' : '#111111');
      const btn   = this.add.text(x, 36, label, {
        fontSize: '11px', color, backgroundColor: bg, padding: { x: 5, y: 2 },
      }).setDepth(21);
      if (!bought) {
        btn.setInteractive();
        btn.on('pointerdown', () => {
          if (GameState.upgrades.delivery[upg.id] || GameState.earnings < upg.cost) return;
          GameState.earnings = parseFloat((GameState.earnings - upg.cost).toFixed(2));
          GameState.upgrades.delivery[upg.id] = true;
          this._updateHUD();
          this._createUpgradePanel();
          playSound('upgrade');
        });
      }
      this._upgBtns.push(btn);
      x += btn.width + 8;
    });
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  _setupInput() {
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.input.keyboard.addKey('C').on('down', () => this._goHome());
  }

  // ─── Order logic ─────────────────────────────────────────────────────────

  _nextOrder() {
    if (this.delivered >= this.totalDel) { this._updateHUD(); return; }
    // Pick a random address (avoid repeating last one)
    let addr;
    do { addr = ALL_ADDR[Math.floor(Math.random() * ALL_ADDR.length)]; }
    while (addr === this._lastAddr && ALL_ADDR.length > 1);
    this._lastAddr = addr;

    this.currentOrder = {
      ...addr,
      basePay: BASE_PAY[GameState.level] || 11,
      maxTip:  MAX_TIP_TABLE[GameState.level] || 6,
    };
    this.tipTimer = 0;
    playSound('order');
  }

  _deliver() {
    const ord = this.currentOrder;
    if (!ord) return;

    const tipFraction = Math.max(0, 1 - this.tipTimer / TIP_DURATION);
    const tip   = parseFloat((ord.maxTip * tipFraction).toFixed(2));
    const total = parseFloat((ord.basePay + tip).toFixed(2));

    GameState.earnings = parseFloat((GameState.earnings + total).toFixed(2));
    this.delivered++;
    playSound('cash');

    const label = tip > 0
      ? `+${total.toFixed(2)} € (чайові: ${tip.toFixed(2)}€) 💸`
      : `+${total.toFixed(2)} € (без чайових)`;
    this._floatText(label, ord.x, ord.y - 50);

    this.currentOrder = null;
    this._createUpgradePanel();
    this._updateHUD();

    if (this.delivered < this.totalDel) {
      this.time.delayedCall(700, () => this._nextOrder());
    }
  }

  _floatText(text, x, y) {
    const t = this.add.text(x, y, text, {
      fontSize: '16px', color: '#00FF88', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 52, alpha: 0, duration: 1700, onComplete: () => t.destroy() });
  }

  // ─── HUD update ──────────────────────────────────────────────────────────

  _updateHUD() {
    this.moneyText.setText(`${GameState.earnings.toFixed(2)} €`);

    if (!this.currentOrder) {
      if (this.delivered >= this.totalDel) {
        this.orderText.setText('✓ Всі доставки виконано!');
        this.countText.setText('C — кінець зміни, їхати додому');
      } else {
        this.orderText.setText('Наступне замовлення...');
        this.countText.setText('');
      }
      this.tipBarG.clear();
      return;
    }

    const ord = this.currentOrder;
    const tipFrac = Math.max(0, 1 - this.tipTimer / TIP_DURATION);
    const tip  = (ord.maxTip * tipFrac).toFixed(2);
    const urgency = tipFrac < 0.25 ? ' ⚠ ПОСПІШАЙ!' : '';

    this.orderText.setText(`📦 ${ord.emoji} ${ord.name}${urgency}`);
    this.countText.setText(
      `Доставка ${this.delivered + 1}/${this.totalDel}  |  Базова: ${ord.basePay}€  |  Чайові: ${tip}€`
    );

    // Tip bar
    this.tipBarG.clear();
    this.tipBarG.fillStyle(0x333333); this.tipBarG.fillRect(810, 10, 148, 10);
    const barColor = tipFrac > 0.5 ? 0x00CC44 : tipFrac > 0.25 ? 0xFFAA00 : 0xFF3300;
    this.tipBarG.fillStyle(barColor);
    this.tipBarG.fillRect(810, 10, Math.floor(148 * tipFrac), 10);
    this.tipBarG.fillStyle(0x888888);
    this.tipBarG.fillRect(810, 24, 148, 4);
  }

  // ─── Update loop ─────────────────────────────────────────────────────────

  update(_, delta) {
    if (this.done) return;
    const dt = delta / 1000;
    const { left, right, up, down } = this.cursors;

    // Steering
    if (left.isDown)  this.angle -= TURN_RATE * dt;
    if (right.isDown) this.angle += TURN_RATE * dt;

    // Speed
    const maxSpd = BASE_SPEED * (GameState.upgrades.delivery.ebike ? 1.55 : 1);
    if (up.isDown) {
      this.speed = Math.min(maxSpd, this.speed + ACCEL * dt);
    } else if (down.isDown) {
      this.speed = Math.max(0, this.speed - 400 * dt);
    } else {
      this.speed = Math.max(0, this.speed - DECEL * dt);
    }

    // Move
    const rad = Phaser.Math.DegToRad(this.angle);
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x + Math.cos(rad) * this.speed * dt, 20, 1004);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y + Math.sin(rad) * this.speed * dt, 62, 658);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y).setAngle(this.angle);

    // Tip timer
    const tipRate = GameState.upgrades.delivery.thermosBag ? 0.5 : 1;
    if (this.currentOrder) {
      this.tipTimer = Math.min(this.tipTimer + delta * tipRate, TIP_DURATION);
    }

    // Markers and arrow
    this._pulse += dt * 3;
    this.markerG.clear();
    this.arrowG.clear();
    this.addrLabel.setText('');

    if (this.currentOrder) {
      const ord = this.currentOrder;
      const pulse = 0.5 + 0.5 * Math.sin(this._pulse);

      // Pulsing destination circle
      this.markerG.fillStyle(0xFF8800, 0.18 + pulse * 0.22);
      this.markerG.fillCircle(ord.x, ord.y, 42 + pulse * 10);
      this.markerG.lineStyle(3, 0xFF8800, 0.65 + pulse * 0.35);
      this.markerG.strokeCircle(ord.x, ord.y, 42);

      // Address label above house
      this.addrLabel.setText(`${ord.emoji} ${ord.name}`).setPosition(ord.x, ord.y - 34);

      // Direction arrow near player
      const dx = ord.x - this.playerPos.x;
      const dy = ord.y - this.playerPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 80) {
        const arrAngle = Math.atan2(dy, dx);
        const ox = this.playerPos.x + Math.cos(arrAngle) * 40;
        const oy = this.playerPos.y + Math.sin(arrAngle) * 40;
        this.arrowG.fillStyle(0xFF8800, 0.9);
        this.arrowG.fillTriangle(
          ox + Math.cos(arrAngle) * 16,    oy + Math.sin(arrAngle) * 16,
          ox + Math.cos(arrAngle + 2.3) * 11, oy + Math.sin(arrAngle + 2.3) * 11,
          ox + Math.cos(arrAngle - 2.3) * 11, oy + Math.sin(arrAngle - 2.3) * 11,
        );
      }

      // Near destination
      if (dist < INTERACT_R) {
        this.hintText.setText('ENTER — доставити 📦');
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this._deliver();
      } else {
        const distTxt = dist < 200 ? `${Math.round(dist)}м` : '';
        this.hintText.setText(`→ ${ord.name}  ${distTxt}`);
      }
    } else {
      this.hintText.setText(this.delivered >= this.totalDel ? 'C — кінець зміни 🏠' : '');
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
