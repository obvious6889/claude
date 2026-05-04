import { GameState } from '../state.js';

const WORLD_W  = 2500;
const WORLD_H  = 700;
const ROAD_R   = 46;   // road half-width

const MAX_SPD  = 360;
const ACCEL    = 290;
const BRAKE    = 340;
const FRICTION = 210;
const TURN_SPD = 150;  // degrees/second

// Road path — left end = home/dacha, right end = shop
const ROAD = [
  { x:  110, y: 530 },
  { x:  760, y: 530 },  // → turn up
  { x:  760, y: 210 },  // ↑ turn right
  { x: 1640, y: 210 },  // → turn down
  { x: 1640, y: 530 },  // ↓ turn right
  { x: 2380, y: 530 },  // → shop
];

export default class CommuteScene extends Phaser.Scene {
  constructor() { super({ key: 'CommuteScene' }); }

  init(data) {
    this.goingHome = data && data.destination === 'home';
  }

  create() {
    this.done     = false;
    this.carSpeed = 0;

    const start = this.goingHome ? ROAD[ROAD.length - 1] : ROAD[0];
    const end   = this.goingHome ? ROAD[0]               : ROAD[ROAD.length - 1];
    this.carX     = start.x;
    this.carY     = start.y;
    this.destX    = end.x;
    this.destY    = end.y;
    this.carAngle = this.goingHome ? 180 : 0;

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this._drawWorld();
    this._createCar();
    this._createHUD();

    this.cameras.main.startFollow(this.carObj, true, 0.1, 0.1);

    // DOM arrow keys (same approach as ShopScene — reliable across scene switches)
    this._keys = { up: false, down: false, left: false, right: false };
    const onKD = (e) => {
      if (e.code === 'ArrowUp')    { this._keys.up    = true; e.preventDefault(); }
      if (e.code === 'ArrowDown')  { this._keys.down  = true; e.preventDefault(); }
      if (e.code === 'ArrowLeft')  { this._keys.left  = true; e.preventDefault(); }
      if (e.code === 'ArrowRight') { this._keys.right = true; e.preventDefault(); }
    };
    const onKU = (e) => {
      if (e.code === 'ArrowUp')    this._keys.up    = false;
      if (e.code === 'ArrowDown')  this._keys.down  = false;
      if (e.code === 'ArrowLeft')  this._keys.left  = false;
      if (e.code === 'ArrowRight') this._keys.right = false;
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup',   onKU);
    this.events.once('destroy', () => {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup',   onKU);
    });

    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.cameras.main.fadeIn(400);
  }

  // ─── World ────────────────────────────────────────────────────────────────

  _drawWorld() {
    const g = this.add.graphics();
    const R = ROAD_R, K = 5;

    // Grass
    g.fillStyle(0x4CAF50); g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Scenery (trees, houses)
    this._addScenery(g);

    // Kerb (slightly wider strip under road)
    g.fillStyle(0xBBBBBB);
    for (let i = 0; i < ROAD.length - 1; i++) {
      const a = ROAD[i], b = ROAD[i + 1];
      if (a.x === b.x) g.fillRect(a.x-R-K, Math.min(a.y,b.y)-K, 2*(R+K), Math.abs(b.y-a.y)+2*K);
      else             g.fillRect(Math.min(a.x,b.x)-K, a.y-R-K, Math.abs(b.x-a.x)+2*K, 2*(R+K));
      if (i < ROAD.length - 2) { const c = ROAD[i+1]; g.fillRect(c.x-R-K, c.y-R-K, 2*(R+K), 2*(R+K)); }
    }

    // Road surface
    g.fillStyle(0x555555);
    for (let i = 0; i < ROAD.length - 1; i++) {
      const a = ROAD[i], b = ROAD[i + 1];
      if (a.x === b.x) g.fillRect(a.x-R, Math.min(a.y,b.y), 2*R, Math.abs(b.y-a.y));
      else             g.fillRect(Math.min(a.x,b.x), a.y-R, Math.abs(b.x-a.x), 2*R);
      if (i < ROAD.length - 2) { const c = ROAD[i+1]; g.fillRect(c.x-R, c.y-R, 2*R, 2*R); }
    }

    // Centre dashes
    g.fillStyle(0xFFFFFF, 0.5);
    for (let i = 0; i < ROAD.length - 1; i++) {
      const a = ROAD[i], b = ROAD[i + 1];
      if (a.x === b.x) {
        for (let y = Math.min(a.y,b.y)+30; y < Math.max(a.y,b.y)-10; y += 56) g.fillRect(a.x-3, y, 6, 32);
      } else {
        for (let x = Math.min(a.x,b.x)+30; x < Math.max(a.x,b.x)-10; x += 70) g.fillRect(x, a.y-3, 42, 6);
      }
    }

    // Lampposts
    for (let i = 0; i < ROAD.length - 1; i++) {
      const a = ROAD[i], b = ROAD[i + 1];
      if (a.y === b.y) {
        for (let x = Math.min(a.x,b.x)+90; x < Math.max(a.x,b.x); x += 180) this._lamppost(g, x, a.y-R-20);
      } else {
        for (let y = Math.min(a.y,b.y)+90; y < Math.max(a.y,b.y); y += 180) this._lamppost(g, a.x+R+20, y);
      }
    }

    // Start / destination labels
    const sp = ROAD[0], ep = ROAD[ROAD.length - 1];
    const startLabel = this.goingHome ? '🏪 МАГАЗИН' : '🏠 ДАЧА';
    const endLabel   = this.goingHome ? '🏠 ДАЧА'    : '🏪 МАГАЗИН';
    const dest       = this.goingHome ? sp : ep;

    this.add.text(sp.x, sp.y - R - 16, startLabel,
      { fontSize: '16px', color: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 7, y: 4 } }).setOrigin(0.5, 1);
    this.add.text(ep.x, ep.y - R - 16, endLabel,
      { fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 7, y: 4 } }).setOrigin(0.5, 1);

