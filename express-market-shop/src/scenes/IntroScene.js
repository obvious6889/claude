export default class IntroScene extends Phaser.Scene {
  constructor() { super({ key: 'IntroScene' }); }

  create() {
    const g = this.add.graphics();

    // Sky
    g.fillStyle(0x87CEEB); g.fillRect(0, 0, 1024, 700);
    // Ground
    g.fillStyle(0x228B22); g.fillRect(0, 500, 1024, 200);
    // Road
    g.fillStyle(0x888888); g.fillRect(440, 480, 144, 220);

    // House body
    g.fillStyle(0xDEB887); g.fillRect(340, 290, 340, 210);
    // Roof
    g.fillStyle(0x8B2500); g.fillTriangle(310, 290, 510, 130, 710, 290);
    // Door
    g.fillStyle(0x6B3A2A); g.fillRect(455, 390, 70, 110);
    // Windows
    g.fillStyle(0xADD8E6);
    g.fillRect(360, 330, 70, 55);
    g.fillRect(590, 330, 70, 55);

    // Sun
    g.fillStyle(0xFFD700); g.fillCircle(880, 90, 65);

    // Trees
    [[100, 420], [190, 400], [820, 420], [910, 400]].forEach(([tx, ty]) => {
      g.fillStyle(0x228B22); g.fillTriangle(tx, ty - 110, tx - 42, ty, tx + 42, ty);
      g.fillStyle(0x8B4513); g.fillRect(tx - 8, ty, 16, 40);
    });

    // Clouds
    g.fillStyle(0xFFFFFF, 0.9);
    [[200, 80], [500, 60], [750, 100]].forEach(([cx, cy]) => {
      g.fillCircle(cx, cy, 35);
      g.fillCircle(cx + 40, cy - 10, 42);
      g.fillCircle(cx + 80, cy, 35);
    });

    this.add.text(512, 40, 'Дача. Ранок.', {
      fontSize: '38px', color: '#333', fontStyle: 'bold',
      stroke: '#fff', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(512, 560, '→ Час на роботу! ←', {
      fontSize: '26px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#333', strokeThickness: 3,
    }).setOrigin(0.5);

    // Mario player at door
    const playerG = this.add.graphics();
    this._drawMario(playerG);
    this.player = this.add.container(490, 430, [playerG]);

    // Walk out of door towards screen
    this.tweens.add({
      targets: this.player,
      y: 750,
      duration: 2200,
      delay: 600,
      ease: 'Linear',
    });

    this.cameras.main.fadeIn(400);

    this.time.delayedCall(3200, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('ShopScene'));
    });
  }

  _drawMario(g) {
    // Hat
    g.fillStyle(0xFF0000); g.fillRect(-14, -38, 28, 8); g.fillRect(-10, -46, 20, 10);
    // Head
    g.fillStyle(0xFFCC99); g.fillCircle(0, -22, 12);
    // Shirt
    g.fillStyle(0xFF0000); g.fillRect(-11, -12, 22, 14);
    // Overalls
    g.fillStyle(0x0000CC); g.fillRect(-12, 2, 24, 26);
    // Shoes
    g.fillStyle(0x4A2800); g.fillRect(-12, 26, 10, 8); g.fillRect(2, 26, 10, 8);
  }
}
