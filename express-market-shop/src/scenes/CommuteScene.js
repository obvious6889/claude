import { GameState } from '../state.js';

const SCROLL_SPEED  = 120;
const TOTAL_TIME    = 60;  // seconds
const ROAD_Y        = 340;
const ROAD_H        = 160;
const PLAYER_X      = 220;
const PLAYER_MIN_Y  = ROAD_Y + 28;
const PLAYER_MAX_Y  = ROAD_Y + ROAD_H - 38;
const PLAYER_V      = 150;
const WORLD_W       = 2400;

export default class CommuteScene extends Phaser.Scene {
  constructor() { super({ key: 'CommuteScene' }); }

  init(data) {
    this.goingHome = (data && data.destination === 'home');
  }

  create() {
    this.elapsed  = 0;
    this.scrollX  = 0;
    this.done     = false;
    this.playerY  = ROAD_Y + ROAD_H / 2;
    this._walkFrame = 0;
    this._walkTimer = 0;

    this._genScenery();
    this._drawStaticBg();
    this.dynG = this.add.graphics().setDepth(2);
    this._createPlayer();
    this._createHUD();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.fadeIn(400);
  }

  // ─── Scenery data ─────────────────────────────────────────────────────────

  _genScenery() {
    this.scenery = [];

    // Trees above and below road
    [80,220,380,540,710,880,1040,1220,1390,1550,1720,1890,2060,2240].forEach(x => {
      this.scenery.push({ type: 'tree', x,      y: ROAD_Y - 52,      size: 34 + (x % 3) * 9 });
      this.scenery.push({ type: 'tree', x: x+90, y: ROAD_Y+ROAD_H+55, size: 28 + (x % 4) * 7 });
    });

    // Houses above road
    [140, 560, 1020, 1500, 1980].forEach(x => {
      this.scenery.push({ type: 'house', x, y: ROAD_Y - 18 });
    });

    // Lampposts along top kerb
    for (let x = 100; x < WORLD_W; x += 210) {
      this.scenery.push({ type: 'lamppost', x, y: ROAD_Y + 8 });
    }
  }

  // ─── Static background ────────────────────────────────────────────────────

  _drawStaticBg() {
    const g = this.add.graphics().setDepth(0);

    // Sky
    g.fillStyle(0x87CEEB); g.fillRect(0, 0, 1024, ROAD_Y);

    // Clouds (static decoration)
    g.fillStyle(0xFFFFFF, 0.82);
    [[120,65],[360,45],[590,78],[810,52],[980,70]].forEach(([cx,cy]) => {
      g.fillCircle(cx,cy,28); g.fillCircle(cx+34,cy-9,36); g.fillCircle(cx+68,cy,28);
    });

    // Sun
    g.fillStyle(0xFFD700); g.fillCircle(930, 75, 52);

    // Top grass strip
    g.fillStyle(0x228B22); g.fillRect(0, ROAD_Y - 68, 1024, 72);

    // Road surface
    g.fillStyle(0x4A4A4A); g.fillRect(0, ROAD_Y, 1024, ROAD_H);

    // Kerbs
    g.fillStyle(0xBBBBBB);
    g.fillRect(0, ROAD_Y - 9, 1024, 12);
    g.fillRect(0, ROAD_Y + ROAD_H, 1024, 12);

    // Bottom grass
    g.fillStyle(0x228B22); g.fillRect(0, ROAD_Y + ROAD_H + 12, 1024, 700);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.playerG = this.add.graphics();
    this.playerSprite = this.add.container(PLAYER_X, this.playerY, [this.playerG]);
    this.playerSprite.setDepth(10);
    this._redrawMario();
  }

  _redrawMario() {
    const g = this.playerG;
    g.clear();
    // Hat
    g.fillStyle(0xFF0000); g.fillRect(-13,-36,26,8); g.fillRect(-9,-44,18,10);
    // Head
    g.fillStyle(0xFFCC99); g.fillCircle(0,-20,11);
    // Shirt
    g.fillStyle(0xFF0000); g.fillRect(-10,-10,20,13);
    // Overalls
    g.fillStyle(0x0000CC); g.fillRect(-11,3,22,24);
    // Shoes (alternate for walk animation)
    g.fillStyle(0x4A2800);
    if (this._walkFrame === 0) {
      g.fillRect(-12,25,10,7); g.fillRect(2,25,10,7);
    } else {
      g.fillRect(-14,25,10,7); g.fillRect(4,25,10,7);
    }
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.92); bg.fillRect(0, 0, 1024, 50);

