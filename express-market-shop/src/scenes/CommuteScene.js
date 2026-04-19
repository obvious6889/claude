import { GameState } from '../state.js';

const TOTAL_TIME   = 60;
const R            = 42;   // road half-width
const SPEED        = 230;
const WORLD_W      = 2600;
const WORLD_H      = 950;

// Dacha → Shop: йде вправо з поворотами вниз/вгору
const SHOP_PATH = [
  { x:  90, y: 260 },
  { x: 780, y: 260 },   // → поворот праворуч (вниз)
  { x: 780, y: 680 },   // ↓ поворот ліворуч (вправо)
  { x: 1520, y: 680 },  // → поворот ліворуч (вгору)
  { x: 1520, y: 300 },  // ↑ поворот праворуч (вправо)
  { x: 2510, y: 300 },  // → МАГАЗИН
];

// Shop → Dacha: інший маршрут
const HOME_PATH = [
  { x: 2510, y: 640 },
  { x: 1750, y: 640 },  // ← поворот ліворуч (вгору)
  { x: 1750, y: 220 },  // ↑ поворот праворуч (вліво)
  { x: 1000, y: 220 },  // ← поворот праворуч (вниз)
  { x: 1000, y: 730 },  // ↓ поворот ліворуч (вліво)
  { x:  90,  y: 730 },  // ← ДАЧА
];

export default class CommuteScene extends Phaser.Scene {
  constructor() { super({ key: 'CommuteScene' }); }

  init(data) {
    this.goingHome = data && data.destination === 'home';
  }

  create() {
    this.elapsed    = 0;
    this.done       = false;
    this._walkFrame = 0;
    this._walkTimer = 0;
    this._facing    = 0; // degrees: 0=right 90=down 180=left 270=up

    const path    = this.goingHome ? HOME_PATH : SHOP_PATH;
    this.destX    = path[path.length - 1].x;
    this.destY    = path[path.length - 1].y;
    this.playerX  = path[0].x;
    this.playerY  = path[0].y;
    this._facing  = this._firstFacing(path);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this._drawWorld(path);
    this._createPlayer();
    this.cameras.main.startFollow(this.playerObj, true, 0.09, 0.09);
    this._createHUD();

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.cameras.main.fadeIn(400);
  }

  // ─── World drawing ────────────────────────────────────────────────────────

  _drawWorld(path) {
    const g = this.add.graphics();

    // Grass
    g.fillStyle(0x4CAF50); g.fillRect(0, 0, WORLD_W, WORLD_H);

    // Trees (scattered off-road)
    this._scatterItems(path, 100).forEach(({ x, y, s }) => {
      g.fillStyle(0x2E7D32); g.fillCircle(x, y, s + 5);
      g.fillStyle(0x43A047); g.fillCircle(x, y, s);
      g.fillStyle(0x8B4513); g.fillRect(x - 4, y + s - 6, 8, 14);
    });

    // Houses
    this._scatterItems(path, 18, 90).forEach(({ x, y }) => {
      g.fillStyle(0xDEB887); g.fillRect(x - 26, y - 24, 52, 46);
      g.fillStyle(0x8B2500); g.fillTriangle(x, y - 50, x - 34, y - 24, x + 34, y - 24);
      g.fillStyle(0x6B3A1A); g.fillRect(x - 9, y + 2, 18, 22);
      g.fillStyle(0xADD8E6);
      g.fillRect(x - 24, y - 18, 14, 12); g.fillRect(x + 10, y - 18, 14, 12);
    });

    // Lampposts along road
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const step = 160;
      if (a.y === b.y) {
        // Horizontal segment — lampposts above
        for (let x = Math.min(a.x, b.x) + 80; x < Math.max(a.x, b.x); x += step) {
          this._drawLamppost(g, x, a.y - R - 18);
        }
      } else {
        // Vertical segment — lampposts to the right
        for (let y = Math.min(a.y, b.y) + 80; y < Math.max(a.y, b.y); y += step) {
          this._drawLamppost(g, a.x + R + 18, y);
        }
      }
    }

