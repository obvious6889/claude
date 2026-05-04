import { GameState } from '../state.js';

const JOURNEY_TIME  = 22;  // seconds of travel
const DEPART_DELAY  = 2.2; // seconds at station before departing

const STATION_BOT = { x: 108, y: 585 }; // bottom — home/dacha side
const STATION_TOP = { x: 916, y: 118 }; // top    — shop side

export default class CommuteScene extends Phaser.Scene {
  constructor() { super({ key: 'CommuteScene' }); }

  init(data) {
    this.goingHome = data && data.destination === 'home';
  }

  create() {
    this.travelTime    = 0;
    this.departing     = false;
    this.done          = false;
    this._arrivedFired = false;
    this.departDelay   = DEPART_DELAY;

    this._drawBackground();
    this._drawTrack();
    this._drawScenery();
    this._drawStations();
    this._createCabins();
    this._createHUD();

    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.cameras.main.fadeIn(700);
  }

  // t=0 → bottom station, t=1 → top station
  _trackPos(t) {
    return {
      x: STATION_BOT.x + (STATION_TOP.x - STATION_BOT.x) * t,
      y: STATION_BOT.y + (STATION_TOP.y - STATION_BOT.y) * t,
    };
  }

  _ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ─── Background ───────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this.add.graphics();

    // Sky
    g.fillStyle(0x87CEEB); g.fillRect(0, 0, 1024, 700);
    g.fillStyle(0x4A90D9, 0.35); g.fillRect(0, 0, 1024, 280);
    g.fillStyle(0xC8E8F8, 0.3); g.fillRect(0, 200, 1024, 160);

    // Distant mountains
    g.fillStyle(0x8899AA, 0.55);
    g.fillTriangle(60, 700, 360, 195, 660, 700);
    g.fillStyle(0x99AABB, 0.55);
    g.fillTriangle(310, 700, 610, 155, 910, 700);
    g.fillStyle(0xAABBCC, 0.55);
    g.fillTriangle(560, 700, 830, 205, 1070, 700);

    // Snow peaks
    g.fillStyle(0xF4F4FF, 0.9);
    g.fillTriangle(360, 195, 330, 248, 390, 248);
    g.fillTriangle(610, 155, 578, 213, 642, 213);
    g.fillTriangle(830, 205, 798, 260, 862, 260);

    // Clouds
    this._cloud(g, 140, 78, 62);
    this._cloud(g, 390, 52, 78);
    this._cloud(g, 680, 88, 54);
    this._cloud(g, 900, 62, 68);

    // Main hillside (where funicular runs)
    g.fillStyle(0x3A7A1C);
    g.fillPoints([
      { x: 0,    y: 700 },
      { x: 1024, y: 700 },
      { x: 1024, y: 255 },
      { x: 700,  y: 330 },
      { x: 400,  y: 425 },
      { x: 150,  y: 525 },
      { x: 0,    y: 600 },
    ], true);

    g.fillStyle(0x4CAF50);
    g.fillPoints([
      { x: 0,    y: 700 },
      { x: 1024, y: 700 },
      { x: 1024, y: 305 },
      { x: 800,  y: 375 },
      { x: 500,  y: 465 },
      { x: 200,  y: 560 },
      { x: 0,    y: 648 },
    ], true);

