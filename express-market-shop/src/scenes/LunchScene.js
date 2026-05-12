import { GameState } from '../state.js';
import { playSound } from '../utils/sound.js';

const MENU = [
  { key: '1', emoji: '☕', name: 'Кава з пиріжком',  price: 2.50 },
  { key: '2', emoji: '🥗', name: 'Салат',             price: 3.00 },
  { key: '3', emoji: '🥣', name: 'Суп',               price: 4.00 },
  { key: '4', emoji: '🥪', name: 'Бутерброд',         price: 2.50 },
  { key: '5', emoji: '🍕', name: 'Піца',              price: 5.00 },
];
const EAT_DURATION = 2800;

export default class LunchScene extends Phaser.Scene {
  constructor() { super({ key: 'LunchScene' }); }

  init(data) {
    this.returnTo = data?.returnTo || 'ShopScene';
  }

  create() {
    this.ordered  = false;
    this.eatTimer = 0;
    this._done    = false;
    this._leaving = false;

    this._drawCafe();
    this._createMenu();
    this._createHUD();
    this._setupKeys();
    this.cameras.main.setBackgroundColor(0xD4C4A0);
    this.cameras.main.fadeIn(350);
  }

  _drawCafe() {
    const g = this.add.graphics();

    // Floor tiles
    g.fillStyle(0xD4C4A0); g.fillRect(0, 56, 1024, 644);
    g.lineStyle(1, 0xC0B090, 0.4);
    for (let x = 0; x < 1024; x += 72) g.strokeRect(x, 56, 1, 644);
    for (let y = 56; y < 700; y += 72) g.strokeRect(0, y, 1024, 1);

    // Wall
    g.fillStyle(0xFFF5E4); g.fillRect(0, 56, 1024, 80);
    g.fillStyle(0xE8D8B8); g.fillRect(0, 132, 1024, 6);

    // Café banner
    g.fillStyle(0x8B3A00); g.fillRect(300, 62, 424, 52);
    g.lineStyle(3, 0xFFD700); g.strokeRect(300, 62, 424, 52);

    // Window (left wall)
    g.fillStyle(0x87CEEB, 0.55); g.fillRect(55, 150, 210, 160);
    g.lineStyle(4, 0x8B6914); g.strokeRect(55, 150, 210, 160);
    g.lineStyle(2, 0x8B6914);
    g.strokeRect(160, 150, 1, 160);
    g.strokeRect(55, 230, 210, 1);
    // Curtains
    g.fillStyle(0xCC4422, 0.5);
    g.fillTriangle(55, 150, 100, 150, 55, 230);
    g.fillTriangle(265, 150, 220, 150, 265, 230);

    // Counter (left)
    g.fillStyle(0x9B7A4E); g.fillRect(30, 350, 310, 120);
    g.fillStyle(0xBB9A6E); g.fillRect(30, 350, 310, 14);
    g.lineStyle(2, 0x7A5A2E); g.strokeRect(30, 350, 310, 120);
    // Coffee machine
    g.fillStyle(0x2A2A2A); g.fillRect(65, 328, 58, 28);
    g.fillStyle(0xCC2200); g.fillCircle(94, 336, 10);
    g.fillStyle(0x888888); g.fillRect(72, 350, 44, 6);

    // Main table (center-right) where player sits
    const tx = 680, ty = 390;
    g.fillStyle(0x8B5E3C); g.fillRect(tx-90, ty-44, 180, 96);
    g.fillStyle(0xAA7744); g.fillRect(tx-86, ty-40, 172, 88);
    g.fillStyle(0x6B3A1A);
    g.fillRect(tx-78, ty+44, 12, 18); g.fillRect(tx+66, ty+44, 12, 18);
    g.fillRect(tx-78, ty-44, 12, 18); g.fillRect(tx+66, ty-44, 12, 18);
    // Chairs
    g.fillStyle(0x6B4A2A);
    g.fillRect(tx-108, ty-26, 14, 52);
    g.fillRect(tx+94,  ty-26, 14, 52);
    g.fillRect(tx-42,  ty-62, 84, 14);
    g.fillRect(tx-42,  ty+52, 84, 14);

    // Second table (background)
    const tx2 = 820, ty2 = 240;
    g.fillStyle(0x8B5E3C); g.fillRect(tx2-60, ty2-32, 120, 68);
    g.fillStyle(0xAA7744); g.fillRect(tx2-56, ty2-28, 112, 60);

    // Plant (right corner)
    g.fillStyle(0x5A3810); g.fillRect(940, 500, 42, 60);
    g.fillStyle(0x228B22); g.fillCircle(961, 480, 40);
    g.fillStyle(0x2A9B2A); g.fillCircle(980, 464, 28); g.fillCircle(942, 468, 28);

    // Player character sitting at table
    const px = 680, py = 362;
    g.fillStyle(0x1A1A1A); g.fillRect(px-12, py+28, 9, 7); g.fillRect(px+3, py+28, 9, 7);
    g.fillStyle(0x224488); g.fillRect(px-10, py+6, 8, 24); g.fillRect(px+2, py+6, 8, 24);
    g.fillStyle(0x2255BB); g.fillRect(px-13, py-18, 26, 28);
    g.fillStyle(0xFFCC99); g.fillCircle(px-17, py+4, 5); g.fillCircle(px+17, py+4, 5);
    g.fillStyle(0xFFCC99); g.fillRect(px-4, py-26, 8, 10); g.fillCircle(px, py-36, 12);
    g.fillStyle(0x4A2800); g.fillRect(px-12, py-50, 24, 14);

    // Plate on table
    this.plateG = this.add.graphics().setDepth(4);
    this.plateG.fillStyle(0xFFFFFF, 0.9); this.plateG.fillCircle(680, 376, 24);
    this.plateG.lineStyle(2, 0xDDDDDD); this.plateG.strokeCircle(680, 376, 24);
  }

