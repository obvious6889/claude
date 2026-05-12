import { getRecords } from '../utils/records.js';

const JOB_META = [
  { id: 'shop',         emoji: '🛒', name: 'Магазин',      color: 0x4CAF50, textColor: '#88FF88' },
  { id: 'construction', emoji: '🏗',  name: 'Будівництво', color: 0xCC8800, textColor: '#FFCC44' },
  { id: 'restaurant',   emoji: '🍽',  name: 'Ресторан',    color: 0xCC44AA, textColor: '#FF88CC' },
  { id: 'delivery',     emoji: '🚲', name: 'Доставка',     color: 0xFF8800, textColor: '#FFAA44' },
];

const LEVELS = [1, 2, 3];

export default class RecordsScene extends Phaser.Scene {
  constructor() { super({ key: 'RecordsScene' }); }

  init(data) {
    this.returnTo = data?.returnTo || 'LevelSelectScene';
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0d1627);
    this.cameras.main.fadeIn(350);

    // Stars background
    const g = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const sx = (i * 173 + 40) % 1024, sy = (i * 97 + 20) % 700;
      g.fillStyle(0xFFFFFF, 0.15 + (i % 3) * 0.1); g.fillCircle(sx, sy, 1 + (i % 2));
    }

    this.add.text(512, 36, '🏆 Таблиця рекордів', {
      fontSize: '36px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const records = getRecords();
    const colW = 234, startX = 26, startY = 110;

    JOB_META.forEach((job, ji) => {
      const cx = startX + ji * colW;
      const jobRec = records[job.id] || {};

      // Column header
      const hg = this.add.graphics();
      hg.fillStyle(0x111122); hg.fillRoundedRect(cx, startY, colW - 12, 54, 8);
      hg.lineStyle(2, job.color); hg.strokeRoundedRect(cx, startY, colW - 12, 54, 8);

      this.add.text(cx + (colW - 12) / 2, startY + 10, `${job.emoji} ${job.name}`, {
        fontSize: '18px', color: job.textColor, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      // Level rows
      LEVELS.forEach((lv, li) => {
        const ry = startY + 70 + li * 160;
        const rec = jobRec[lv];

        const rg = this.add.graphics();
        rg.fillStyle(rec ? 0x0a1a0a : 0x111111);
        rg.fillRoundedRect(cx, ry, colW - 12, 145, 8);
        rg.lineStyle(2, rec ? job.color : 0x333333, rec ? 1 : 0.4);
        rg.strokeRoundedRect(cx, ry, colW - 12, 145, 8);

        this.add.text(cx + (colW - 12) / 2, ry + 12, `Рівень ${lv}`, {
          fontSize: '14px', color: rec ? '#AACCFF' : '#444', fontStyle: 'bold',
        }).setOrigin(0.5, 0);

        if (rec) {
          this.add.text(cx + (colW - 12) / 2, ry + 38, '📅', { fontSize: '24px' }).setOrigin(0.5, 0);
          this.add.text(cx + (colW - 12) / 2, ry + 68, `${rec.days} ${rec.days === 1 ? 'день' : rec.days < 5 ? 'дні' : 'днів'}`, {
            fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
          }).setOrigin(0.5, 0);
          this.add.text(cx + (colW - 12) / 2, ry + 93, 'найкраще', {
            fontSize: '10px', color: '#668866',
          }).setOrigin(0.5, 0);

          this.add.text(cx + (colW - 12) / 2, ry + 110, `💰 ${rec.earnings.toFixed(2)} €`, {
            fontSize: '16px', color: '#00FF88', fontStyle: 'bold',
          }).setOrigin(0.5, 0);
        } else {
          this.add.text(cx + (colW - 12) / 2, ry + 55, '—', {
            fontSize: '28px', color: '#333',
          }).setOrigin(0.5, 0);
          this.add.text(cx + (colW - 12) / 2, ry + 95, 'не зіграно', {
            fontSize: '12px', color: '#333',
          }).setOrigin(0.5, 0);
        }
      });
    });

    // Back button
    const back = this.add.text(512, 662, '← Назад', {
      fontSize: '20px', color: '#AACCFF', backgroundColor: '#001133',
      padding: { x: 22, y: 10 }, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive();
    back.on('pointerover', () => back.setStyle({ color: '#fff', backgroundColor: '#002255' }));
    back.on('pointerout',  () => back.setStyle({ color: '#AACCFF', backgroundColor: '#001133' }));
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start(this.returnTo));
    });

    this.input.keyboard.addKey('ESCAPE').on('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start(this.returnTo));
    });
  }
}