    // Destination pulse
    g.fillStyle(0x00FF88, 0.30); g.fillCircle(dest.x, dest.y, 60);
    g.fillStyle(0x00FF88, 0.65); g.fillCircle(dest.x, dest.y, 22);
  }

  _lamppost(g, x, y) {
    g.fillStyle(0x4A4A4A); g.fillRect(x - 3, y, 6, 26);
    g.fillRect(x - 2, y, 18, 4);
    g.fillStyle(0xFFFF88, 0.9); g.fillCircle(x + 16, y + 2, 5);
  }

  _addScenery(g) {
    // Deterministic pseudo-random using sin
    const rnd = (i, seed) => Math.abs(Math.sin(i * 127.3 + seed * 311.7));

    for (let i = 0; i < 130; i++) {
      const x = 40 + rnd(i, 0) * (WORLD_W - 80);
      const y = 40 + rnd(i, 1) * (WORLD_H - 80);
      if (this._nearRoad(x, y, 70)) continue;
      const s = 13 + (rnd(i, 2) * 15) | 0;
      g.fillStyle(0x2E7D32); g.fillCircle(x, y, s + 5);
      g.fillStyle(0x43A047); g.fillCircle(x, y, s);
      g.fillStyle(0x8B4513); g.fillRect(x - 4, y + s - 5, 8, 13);
    }

    // Houses
    const houses = [
      220, 200,  480, 150,  920, 610,  1050, 160,
      1260, 600, 1480, 150, 1900, 160,  2100, 590,
    ];
    for (let i = 0; i < houses.length; i += 2) {
      const hx = houses[i], hy = houses[i + 1];
      if (this._nearRoad(hx, hy, 90)) continue;
      g.fillStyle(0xDEB887); g.fillRect(hx - 28, hy - 26, 56, 48);
      g.fillStyle(0x8B2500); g.fillTriangle(hx, hy - 52, hx - 36, hy - 26, hx + 36, hy - 26);
      g.fillStyle(0x6B3A1A); g.fillRect(hx - 10, hy + 2, 20, 22);
      g.fillStyle(0xADD8E6, 0.8);
      g.fillRect(hx - 26, hy - 18, 14, 12); g.fillRect(hx + 12, hy - 18, 14, 12);
    }
  }

  _nearRoad(x, y, margin) {
    for (let i = 0; i < ROAD.length - 1; i++) {
      const a = ROAD[i], b = ROAD[i + 1], m = ROAD_R + margin;
      if (a.x === b.x) {
        if (Math.abs(x - a.x) < m && y >= Math.min(a.y,b.y)-m && y <= Math.max(a.y,b.y)+m) return true;
      } else {
        if (Math.abs(y - a.y) < m && x >= Math.min(a.x,b.x)-m && x <= Math.max(a.x,b.x)+m) return true;
      }
    }
    return false;
  }

  // ─── Car ──────────────────────────────────────────────────────────────────

  _createCar() {
    this.carG = this.add.graphics();
    this._redrawCar();
    this.carObj = this.add.container(this.carX, this.carY, [this.carG])
      .setDepth(10).setAngle(this.carAngle);
  }

  _redrawCar() {
    const g = this.carG;
    g.clear();

    // Body (top-down, oriented right = 0°)
    g.fillStyle(0xDD2211); g.fillRect(-24, -13, 48, 26);
    // Roof detail
    g.fillStyle(0xBB1100); g.fillRect(-16, -10, 32, 20);
    // Windshield
    g.fillStyle(0x88CCFF, 0.72); g.fillRect(8, -9, 14, 18);
    // Rear window
    g.fillStyle(0x88CCFF, 0.45); g.fillRect(-22, -8, 11, 16);
    // Wheels
    g.fillStyle(0x111111);
    g.fillRect(-22, -18, 13, 7);  // rear-left
    g.fillRect( 11, -18, 13, 7);  // front-left
    g.fillRect(-22,  11, 13, 7);  // rear-right
    g.fillRect( 11,  11, 13, 7);  // front-right
    // Headlights
    g.fillStyle(0xFFEE88); g.fillRect(22, -10, 4, 7); g.fillRect(22, 3, 4, 7);
    // Brake lights
    g.fillStyle(0xFF3333, 0.7); g.fillRect(-26, -10, 4, 7); g.fillRect(-26, 3, 4, 7);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setScrollFactor(0).setDepth(50);
    bg.fillStyle(0x1a1a2e, 0.92); bg.fillRect(0, 0, 1024, 50);

    const title = this.goingHome ? '🏠 Дорога додому' : '🏪 Дорога до магазину';
    this.add.text(16, 12, title,
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' })
      .setScrollFactor(0).setDepth(51);

    this.speedText = this.add.text(512, 12, '',
      { fontSize: '20px', color: '#fff', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(51);

    this.add.text(1010, 13, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(51);

    const dest = this.goingHome ? '🏠 ДАЧУ' : '🏪 МАГАЗИН';
    this.add.text(512, 650,
      `↑ газ   ↓ гальмо   ← → кермо   |   Знайди ${dest} і натисни ENTER`,
      { fontSize: '13px', color: '#FFFF44',
        backgroundColor: '#00000077', padding: { x: 8, y: 4 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(51);

    this.enterHint = this.add.text(512, 614, '',
      { fontSize: '19px', color: '#00FF88', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 12, y: 6 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(51);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.done) return;
    const dt = delta / 1000;
    const k  = this._keys;

    // Speed
    if (k.up) {
      this.carSpeed = Math.min(MAX_SPD, this.carSpeed + ACCEL * dt);
    } else if (k.down) {
      this.carSpeed = Math.max(-90, this.carSpeed - BRAKE * dt);
    } else {
      if (this.carSpeed > 0) this.carSpeed = Math.max(0, this.carSpeed - FRICTION * dt);
      else                   this.carSpeed = Math.min(0, this.carSpeed + FRICTION * dt);
    }

    // Steering (only effective when moving)
    if (Math.abs(this.carSpeed) > 8) {
      const dir = this.carSpeed > 0 ? 1 : -1;
      if (k.left)  this.carAngle -= TURN_SPD * dt * dir;
      if (k.right) this.carAngle += TURN_SPD * dt * dir;
    }

    // Position
    const rad = this.carAngle * (Math.PI / 180);
    this.carX = Phaser.Math.Clamp(this.carX + Math.cos(rad) * this.carSpeed * dt, 15, WORLD_W - 15);
    this.carY = Phaser.Math.Clamp(this.carY + Math.sin(rad) * this.carSpeed * dt, 15, WORLD_H - 15);
    this.carObj.setPosition(this.carX, this.carY).setAngle(this.carAngle);

    // Speed display (rough km/h equivalent)
    const display = Math.round(Math.abs(this.carSpeed) / 10) * 10;
    this.speedText.setText(display > 0 ? `${display} км/год` : '');

    // Near destination
    const dist = Math.hypot(this.carX - this.destX, this.carY - this.destY);
    if (dist < 95) {
      const label = this.goingHome ? 'ENTER — приїхали додому 🏠' : 'ENTER — приїхали в магазин 🏪';
      this.enterHint.setText(label);
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this._finish();
    } else {
      this.enterHint.setText('');
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this._keys.up = this._keys.down = this._keys.left = this._keys.right = false;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    const next = this.goingHome ? 'HomeScene' : 'ShopScene';
    this.time.delayedCall(500, () => this.scene.start(next));
  }
}
