import { GameState, LEVEL_CONFIG } from '../state.js';

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

    const goal = LEVEL_CONFIG[GameState.level].goal;
    if (GameState.earnings >= goal) this._showWin();
  }

  // ─── Room drawing ─────────────────────────────────────────────────────────

  _drawRoom() {
    const g = this.add.graphics();

    g.fillStyle(0xE8D8C4); g.fillRect(0, 56, 1024, 460);

    g.fillStyle(0xC49A4A); g.fillRect(0, 516, 1024, 184);
    g.lineStyle(1, 0xA07830, 0.5);
    for (let y = 530; y < 700; y += 24) g.strokeRect(0, y, 1024, 1);
    for (let x = 0; x < 1024; x += 180) g.strokeRect(x, 516, 1, 184);

    g.fillStyle(0x8B6914); g.fillRect(0, 512, 1024, 8);

    g.lineStyle(2, 0xC4A880);
    g.strokeRect(30, 80, 180, 400);
    g.strokeRect(50, 100, 140, 360);

    g.fillStyle(0x0A1025); g.fillRect(640, 100, 220, 280);
    g.fillStyle(0xFFF8CC, 0.7); g.fillCircle(810, 160, 42);
    g.fillStyle(0x0A1025); g.fillCircle(828, 152, 36);
    [[660,120],[690,180],[720,130],[760,200],[780,115],[820,210]].forEach(([sx,sy]) => {
      g.fillStyle(0xFFFFFF, 0.7); g.fillCircle(sx, sy, 1.5);
    });
    g.lineStyle(8, 0x8B6914);
    g.strokeRect(635, 95, 230, 290);
    g.lineStyle(3, 0x8B6914);
    g.strokeRect(745, 95, 1, 290);
    g.strokeRect(635, 240, 230, 1);

    g.fillStyle(0x664422); g.fillRect(90, 140, 100, 80);
    g.fillStyle(0x87CEEB); g.fillRect(96, 146, 88, 68);
    g.fillStyle(0x228B22); g.fillRect(96, 186, 88, 28);

    g.fillStyle(0x8B5E3C); g.fillRect(60, 330, 120, 200);
    g.fillStyle(0x6B4A2A); g.fillRect(62, 332, 56, 196);
    g.fillStyle(0x6B4A2A); g.fillRect(122, 332, 56, 196);
    g.fillStyle(0xFFD700); g.fillCircle(117, 430, 6);
    g.fillCircle(127, 430, 6);

    g.fillStyle(0x8B5E3C); g.fillRect(904, 418, 80, 100);
    g.fillStyle(0xAA7744); g.fillRect(906, 420, 76, 96);
    g.fillStyle(0xFFFF88, 0.6); g.fillCircle(944, 400, 26);
    g.fillStyle(0xFFFF44); g.fillCircle(944, 410, 10);
    g.fillStyle(0x888888); g.fillRect(942, 395, 4, 26);

    g.fillStyle(0x6B3A1A); g.fillRect(680, 360, 220, 160);
    g.fillStyle(0xF0E8D8); g.fillRect(688, 368, 204, 144);
    g.fillStyle(0x3355AA); g.fillRect(688, 400, 204, 112);
    g.fillStyle(0x4466BB); g.fillRect(688, 400, 204, 20);
    g.fillStyle(0xFFFAF0); g.fillRect(700, 372, 80, 32);
    g.fillStyle(0xFFFAF0); g.fillRect(792, 372, 80, 32);
    g.fillStyle(0x4A2800); g.fillRect(680, 350, 220, 18);

    this.add.text(BED_POS.x, BED_POS.y - 60, '🛏',
      { fontSize: '24px' }).setOrigin(0.5).setDepth(2);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    const g = this.add.graphics();
    this._drawHuman(g, PLAYER_VARIANT);
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

    this.add.text(14, 10, `🏠 Рівень ${GameState.level} — Ніч.`,
      { fontSize: '18px', color: '#AACCFF', fontStyle: 'bold' }).setDepth(21);

    this.add.text(512, 10, `День ${GameState.day - 1} завершено!`,
      { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5, 0).setDepth(21);

    this.clockText = this.add.text(780, 10, '20:00',
      { fontSize: '22px', color: '#8899BB', fontStyle: 'bold' }).setDepth(21);

    this.add.text(1010, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '20px', color: '#00FF88', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(21);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    this.add.text(1010, 34, `Ціль: ${goal} €`,
      { fontSize: '12px', color: '#88BBFF' }).setOrigin(1, 0).setDepth(21);

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
    const goal = LEVEL_CONFIG[GameState.level].goal;
    if (GameState.earnings >= goal) return;
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
    const level = GameState.level;
    const goal  = LEVEL_CONFIG[level].goal;
    const isLastLevel = level >= 3;

    if (!isLastLevel && GameState.maxUnlocked <= level) {
      GameState.maxUnlocked = level + 1;
    }

    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x000000, 0.78); g.fillRect(0, 0, 1024, 700);

    this.add.text(512, 80, isLastLevel ? '🏆' : '🏠',
      { fontSize: '80px' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 180, `Рівень ${level} пройдено!`,
      { fontSize: '46px', color: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(51);
    this.add.text(512, 250, `Ти заробив ${GameState.earnings.toFixed(2)} € з ${goal} €`,
      { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 295, `За ${GameState.day - 1} ${GameState.day - 1 === 1 ? 'день' : 'днів'}`,
      { fontSize: '20px', color: '#AADDFF' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 355, '★★★★',
      { fontSize: '64px', color: '#FFD700' }).setOrigin(0.5).setDepth(51);

    if (isLastLevel) {
      this.add.text(512, 455, '🏆 Ти пройшов всю гру! Молодець! 🏆',
        { fontSize: '28px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(51);
      this.add.text(512, 510, 'Натисни F5 щоб грати знову',
        { fontSize: '18px', color: '#aaa' }).setOrigin(0.5).setDepth(51);
    } else {
      const btn = this.add.text(512, 455, `▶ Рівень ${level + 1}`,
        { fontSize: '28px', color: '#FFD700', backgroundColor: '#1a3a6a',
          padding: { x: 24, y: 14 }, fontStyle: 'bold' })
        .setOrigin(0.5).setInteractive().setDepth(51);
      btn.on('pointerover', () => btn.setStyle({ color: '#fff', backgroundColor: '#2255AA' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#FFD700', backgroundColor: '#1a3a6a' }));
      btn.on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => this.scene.start('LevelSelectScene'));
      });
    }
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    const goal = LEVEL_CONFIG[GameState.level].goal;
    if (GameState.earnings >= goal || this.sleeping) return;
    const dt = delta / 1000;

    const { left, right, up, down } = this.cursors;
    if (left.isDown)  this.playerPos.x -= PLAYER_SPEED * dt;
    if (right.isDown) this.playerPos.x += PLAYER_SPEED * dt;
    if (up.isDown)    this.playerPos.y -= PLAYER_SPEED * dt;
    if (down.isDown)  this.playerPos.y += PLAYER_SPEED * dt;
    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 30, 990);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 65, 650);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    this.nightMin += (delta / 1000) * 2;
    const h = Math.floor(this.nightMin / 60) % 24;
    const m = Math.floor(this.nightMin) % 60;
    this.clockText.setText(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

    const dist = Math.hypot(this.playerPos.x - BED_POS.x, this.playerPos.y - BED_POS.y);
    if (dist < INTERACTION_R) {
      this.hintText.setText('C — лягти спати 💤');
    } else {
      this.hintText.setText('↑ ↓ ← →  Підійди до ліжка і натисни  C  щоб спати');
    }

    if (this.nightMin >= 27 * 60) {
      this.sleeping = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('CommuteScene', { destination: 'shop' }));
    }
  }
}