    // Grass at bottom station
    g.fillStyle(0x5AC040); g.fillRect(0, 640, 230, 60);
  }

  _cloud(g, x, y, r) {
    g.fillStyle(0xFFFFFF, 0.76);
    g.fillCircle(x, y, r * 0.56);
    g.fillCircle(x + r * 0.50, y + r * 0.08, r * 0.44);
    g.fillCircle(x - r * 0.40, y + r * 0.12, r * 0.38);
    g.fillCircle(x + r * 0.12, y - r * 0.30, r * 0.42);
  }

  // ─── Track ────────────────────────────────────────────────────────────────

  _drawTrack() {
    const g  = this.add.graphics().setDepth(3);
    const bot = STATION_BOT, top = STATION_TOP;
    const dx = top.x - bot.x, dy = top.y - bot.y;
    const angle = Math.atan2(dy, dx);
    const perpX = Math.sin(angle) * 13;
    const perpY = -Math.cos(angle) * 13;
    const dist  = Math.hypot(dx, dy);

    // Overhead cable
    g.lineStyle(2, 0x888888, 0.85);
    g.lineBetween(bot.x, bot.y - 38, top.x, top.y - 38);

    // Support towers
    [0.2, 0.42, 0.63, 0.84].forEach(t => {
      const p = this._trackPos(t);
      g.fillStyle(0x484848);
      g.fillRect(p.x - 5, p.y - 58, 10, 58);
      g.fillStyle(0x606060);
      g.fillRect(p.x - 18, p.y - 62, 36, 9);
      g.lineStyle(1, 0x999999, 0.7);
      g.lineBetween(p.x - 16, p.y - 58, p.x - 16, p.y - 38);
      g.lineBetween(p.x + 16, p.y - 58, p.x + 16, p.y - 38);
    });

    // Crossties
    const steps = Math.floor(dist / 25);
    g.lineStyle(7, 0x6B4226, 0.75);
    for (let i = 1; i < steps; i++) {
      const p = this._trackPos(i / steps);
      g.lineBetween(
        p.x + perpX * 1.7, p.y + perpY * 1.7,
        p.x - perpX * 1.7, p.y - perpY * 1.7,
      );
    }

    // Rails
    g.lineStyle(5, 0x909090);
    g.lineBetween(bot.x + perpX, bot.y + perpY, top.x + perpX, top.y + perpY);
    g.lineBetween(bot.x - perpX, bot.y - perpY, top.x - perpX, top.y - perpY);
    // Shine
    g.lineStyle(2, 0xCCCCCC, 0.55);
    g.lineBetween(bot.x + perpX, bot.y + perpY, top.x + perpX, top.y + perpY);
    g.lineBetween(bot.x - perpX, bot.y - perpY, top.x - perpX, top.y - perpY);
  }

  // ─── Scenery ──────────────────────────────────────────────────────────────

  _drawScenery() {
    const g = this.add.graphics().setDepth(2);

    const trees = [
      { x:  55, y: 660 }, { x: 145, y: 645 }, { x: 215, y: 615 },
      { x:  38, y: 560 }, { x: 175, y: 575 }, { x: 270, y: 550 },
      { x: 330, y: 518 }, { x:  72, y: 498 }, { x: 415, y: 490 },
      { x: 495, y: 462 }, { x: 575, y: 432 }, { x: 648, y: 405 },
      { x: 728, y: 378 }, { x: 808, y: 348 }, { x: 888, y: 316 },
      { x: 958, y: 284 }, { x: 982, y: 368 }, { x: 975, y: 458 },
      { x: 990, y: 548 }, { x: 952, y: 628 }, { x: 904, y: 686 },
      { x: 825, y: 648 }, { x: 752, y: 598 }, { x: 678, y: 565 },
      { x: 600, y: 600 }, { x: 520, y: 640 }, { x: 440, y: 668 },
    ];
    trees.forEach(({ x, y }) => {
      const s = 11 + (Math.abs(Math.sin(x * 0.4) * 9) | 0);
      g.fillStyle(0x1B5E20); g.fillTriangle(x, y - s * 2.4, x - s, y, x + s, y);
      g.fillStyle(0x2E7D32); g.fillTriangle(x, y - s * 3.4, x - s * 0.78, y - s, x + s * 0.78, y - s);
      g.fillStyle(0x6D4C41); g.fillRect(x - 3, y, 6, (s * 0.75) | 0);
    });

    // Dacha (bottom-left)
    g.fillStyle(0xDEB887); g.fillRect(20, 618, 52, 44);
    g.fillStyle(0x8B2500); g.fillTriangle(46, 598, 12, 622, 80, 622);
    g.fillStyle(0x6B3A1A); g.fillRect(36, 646, 20, 16);
    g.fillStyle(0x88CCFF, 0.7); g.fillRect(25, 626, 14, 10); g.fillRect(52, 626, 14, 10);

    // City buildings at top-right
    [[940, 148, 28, 55, 0x8899BB], [970, 162, 22, 42, 0x7788AA],
     [994, 170, 18, 36, 0x99AACC]].forEach(([x, y, w, h, c]) => {
      g.fillStyle(c); g.fillRect(x, y, w, h);
      g.fillStyle(0xAABBDD, 0.6);
      for (let wy = y + 5; wy < y + h - 5; wy += 10) {
        for (let wx = x + 4; wx < x + w - 4; wx += 7) {
          g.fillRect(wx, wy, 4, 6);
        }
      }
    });
  }

  // ─── Stations ─────────────────────────────────────────────────────────────

  _drawStations() {
    const g = this.add.graphics().setDepth(5);

    // Bottom station (home/dacha side)
    const b = STATION_BOT;
    g.fillStyle(0xD4A97A); g.fillRect(b.x - 56, b.y - 72, 112, 76);
    g.fillStyle(0x8B2000); g.fillTriangle(b.x, b.y - 90, b.x - 68, b.y - 72, b.x + 68, b.y - 72);
    g.fillStyle(0x6B3A1A); g.fillRect(b.x - 13, b.y - 4, 26, 14);
    g.fillStyle(0xADD8E6, 0.75);
    g.fillRect(b.x - 48, b.y - 58, 30, 22); g.fillRect(b.x + 18, b.y - 58, 30, 22);
    g.lineStyle(2, 0x7B4010); g.strokeRect(b.x - 56, b.y - 72, 112, 76);

    // Top station (shop side)
    const t = STATION_TOP;
    g.fillStyle(0xC49A6C); g.fillRect(t.x - 56, t.y - 72, 112, 76);
    g.fillStyle(0x7A1A00); g.fillTriangle(t.x, t.y - 90, t.x - 68, t.y - 72, t.x + 68, t.y - 72);
    g.fillStyle(0x5B3010); g.fillRect(t.x - 13, t.y - 4, 26, 14);
    g.fillStyle(0xADD8E6, 0.75);
    g.fillRect(t.x - 48, t.y - 58, 30, 22); g.fillRect(t.x + 18, t.y - 58, 30, 22);
    g.lineStyle(2, 0x6B2A00); g.strokeRect(t.x - 56, t.y - 72, 112, 76);

    this.add.text(b.x, b.y - 104, '🏠 ДАЧА',
      { fontSize: '14px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000088', padding: { x: 6, y: 3 } })
      .setOrigin(0.5).setDepth(6);
    this.add.text(t.x, t.y - 104, '🏪 МАГАЗИН',
      { fontSize: '14px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000088', padding: { x: 6, y: 3 } })
      .setOrigin(0.5).setDepth(6);
  }

  // ─── Cabins ───────────────────────────────────────────────────────────────

  _createCabins() {
    const trackAngle = Math.atan2(
      STATION_TOP.y - STATION_BOT.y,
      STATION_TOP.x - STATION_BOT.x,
    ) * (180 / Math.PI);

    // Player cabin — starts at origin station
    const startT = this.goingHome ? 1 : 0;
    const sp = this._trackPos(startT);
    this.cabinG = this.add.graphics();
    this._drawCabin(this.cabinG, true);
    this.cabinObj = this.add.container(sp.x, sp.y, [this.cabinG])
      .setDepth(9).setAngle(trackAngle);

    // Counter cabin — starts at destination station
    const counterT = this.goingHome ? 0 : 1;
    const cp = this._trackPos(counterT);
    const counterG = this.add.graphics();
    this._drawCabin(counterG, false);
    this.counterObj = this.add.container(cp.x, cp.y, [counterG])
      .setDepth(8).setAngle(trackAngle);
  }

  _drawCabin(g, isPlayer) {
    const body  = isPlayer ? 0xFF6622 : 0x2255BB;
    const roof  = isPlayer ? 0xCC3300 : 0x113388;
    const frame = isPlayer ? 0xAA2200 : 0x0A2266;

    // Body
    g.fillStyle(body);  g.fillRect(-44, -28, 88, 54);
    g.lineStyle(3, frame); g.strokeRect(-44, -28, 88, 54);

    // Windows
    g.fillStyle(0xCCE8FF, 0.85);
    g.fillRect(-38, -20, 22, 20);
    g.fillRect( -9, -20, 22, 20);
    g.fillRect( 18, -20, 20, 20);
    g.lineStyle(1, frame, 0.5);
    g.strokeRect(-38, -20, 22, 20);
    g.strokeRect( -9, -20, 22, 20);
    g.strokeRect( 18, -20, 20, 20);

    // Door line
    g.lineStyle(2, frame, 0.55);
    g.lineBetween(0, -28, 0, 26);

    // Roof
    g.fillStyle(roof); g.fillRect(-48, -36, 96, 11);

    // Pulley wheel on roof
    g.fillStyle(0x2A2A2A); g.fillRect(-40, -46, 80, 13);
    g.fillStyle(0x484848);
    g.fillCircle(-30, -40, 7); g.fillCircle(30, -40, 7);

    // Number label
    if (isPlayer) {
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(-18, -4, 36, 14);
      g.lineStyle(1, frame); g.strokeRect(-18, -4, 36, 14);
    }
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.92); bg.fillRect(0, 0, 1024, 50);

    const title = this.goingHome ? '🚡 Фунікулер — До дому' : '🚡 Фунікулер — До магазину';
    this.add.text(16, 12, title,
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' }).setDepth(21);

    this.add.text(1010, 13, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    // Progress bar
    const pbBg = this.add.graphics().setDepth(20);
    pbBg.fillStyle(0x333333); pbBg.fillRect(290, 18, 430, 14);
    this.progressBar = this.add.graphics().setDepth(21);

    const routeFrom = this.goingHome ? '🏪 МАГАЗИН' : '🏠 ДАЧА';
    const routeTo   = this.goingHome ? '🏠 ДАЧА'    : '🏪 МАГАЗИН';
    this.add.text(290, 36, routeFrom, { fontSize: '10px', color: '#AAAAAA' }).setDepth(21);
    this.add.text(720, 36, routeTo,   { fontSize: '10px', color: '#AAAAAA' }).setOrigin(1, 0).setDepth(21);

    this.statusText = this.add.text(512, 658, '🚡 Посадка...',
      { fontSize: '16px', color: '#FFFF44', fontStyle: 'bold',
        backgroundColor: '#00000088', padding: { x: 10, y: 5 } })
      .setOrigin(0.5).setDepth(21);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.done) return;
    const dt = delta / 1000;

    if (!this.departing) {
      this.departDelay -= dt;
      if (this.departDelay <= 0) {
        this.departing = true;
        this.statusText.setText('🚡 Відправляємось!');
      }
      return;
    }

    this.travelTime += dt;
    const rawT   = Math.min(1, this.travelTime / JOURNEY_TIME);
    const easedT = this._ease(rawT);

    // Move player cabin
    const fromT  = this.goingHome ? 1 : 0;
    const toT    = this.goingHome ? 0 : 1;
    const cabinT = fromT + (toT - fromT) * easedT;
    const pos    = this._trackPos(cabinT);
    this.cabinObj.setPosition(pos.x, pos.y);

    // Counter cabin always opposite
    const counterPos = this._trackPos(1 - cabinT);
    this.counterObj.setPosition(counterPos.x, counterPos.y);

    // Depth swap when cabins cross (player cabin on top when going up)
    const mid = this.goingHome ? easedT > 0.5 : easedT < 0.5;
    this.cabinObj.setDepth(mid ? 8 : 9);
    this.counterObj.setDepth(mid ? 9 : 8);

    // Progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00AA44);
    this.progressBar.fillRect(290, 18, 430 * rawT, 14);

    // Status
    if (rawT >= 0.97) {
      const dest = this.goingHome ? '🏠 ДАЧУ' : '🏪 МАГАЗИН';
      this.statusText.setText(`Прибули! ENTER — увійти в ${dest}`);
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this._finish();
    } else {
      const pct = Math.round(rawT * 100);
      this.statusText.setText(`🚡 Їдемо... ${pct}%`);
    }

    // Auto-finish 1.8s after arrival
    if (rawT >= 1 && !this._arrivedFired) {
      this._arrivedFired = true;
      this.time.delayedCall(1800, () => this._finish());
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    const next = this.goingHome ? 'HomeScene' : 'ShopScene';
    this.time.delayedCall(600, () => this.scene.start(next));
  }
}