    const title = this.goingHome ? '🏠 Дорога додому' : '🏪 Дорога до магазину';
    this.add.text(16, 12, title,
      { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' }).setDepth(21);

    this.timerText = this.add.text(512, 13, '1:00',
      { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(21);

    // Progress bar
    this.add.graphics().setDepth(21).fillStyle(0x333333).fillRect(690, 20, 200, 10);
    this.progressBar = this.add.graphics().setDepth(21);

    // Earnings
    this.add.text(1010, 13, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#00FF88', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(21);

    // From / To labels on road
    const from = this.goingHome ? '← МАГАЗИН' : '← ДАЧА';
    const to   = this.goingHome ? 'ДАЧА →'    : 'МАГАЗИН →';
    this.add.text(20, ROAD_Y + ROAD_H + 22, from,
      { fontSize: '15px', color: '#fff', fontStyle: 'bold',
        backgroundColor: '#00000077', padding: { x: 6, y: 3 } }).setDepth(21);
    this.add.text(1004, ROAD_Y + ROAD_H + 22, to,
      { fontSize: '15px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000077', padding: { x: 6, y: 3 } }).setOrigin(1, 0).setDepth(21);

    // Controls hint
    this.add.text(512, 670, '← → — йти вперед/назад   ↑ ↓ — рухатися по дорозі',
      { fontSize: '13px', color: '#FFFF44', backgroundColor: '#00000066',
        padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(21);
  }

  // ─── Scrolling draw ───────────────────────────────────────────────────────

  _drawScrolling() {
    const g = this.dynG;
    g.clear();

    // Dashed centre line
    const dashW = 55, period = 100;
    const offset = this.scrollX % period;
    for (let x = -offset; x < 1100; x += period) {
      g.fillStyle(0xFFFFFF, 0.6); g.fillRect(x, ROAD_Y + ROAD_H / 2 - 3, dashW, 6);
    }

    // Scenery items (wrapped)
    this.scenery.forEach(item => {
      const sx = ((item.x - this.scrollX) % WORLD_W + WORLD_W) % WORLD_W;
      if (sx > 1100) return;
      if (item.type === 'tree')     this._drawTree(g, sx, item.y, item.size);
      else if (item.type === 'house')    this._drawHouse(g, sx, item.y);
      else if (item.type === 'lamppost') this._drawLamppost(g, sx, item.y);
    });
  }

  _drawTree(g, x, y, size) {
    g.fillStyle(0x8B4513); g.fillRect(x - 5, y, 10, Math.round(size * 0.45));
    g.fillStyle(0x228B22);
    g.fillTriangle(x, y - size, x - size * 0.72, y + 5, x + size * 0.72, y + 5);
  }

  _drawHouse(g, x, y) {
    g.fillStyle(0xDEB887); g.fillRect(x - 34, y - 44, 68, 44);
    g.fillStyle(0x8B2500); g.fillTriangle(x - 42, y - 44, x, y - 86, x + 42, y - 44);
    g.fillStyle(0x6B3A1A); g.fillRect(x - 11, y - 22, 22, 22);
    g.fillStyle(0xADD8E6); g.fillRect(x-30,y-38,16,13); g.fillRect(x+14,y-38,16,13);
  }

  _drawLamppost(g, x, y) {
    g.fillStyle(0x555555);
    g.fillRect(x - 3, y - 68, 6, 68);
    g.fillRect(x - 2, y - 68, 26, 5);
    g.fillStyle(0xFFFF88, 0.88);
    g.fillCircle(x + 24, y - 65, 7);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.done) return;
    const dt = delta / 1000;

    this.elapsed += dt;

    // Player controls scroll (right = forward, left = backward)
    const moving = this.cursors.right.isDown || this.cursors.left.isDown;
    if (this.cursors.right.isDown) this.scrollX = Math.min(this.scrollX + SCROLL_SPEED * dt, WORLD_W * 4);
    if (this.cursors.left.isDown)  this.scrollX = Math.max(this.scrollX - SCROLL_SPEED * dt, 0);

    // Player vertical movement
    if (this.cursors.up.isDown)   this.playerY = Math.max(PLAYER_MIN_Y, this.playerY - PLAYER_V * dt);
    if (this.cursors.down.isDown) this.playerY = Math.min(PLAYER_MAX_Y, this.playerY + PLAYER_V * dt);
    this.playerSprite.setY(this.playerY);

    // Walk animation only while moving
    if (moving) {
      this._walkTimer += delta;
      if (this._walkTimer > 280) {
        this._walkTimer = 0;
        this._walkFrame = 1 - this._walkFrame;
        this._redrawMario();
      }
    }

    // Draw scrolling scene
    this._drawScrolling();

    // Timer
    const remaining = Math.max(0, TOTAL_TIME - this.elapsed);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    this.timerText.setText(`${m}:${String(s).padStart(2,'0')}`);

    this.progressBar.clear();
    this.progressBar.fillStyle(0x00AA44);
    this.progressBar.fillRect(690, 20, 200 * Math.min(1, this.elapsed / TOTAL_TIME), 10);

    // End of commute
    if (this.elapsed >= TOTAL_TIME) {
      this.done = true;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      const next = this.goingHome ? 'HomeScene' : 'ShopScene';
      this.time.delayedCall(500, () => this.scene.start(next));
    }
  }
}