  _createMenu() {
    const mg = this.add.graphics().setDepth(5);
    mg.fillStyle(0x160C04, 0.97);
    mg.fillRoundedRect(380, 150, 290, 290, 12);
    mg.lineStyle(2, 0xAA8833);
    mg.strokeRoundedRect(380, 150, 290, 290, 12);

    this.add.text(525, 166, '📋 МЕНЮ ОБІДУ', {
      fontSize: '19px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(6);

    this.add.text(525, 190, '───────────────────', {
      fontSize: '11px', color: '#664422',
    }).setOrigin(0.5, 0).setDepth(6);

    this.menuRows = [];
    MENU.forEach((item, i) => {
      const y = 210 + i * 44;
      const canAfford = GameState.earnings >= item.price;
      const col = canAfford ? '#FFEECC' : '#555555';

      const row = this.add.text(396, y, `${item.key}. ${item.emoji}  ${item.name}`, {
        fontSize: '14px', color: col,
      }).setDepth(6);
      const priceT = this.add.text(664, y, `${item.price.toFixed(2)}€`, {
        fontSize: '14px', color: canAfford ? '#88FF88' : '#444',
        fontStyle: 'bold',
      }).setOrigin(1, 0).setDepth(6);

      if (canAfford) {
        row.setInteractive();
        row.on('pointerover', () => row.setStyle({ color: '#FFD700' }));
        row.on('pointerout',  () => row.setStyle({ color: '#FFEECC' }));
        row.on('pointerdown', () => this._order(item));
      }
      this.menuRows.push(row);
    });

    this.walletText = this.add.text(525, 428, `💰 Гаманець: ${GameState.earnings.toFixed(2)} €`, {
      fontSize: '14px', color: '#AADDFF', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(6);
  }

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.95); bg.fillRect(0, 0, 1024, 56);
    this.add.text(512, 12, '🍽 Обідня перерва — КАФЕ «СМАЧНОГО!»', {
      fontSize: '24px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(21);

    this.statusText = this.add.text(512, 500, 'Оберіть страву зі списку  (клавіші 1–5 або клікніть)', {
      fontSize: '16px', color: '#FFEECC',
      backgroundColor: '#00000077', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(21);

    this.eatBarG = this.add.graphics().setDepth(21);

    const skip = this.add.text(512, 650, 'Пропустити обід →', {
      fontSize: '14px', color: '#556677',
    }).setOrigin(0.5).setDepth(21).setInteractive();
    skip.on('pointerover', () => skip.setStyle({ color: '#AACCFF' }));
    skip.on('pointerout',  () => skip.setStyle({ color: '#556677' }));
    skip.on('pointerdown', () => this._returnToWork());
  }

  _setupKeys() {
    MENU.forEach((item, i) => {
      this.input.keyboard.addKey(49 + i).on('down', () => this._order(item));
    });
  }

  _order(item) {
    if (this.ordered || this._done) return;
    if (GameState.earnings < item.price) {
      this.statusText.setText('❌ Не вистачає грошей! Пропусти обід.');
      return;
    }
    this.ordered = true;
    GameState.earnings = parseFloat((GameState.earnings - item.price).toFixed(2));
    this.walletText.setText(`💰 Гаманець: ${GameState.earnings.toFixed(2)} €`);
    this.menuRows.forEach(r => r.disableInteractive().setAlpha(0.4));
    this.statusText.setText(`${item.emoji} Очікуємо замовлення...`);

    // Dish on plate
    this.plateG.clear();
    this.plateG.fillStyle(0xFFFFFF, 0.9); this.plateG.fillCircle(680, 376, 24);
    this.plateG.lineStyle(2, 0xDDDDDD); this.plateG.strokeCircle(680, 376, 24);
    this.add.text(680, 369, item.emoji, { fontSize: '26px' }).setOrigin(0.5).setDepth(5);
    playSound('order');
  }

  update(_, delta) {
    if (!this.ordered || this._done) return;
    this.eatTimer += delta;
    const pct = Math.min(1, this.eatTimer / EAT_DURATION);

    this.eatBarG.clear();
    this.eatBarG.fillStyle(0x333333); this.eatBarG.fillRoundedRect(362, 532, 300, 14, 6);
    this.eatBarG.fillStyle(pct >= 1 ? 0x00AA44 : 0xFF8800);
    this.eatBarG.fillRoundedRect(362, 532, Math.floor(300 * pct), 14, 6);

    if (pct < 1) {
      this.statusText.setText(`🍴 Їмо... ${Math.round(pct * 100)}%`);
      return;
    }
    if (!this._finished) {
      this._finished = true;
      GameState.fedBonus = true;
      playSound('serve');
      this.statusText.setText('😋 Смачно! Ти ситий!\n+10% прибутку до кінця дня 🌟');
      this.statusText.setStyle({ color: '#00FF88' });

      const btn = this.add.text(512, 584, '▶ Повернутись на роботу',
        { fontSize: '20px', color: '#FFD700', backgroundColor: '#1a3a6a',
          padding: { x: 22, y: 12 }, fontStyle: 'bold' })
        .setOrigin(0.5).setInteractive().setDepth(22);
      btn.on('pointerover', () => btn.setStyle({ color: '#fff', backgroundColor: '#2255AA' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#FFD700', backgroundColor: '#1a3a6a' }));
      btn.on('pointerdown', () => this._returnToWork());
      this.input.keyboard.addKey('ENTER').on('down', () => this._returnToWork());
    }
  }

  _returnToWork() {
    if (this._leaving) return;
    this._leaving = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(350, () => {
      this.scene.stop('LunchScene');
      this.scene.wake(this.returnTo);
    });
  }
}