    // Kerb (slightly wider road in lighter color)
    const K = 5;
    g.fillStyle(0xBBBBBB);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (a.x === b.x) {
        g.fillRect(a.x - R - K, Math.min(a.y, b.y) - K, 2*(R+K), Math.abs(b.y - a.y) + 2*K);
      } else {
        g.fillRect(Math.min(a.x, b.x) - K, a.y - R - K, Math.abs(b.x - a.x) + 2*K, 2*(R+K));
      }
      if (i < path.length - 2) {
        const c = path[i + 1];
        g.fillRect(c.x - R - K, c.y - R - K, 2*(R+K), 2*(R+K));
      }
    }

    // Road surface
    g.fillStyle(0x555555);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (a.x === b.x) {
        g.fillRect(a.x - R, Math.min(a.y, b.y), 2*R, Math.abs(b.y - a.y));
      } else {
        g.fillRect(Math.min(a.x, b.x), a.y - R, Math.abs(b.x - a.x), 2*R);
      }
      if (i < path.length - 2) {
        const c = path[i + 1];
        g.fillRect(c.x - R, c.y - R, 2*R, 2*R);
      }
    }

    // Center dashes
    g.fillStyle(0xFFFFFF, 0.55);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (a.x === b.x) {
        // Vertical
        const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
        for (let y = minY + 25; y < maxY - 10; y += 55) {
          g.fillRect(a.x - 3, y, 6, 30);
        }
      } else {
        // Horizontal
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        for (let x = minX + 25; x < maxX - 10; x += 70) {
          g.fillRect(x, a.y - 3, 40, 6);
        }
      }
    }

    // Start / End markers
    const startLabel = this.goingHome ? '🏪 МАГАЗИН' : '🏠 ДАЧА';
    const endLabel   = this.goingHome ? '🏠 ДАЧА'    : '🏪 МАГАЗИН';
    const sp = path[0], ep = path[path.length - 1];

    this.add.text(sp.x, sp.y - R - 14, startLabel,
      { fontSize: '17px', color: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 7, y: 4 } }).setOrigin(0.5, 1);
    this.add.text(ep.x, ep.y - R - 14, endLabel,
      { fontSize: '17px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 7, y: 4 } }).setOrigin(0.5, 1);

    // Destination pulse circle
    g.fillStyle(0x00FF88, 0.35); g.fillCircle(ep.x, ep.y, 55);
    g.fillStyle(0x00FF88, 0.7);  g.fillCircle(ep.x, ep.y, 18);
  }

  _drawLamppost(g, x, y) {
    g.fillStyle(0x555555); g.fillRect(x - 3, y, 6, 28);
    g.fillRect(x - 2, y, 18, 4);
    g.fillStyle(0xFFFF88, 0.9); g.fillCircle(x + 16, y + 2, 6);
  }

  _scatterItems(path, count, minDist = 60) {
    const items = [];
    for (let tries = 0; tries < count * 8 && items.length < count; tries++) {
      const x = 40 + Math.random() * (WORLD_W - 80);
      const y = 40 + Math.random() * (WORLD_H - 80);
      const s = 14 + Math.floor(Math.random() * 20);
      if (!this._nearRoad(path, x, y, minDist)) items.push({ x, y, s });
    }
    return items;
  }

  _nearRoad(path, x, y, margin) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const m = R + margin;
      if (a.x === b.x) {
        if (Math.abs(x - a.x) < m && y >= Math.min(a.y,b.y) - m && y <= Math.max(a.y,b.y) + m) return true;
      } else {
        if (Math.abs(y - a.y) < m && x >= Math.min(a.x,b.x) - m && x <= Math.max(a.x,b.x) + m) return true;
      }
      if (i < path.length - 2) {
        const c = path[i+1];
        if (Math.abs(x - c.x) < m && Math.abs(y - c.y) < m) return true;
      }
    }
    return false;
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.playerG   = this.add.graphics();
    this.playerObj = this.add.container(this.playerX, this.playerY, [this.playerG]);
    this.playerObj.setDepth(10);
    this.playerObj.setAngle(this._facing);
    this._redrawPlayer();
  }

  _redrawPlayer() {
    const g = this.playerG;
    g.clear();
    // Top-down Mario (facing "up" in local space = forward)
    g.fillStyle(0x0000CC); g.fillEllipse(0, 5, 28, 36);   // overalls
    g.fillStyle(0xFF0000); g.fillEllipse(0, -7, 24, 22);  // shirt
    g.fillStyle(0xFFCC99); g.fillCircle(0, -20, 11);       // head
    g.fillStyle(0xFF0000); g.fillEllipse(0, -24, 26, 12); // hat
    g.fillStyle(0x4A2800);
    if (this._walkFrame === 0) {
      g.fillEllipse(-7, 14, 12, 9); g.fillEllipse(7, 14, 12, 9);
    } else {
      g.fillEllipse(-9, 14, 12, 9); g.fillEllipse(9, 14, 12, 9);
    }
  }

  _firstFacing(path) {
    const dx = path[1].x - path[0].x;
    const dy = path[1].y - path[0].y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 0 : 180;
    return dy > 0 ? 90 : 270;
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const sf = { scrollFactor: 0 };

    const bg = this.add.graphics().setScrollFactor(0).setDepth(50);
    bg.fillStyle(0x1a1a2e, 0.92); bg.fillRect(0, 0, 1024, 50);

    const title = this.goingHome ? '🏠 Дорога додому' : '🏪 Дорога до магазину';
    this.add.text(16, 12, title,
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' })
      .setScrollFactor(0).setDepth(51);

    this.timerText = this.add.text(512, 13, '1:00',
      { fontSize: '20px', color: '#fff', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(51);

    this.add.graphics().setScrollFactor(0).setDepth(51)
      .fillStyle(0x333333).fillRect(690, 20, 200, 10);
    this.progressBar = this.add.graphics().setScrollFactor(0).setDepth(51);

    this.add.text(1010, 13, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(51);

    const dest = this.goingHome ? 'ДАЧУ 🏠' : 'МАГАЗИН 🏪';
    this.add.text(512, 650, `↑ ↓ ← →  Знайди ${dest} і натисни ENTER щоб увійти`,
      { fontSize: '13px', color: '#FFFF44', backgroundColor: '#00000077',
        padding: { x: 8, y: 4 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(51);

    this.enterHintText = this.add.text(512, 620, '',
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 12, y: 6 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(51);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.done) return;
    const dt = delta / 1000;
    this.elapsed += dt;

    let dx = 0, dy = 0;
    if (this.cursors.right.isDown) { dx =  1; this._facing =   0; }
    if (this.cursors.left.isDown)  { dx = -1; this._facing = 180; }
    if (this.cursors.down.isDown)  { dy =  1; this._facing =  90; }
    if (this.cursors.up.isDown)    { dy = -1; this._facing = 270; }
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this.playerX = Phaser.Math.Clamp(this.playerX + dx * SPEED * dt, 5, WORLD_W - 5);
    this.playerY = Phaser.Math.Clamp(this.playerY + dy * SPEED * dt, 5, WORLD_H - 5);
    this.playerObj.setPosition(this.playerX, this.playerY);
    this.playerObj.setAngle(this._facing);

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      this._walkTimer += delta;
      if (this._walkTimer > 260) {
        this._walkTimer = 0;
        this._walkFrame = 1 - this._walkFrame;
        this._redrawPlayer();
      }
    }

    // HUD
    const rem = Math.max(0, TOTAL_TIME - this.elapsed);
    this.timerText.setText(`${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2,'0')}`);
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00AA44);
    this.progressBar.fillRect(690, 20, 200 * Math.min(1, this.elapsed / TOTAL_TIME), 10);

    // Near destination: show Enter hint
    const dist = Math.hypot(this.playerX - this.destX, this.playerY - this.destY);
    if (dist < 90) {
      const label = this.goingHome ? 'ENTER — увійти додому 🏠' : 'ENTER — увійти в магазин 🏪';
      this.enterHintText.setText(label);
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this._finish();
    } else {
      this.enterHintText.setText('');
    }

    // Fallback: auto-transition if time runs out
    if (this.elapsed >= TOTAL_TIME) this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    const next = this.goingHome ? 'HomeScene' : 'ShopScene';
    this.time.delayedCall(500, () => this.scene.start(next));
  }
}
