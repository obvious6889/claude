import { GameState } from '../state.js';

export default class JobSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'JobSelectScene' }); }

  create() {
    if (GameState.job) {
      this.scene.start('LevelSelectScene');
      return;
    }

    this.cameras.main.fadeIn(500);

    const g = this.add.graphics();
    g.fillStyle(0x0d1627); g.fillRect(0, 0, 1024, 700);
    for (let i = 0; i < 70; i++) {
      const sx = (i * 173 + 40) % 1024, sy = (i * 97 + 20) % 700;
      g.fillStyle(0xFFFFFF, 0.2 + (i % 3) * 0.15); g.fillCircle(sx, sy, 1 + (i % 2));
    }

    this.add.text(512, 46, '🎮 Оберіть роботу', {
      fontSize: '42px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(512, 106, 'Яка робота вам до душі? Виберіть — і вперед!', {
      fontSize: '18px', color: '#AACCFF',
    }).setOrigin(0.5);

    const jobs = [
      {
        id: 'shop',
        emoji: '🛒',
        name: 'Магазин',
        desc: 'Управляй продуктовим\nмагазином. Приймай\nзамовлення, встановлюй\nціни, лови злодіїв!',
        bg: 0x0a1f0a, border: 0x4CAF50, labelColor: '#88FF88',
      },
      {
        id: 'construction',
        emoji: '🏗',
        name: 'Будівництво',
        desc: 'Керуй краном на\nбудівельному майданчику.\nВиконуй замовлення,\nзводь будівлі!',
        bg: 0x1f1400, border: 0xCC8800, labelColor: '#FFCC44',
      },
      {
        id: 'restaurant',
        emoji: '🍽',
        name: 'Ресторан',
        desc: 'Обслуговуй гостей.\nПриймай замовлення,\nготуй страви,\nподавай та збирай чайові!',
        bg: 0x1a0a18, border: 0xCC44AA, labelColor: '#FF88CC',
      },
    ];

    const CXS = [185, 512, 839];
    const W = 268, H = 408;
    const CARD_CY = 430;

    jobs.forEach((job, i) => {
      const cx = CXS[i];
      const top = CARD_CY - H / 2;

      const bg = this.add.graphics();
      const drawCard = (hover) => {
        bg.clear();
        bg.fillStyle(job.bg);
        bg.fillRoundedRect(cx - W/2, top, W, H, 16);
        bg.lineStyle(hover ? 4 : 2, job.border);
        bg.strokeRoundedRect(cx - W/2, top, W, H, 16);
      };
      drawCard(false);

      this.add.text(cx, top + 44, job.emoji, { fontSize: '58px' }).setOrigin(0.5);
      this.add.text(cx, top + 110, job.name, {
        fontSize: '28px', color: job.labelColor, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(cx, top + 154, job.desc, {
        fontSize: '13px', color: '#CCCCCC', align: 'center', lineSpacing: 5,
      }).setOrigin(0.5, 0);

      const btn = this.add.text(cx, top + H - 42, '▶ ОБРАТИ', {
        fontSize: '20px', color: '#FFD700', backgroundColor: '#1a3a6a',
        padding: { x: 22, y: 11 }, fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive();

      btn.on('pointerover',  () => { drawCard(true);  btn.setStyle({ color: '#fff', backgroundColor: '#2255AA' }); });
      btn.on('pointerout',   () => { drawCard(false); btn.setStyle({ color: '#FFD700', backgroundColor: '#1a3a6a' }); });
      btn.on('pointerdown',  () => {
        GameState.job = job.id;
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => this.scene.start('LevelSelectScene'));
      });
    });
  }
}
