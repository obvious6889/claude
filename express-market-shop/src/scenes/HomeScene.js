import { GameState } from '../state.js';

const BED_POS    = { x: 820, y: 400 };
const PLAYER_START_HOME = { x: 400, y: 560 };
const INTERACTION_R = 90;
const PLAYER_SPEED  = 180;

const PLAYER_VARIANT = { shirt: 0x2255BB, pants: 0x224488, skin: 0xFFCC99, hair: 0x4A2800 };

export default class HomeScene extends Phaser.Scene {
  constructor() { super({ key: 'HomeScene' }); }

  create() {
    this.nightMin  = 20 * 60;
    this.sleeping  = false;
    this.playerPos = { x: PLAYER_START_HOME.x, y: PLAYER_START_HOME.y };

    this._drawRoom();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this.cameras.main.fadeIn(500);

    if (GameState.earnings >= 100) this._showWin();
  }

  // ─── Room drawing ─────────────────────────────────────────────────────────

  _drawRoom() {
    const g = this.add.graphics();

    // Wall (back, top area)
    g.fillStyle(0xE8D8C4); g.fillRect(0, 56, 1024, 460);

    // Floor (wooden planks)
    g.fillStyle(0xC49A4A); g.fillRect(0, 516, 1024, 184);
    // Plank lines
    g.lineStyle(1, 0xA07830, 0.5);
    for (let y = 530; y < 700; y += 24) g.strokeRect(0, y, 1024, 1);
    for (let x = 0; x < 1024; x += 180) g.strokeRect(x, 516, 1, 184);

    // Baseboard
    g.fillStyle(0x8B6914); g.fillRect(0, 512, 1024, 8);

    // Left wall panel
    g.lineStyle(2, 0xC4A880);
    g.strokeRect(30, 80, 180, 400);
    g.strokeRect(50, 100, 140, 360);

    // Window (right wall) — shows moonlit night outside
    g.fillStyle(0x0A1025); g.fillRect(640, 100, 220, 280);  // night sky
    g.fillStyle(0xFFF8CC, 0.7); g.fillCircle(810, 160, 42); // moon
    g.fillStyle(0x0A1025); g.fillCircle(828, 152, 36);       // crescent
    // Stars in window
    [[660,120],[690,180],[720,130],[760,200],[780,115],[820,210]].forEach(([sx,sy]) => {
      g.fillStyle(0xFFFFFF, 0.7); g.fillCircle(sx, sy, 1.5);
    });
    // Window frame
    g.lineStyle(8, 0x8B6914);
    g.strokeRect(635, 95, 230, 290);
    g.lineStyle(3, 0x8B6914);
    g.strokeRect(745, 95, 1, 290);  // vertical bar
    g.strokeRect(635, 240, 230, 1); // horizontal bar

    // Picture frame on left wall
    g.fillStyle(0x664422); g.fillRect(90, 140, 100, 80);
    g.fillStyle(0x87CEEB); g.fillRect(96, 146, 88, 68);  // sky in picture
    g.fillStyle(0x228B22); g.fillRect(96, 186, 88, 28);  // ground in picture

    // Wardrobe (left)
    g.fillStyle(0x8B5E3C); g.fillRect(60, 330, 120, 200);
    g.fillStyle(0x6B4A2A); g.fillRect(62, 332, 56, 196);
    g.fillStyle(0x6B4A2A); g.fillRect(122, 332, 56, 196);
    g.fillStyle(0xFFD700); g.fillCircle(117, 430, 6); // left handle
    g.fillCircle(127, 430, 6);                        // right handle

    // Nightstand (beside bed)
    g.fillStyle(0x8B5E3C); g.fillRect(904, 418, 80, 100);
    g.fillStyle(0xAA7744); g.fillRect(906, 420, 76, 96);
    // Lamp on nightstand
    g.fillStyle(0xFFFF88, 0.6); g.fillCircle(944, 400, 26); // glow
    g.fillStyle(0xFFFF44); g.fillCircle(944, 410, 10);       // bulb
    g.fillStyle(0x888888); g.fillRect(942, 395, 4, 26);      // stand

    // BED
    // Frame
    g.fillStyle(0x6B3A1A); g.fillRect(680, 360, 220, 160);
    // Mattress
    g.fillStyle(0xF0E8D8); g.fillRect(688, 368, 204, 144);
    // Blanket
    g.fillStyle(0x3355AA); g.fillRect(688, 400, 204, 112);
    // Blanket fold
    g.fillStyle(0x4466BB); g.fillRect(688, 400, 204, 20);
    // Pillow
    g.fillStyle(0xFFFAF0); g.fillRect(700, 372, 80, 32);
    g.fillStyle(0xFFFAF0); g.fillRect(792, 372, 80, 32);
    // Headboard
    g.fillStyle(0x4A2800); g.fillRect(680, 350, 220, 18);

    // "Ліжко" label above bed
    this.add.text(BED_POS.x, BED_POS.y - 60, '🛏',
      { fontSize: '24px' }).setOrigin(0.5).setDepth(2);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    this._drawHuman(g, PLAYER_VARIANT);
    // Apron
    g.fillStyle(0xF0EED8); g.fillRect(-9, -16, 18, 28);
    g.fillStyle(0xDDCCBB); g.fillRect(-6, -26, 12, 10);

    this.playerSprite = this.add.container(this.playerPos.x, this.playerPos.y, [g]);
    this.playerSprite.setDepth(10);
  }

