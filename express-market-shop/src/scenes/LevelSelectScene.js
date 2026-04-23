import { GameState, LEVEL_CONFIG, resetForLevel } from '../state.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelSelectScene' }); }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    this.cameras.main.fadeIn(400);

    this.add.text(512, 50, '🛒 Експрес Маркет Магазин',
      { fontSize: '32px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(512, 100, 'Оберіть рівень',
      { fontSize: '22px', color: '#AACCFF' }).setOrigin(0.5);

    const levels = [
      { n: 1, desc: 'Маленький магазин' },
      { n: 2, desc: 'Середній магазин' },
      { n: 3, desc: 'Великий магазин' },
    ];

    levels.forEach((lv, i) => {
      const x = 190 + i * 320;
      const y = 390;
      const unlocked = GameState.maxUnlocked >= lv.n;
      const cfg = LEVEL_CONFIG[lv.n];

      const g = this.add.graphics();
      g.fillStyle(unlocked ? 0x1a2a4a : 0x222222);
      g.fillRoundedRect(x - 140, y - 170, 280, 340, 12);
      g.lineStyle(3, unlocked ? 0x4488FF : 0x444444);
      g.strokeRoundedRect(x - 140, y - 170, 280, 340, 12);

      this.add.text(x, y - 130, `Рівень ${lv.n}`,
        { fontSize: '30px', color: unlocked ? '#FFD700' : '#555', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(x, y - 82, lv.desc,
        { fontSize: '15px', color: unlocked ? '#AADDFF' : '#444' }).setOrigin(0.5);
      this.add.text(x, y - 44, `👥 ${cfg.customers} покупців/день`,
        { fontSize: '15px', color: unlocked ? '#FFFFFF' : '#444' }).setOrigin(0.5);
      this.add.text(x, y - 4, `🏠 Ціль: ${cfg.goal} €`,
        { fontSize: '22px', color: unlocked ? '#00FF88' : '#444', fontStyle: 'bold' }).setOrigin(0.5);

      if (unlocked) {
        const btn = this.add.text(x, y + 90, '▶ ГРАТИ',
          { fontSize: '24px', color: '#FFD700', backgroundColor: '#1a3a6a',
            padding: { x: 24, y: 12 }, fontStyle: 'bold' })
          .setOrigin(0.5).setInteractive();
        btn.on('pointerover', () => btn.setStyle({ color: '#fff', backgroundColor: '#2255AA' }));
        btn.on('pointerout',  () => btn.setStyle({ color: '#FFD700', backgroundColor: '#1a3a6a' }));
        btn.on('pointerdown', () => {
          resetForLevel(lv.n);
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.time.delayedCall(400, () => this.scene.start('CommuteScene', { destination: 'shop' }));
        });
      } else {
        this.add.text(x, y + 70, '🔒 Закрито',
          { fontSize: '22px', color: '#555' }).setOrigin(0.5);
        this.add.text(x, y + 110, `Пройди рівень ${lv.n - 1}`,
          { fontSize: '13px', color: '#444' }).setOrigin(0.5);
      }
    });
  }
}
