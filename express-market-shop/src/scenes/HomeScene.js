import { GameState } from '../state.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super({ key: 'HomeScene' }); }

  create() {
    this.nightMin = 20 * 60;
    this._drawScene();
    this._drawHUD();
    this.cameras.main.fadeIn(500);

    if (GameState.earnings >= 100) this._showWin();
  }

  _drawScene() {
    const g = this.add.graphics();

    // Night sky
    g.fillStyle(0x0A1020); g.fillRect(0, 0, 1024, 700);

    // Stars
    for (let i = 0; i < 80; i++) {
      const alpha = Phaser.Math.FloatBetween(0.4, 1.0);
      g.fillStyle(0xFFFFFF, alpha);
      g.fillCircle(Phaser.Math.Between(0, 1024), Phaser.Math.Between(0, 420), Phaser.Math.Between(1, 2));
    }

    // Moon
    g.fillStyle(0xFFF8CC); g.fillCircle(870, 90, 55);
    g.fillStyle(0x0A1020); g.fillCircle(895, 80, 46);

    // Ground
    g.fillStyle(0x0D1F0D); g.fillRect(0, 480, 1024, 220);
    // Road
    g.fillStyle(0x1A1A1A); g.fillRect(440, 460, 144, 240);
    // Road markings
    g.fillStyle(0x444444);
    for (let y = 480; y < 700; y += 40) g.fillRect(504, y, 16, 24);

    // House body (dark)
    g.fillStyle(0x3D2B1A); g.fillRect(330, 265, 360, 215);
    // Roof
    g.fillStyle(0x2A1A0A); g.fillTriangle(300, 265, 510, 120, 720, 265);
    // Door
    g.fillStyle(0x221508); g.fillRect(448, 375, 75, 105);
    // Window (lit)
    g.fillStyle(0xFFBB44, 0.85); g.fillRect(580, 305, 70, 55);
    // Window (dark)
    g.fillStyle(0x223322, 0.7); g.fillRect(360, 305, 70, 55);

    // Trees (dark silhouettes)
    [[110, 430], [200, 415], [810, 430], [900, 415]].forEach(([tx, ty]) => {
      g.fillStyle(0x0A1A0A);
      g.fillTriangle(tx, ty - 110, tx - 40, ty, tx + 40, ty);
      g.fillRect(tx - 7, ty, 14, 38);
    });
  }

  _drawHUD() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.5);
    g.fillRect(280, 30, 464, 130);
    g.lineStyle(1, 0x334466);
    g.strokeRect(280, 30, 464, 130);

    this.add.text(512, 48, 'Магазин закрито. Ніч.', {
      fontSize: '22px', color: '#AACCFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(512, 82, `День ${GameState.day - 1} завершено!  Заробіток: ${GameState.earnings.toFixed(2)} € / 100 €`, {
      fontSize: '16px', color: '#00FF88',
    }).setOrigin(0.5);

    const pct = Math.min(1, GameState.earnings / 100);
    const stars = pct < 0.33 ? 1 : pct < 0.66 ? 2 : pct < 1 ? 3 : 4;
    this.add.text(512, 112, '★'.repeat(stars) + '☆'.repeat(4 - stars), {
      fontSize: '30px', color: '#FFD700',
    }).setOrigin(0.5);

    // Night clock
    this.clockText = this.add.text(512, 390, '20:00', {
      fontSize: '52px', color: '#8899BB', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(512, 450, '💤 Продавець спить...', {
      fontSize: '18px', color: '#445566',
    }).setOrigin(0.5);
  }

  _showWin() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.75); g.fillRect(0, 0, 1024, 700);

    this.add.text(512, 180, '🏠', { fontSize: '80px' }).setOrigin(0.5);
    this.add.text(512, 280, 'Вітаємо, Матвію!', {
      fontSize: '50px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(512, 350, 'Ти купив дім! Ціль досягнута!', {
      fontSize: '28px', color: '#fff',
    }).setOrigin(0.5);
    this.add.text(512, 400, `За ${GameState.day - 1} ${GameState.day - 1 === 1 ? 'день' : 'днів'}`, {
      fontSize: '22px', color: '#AADDFF',
    }).setOrigin(0.5);
    this.add.text(512, 460, '★★★★', { fontSize: '64px', color: '#FFD700' }).setOrigin(0.5);
  }

  update(time, delta) {
    if (GameState.earnings >= 100) return;

    // Night passes: 20:00 → 09:00 next day (skip 7 hours in ~3.5 real seconds)
    // 7 real minutes / 2x speed = 3.5 real seconds
    this.nightMin += (delta / 1000) * 2;

    const h = Math.floor(this.nightMin / 60) % 24;
    const m = Math.floor(this.nightMin) % 60;
    this.clockText.setText(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);

    if (this.nightMin >= 27 * 60) {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('CommuteScene', { destination: 'shop' }));
    }
  }
}