  _drawHuman(g, v) {
    const { shirt, pants, skin, hair } = v;
    g.fillStyle(0x1A1A1A); g.fillRect(-13, 30, 11, 8); g.fillRect(2, 30, 11, 8);
    g.fillStyle(pants); g.fillRect(-11, 8, 9, 24); g.fillRect(2, 8, 9, 24);
    g.fillStyle(shirt); g.fillRect(-13, -20, 26, 30);
    g.fillRect(-21, -18, 8, 22); g.fillRect(13, -18, 8, 22);
    g.fillStyle(skin); g.fillCircle(-17, 5, 5); g.fillCircle(17, 5, 5);
    g.fillStyle(skin); g.fillRect(-4, -28, 8, 10); g.fillCircle(0, -38, 12);
    g.fillStyle(hair); g.fillRect(-12, -50, 24, 14);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _createHUD() {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x1a1a2e, 0.92); g.fillRect(0, 0, 1024, 56);

    this.add.text(14, 10, '🏠 Дача. Ніч.',
      { fontSize: '20px', color: '#AACCFF', fontStyle: 'bold' }).setDepth(21);

    this.add.text(512, 10, `День ${GameState.day - 1} завершено!`,
      { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5, 0).setDepth(21);

    this.clockText = this.add.text(780, 10, '20:00',
      { fontSize: '22px', color: '#8899BB', fontStyle: 'bold' }).setDepth(21);

    this.add.text(1010, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '20px', color: '#00FF88', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(21);

    this.hintText = this.add.text(512, 672, '↑ ↓ ← →  Підійди до ліжка і натисни  C  щоб спати',
      { fontSize: '14px', color: '#FFFF44', backgroundColor: '#00000099',
        padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(22);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cKey    = this.input.keyboard.addKey('C');
    this.cKey.on('down', () => this._trySleep());
  }

  _trySleep() {
    if (this.sleeping) return;
    if (GameState.earnings >= 100) return;
    const dist = Math.hypot(this.playerPos.x - BED_POS.x, this.playerPos.y - BED_POS.y);
    if (dist < INTERACTION_R) {
      this.sleeping = true;
      this.hintText.setText('💤 Добраніч...');
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => this.scene.start('CommuteScene', { destination: 'shop' }));
    }
  }

  // ─── Win screen ───────────────────────────────────────────────────────────

  _showWin() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, 1024, 700);
    this.add.text(512, 180, '🏠', { fontSize: '80px' }).setOrigin(0.5);
    this.add.text(512, 280, 'Вітаємо, Матвію!',
      { fontSize: '50px', color: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5);
    this.add.text(512, 350, 'Ти купив дім! Ціль досягнута!',
      { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
    this.add.text(512, 400, `За ${GameState.day - 1} ${GameState.day - 1 === 1 ? 'день' : 'днів'}`,
      { fontSize: '22px', color: '#AADDFF' }).setOrigin(0.5);
    this.add.text(512, 460, '★★★★', { fontSize: '64px', color: '#FFD700' }).setOrigin(0.5);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (GameState.earnings >= 100 || this.sleeping) return;
    const dt = delta / 1000;

    // Player movement
    const { left, right, up, down } = this.cursors;
    if (left.isDown)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (right.isDown) this.playerPos.x += PLAYER_SPEED * dt;
    if (up.isDown)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (down.isDown)  this.playerPos.y += PLAYER_SPEED * dt;
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 30, 990);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 65, 650);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    // Night clock advances automatically (background)
    this.nightMin += (delta / 1000) * 2;
    const h = Math.floor(this.nightMin / 60) % 24;
    const m = Math.floor(this.nightMin) % 60;
    this.clockText.setText(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

    // Hint: change when near bed
    const dist = Math.hypot(this.playerPos.x - BED_POS.x, this.playerPos.y - BED_POS.y);
    if (dist < INTERACTION_R) {
      this.hintText.setText('C — лягти спати 💤');
    } else {
      this.hintText.setText('↑ ↓ ← →  Підійди до ліжка і натисни  C  щоб спати');
    }

    // Auto-advance if player still hasn't gone to bed (fallback after 7 min)
    if (this.nightMin >= 27 * 60) {
      this.sleeping = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('CommuteScene', { destination: 'shop' }));
    }
  }
}
