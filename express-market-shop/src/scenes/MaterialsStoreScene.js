import { GameState } from '../state.js';
import { MATERIALS } from '../data/materials.js';

export default class MaterialsStoreScene extends Phaser.Scene {
  constructor() { super({ key: 'MaterialsStoreScene' }); }

  create() {
    this._drawInterior();
    this._createHUD();
    this._openPanel();
    this.cameras.main.fadeIn(400);

    document.getElementById('btn-store-leave').addEventListener('click', () => this._leave(), { once: true });
    this.input.keyboard.addKey('ESC').on('down', () => this._leave());
  }

  _drawInterior() {
    const g = this.add.graphics();

    // Floor
    g.fillStyle(0xC49A5A); g.fillRect(0, 56, 1024, 644);
    g.lineStyle(1, 0xA07A44, 0.35);
    for (let y = 80; y < 700; y += 48) g.strokeRect(0, y, 1024, 1);
    for (let x = 0; x < 1024; x += 48) g.strokeRect(x, 56, 1, 644);

    // Walls (back and sides)
    g.fillStyle(0xE8D5A8); g.fillRect(0, 56, 1024, 120);
    g.fillStyle(0xD4C090); g.fillRect(0, 56, 18, 644);
    g.fillStyle(0xD4C090); g.fillRect(1006, 56, 18, 644);
    g.lineStyle(3, 0x8B6914); g.strokeRect(0, 56, 1024, 644);

    // Shelving units along back wall
    const shelfColors = [0xA0522D, 0x8B4513, 0x9A5C2A];
    [100, 330, 560, 790].forEach((sx, i) => {
      const sc = shelfColors[i % 3];
      g.fillStyle(sc);
      g.fillRect(sx, 80, 160, 140);
      g.fillStyle(0x6B3A1A);
      g.fillRect(sx, 80,  160, 8);
      g.fillRect(sx, 130, 160, 8);
      g.fillRect(sx, 180, 160, 8);
      g.fillRect(sx, 215, 160, 8);
    });

    // Counter
    g.fillStyle(0x8B5E3C); g.fillRect(100, 570, 824, 80);
    g.fillStyle(0xAA7744); g.fillRect(104, 574, 816, 44);
    g.fillStyle(0x222222); g.fillRect(460, 556, 104, 20);

    this.add.text(512, 540, '💰 КАСА', { fontSize: '13px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);

    // Exit door
    g.fillStyle(0x5A8A3A); g.fillRect(450, 630, 124, 70);
    g.lineStyle(2, 0x3A6A2A); g.strokeRect(450, 630, 124, 70);
    this.add.text(512, 662, 'ВИХІД', { fontSize: '12px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.text(512, 110, '🏗 БУДМАТЕРІАЛИ', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#4A2800', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  _createHUD() {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x1a1a2e, 0.92); g.fillRect(0, 0, 1024, 56);

    this.add.text(14, 10, '🏗 Магазин будматеріалів',
      { fontSize: '20px', color: '#CC8800', fontStyle: 'bold' }).setDepth(21);

    this.moneyText = this.add.text(1010, 10, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '22px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    this.add.text(512, 14, 'ESC або кнопка — виїхати',
      { fontSize: '13px', color: '#aaa' }).setOrigin(0.5, 0).setDepth(21);
  }

  _openPanel() {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';

    MATERIALS.forEach(m => {
      const inv = GameState.materials[m.id];
      const canAfford = GameState.earnings >= m.price;
      const div = document.createElement('div');
      div.className = 'store-item';
      div.innerHTML = `
        <div class="store-item-name">${m.name}</div>
        <div class="store-item-price">Ціна: ${m.price.toFixed(2)} €/шт</div>
        <div class="store-item-inv">В запасі: <b id="inv-${m.id}">${inv}</b> шт</div>
        <div class="store-item-req">Потрібно для будинку: ${m.req}</div>
        <div class="qty-control">
          <button class="qty-btn" data-id="${m.id}" data-action="minus">−</button>
          <span class="qty-display" id="buy-${m.id}">0</span>
          <button class="qty-btn" data-id="${m.id}" data-action="plus">+</button>
          <button class="btn-confirm" style="margin-left:8px;padding:4px 10px;font-size:13px"
            id="buybtn-${m.id}">Купити</button>
        </div>`;
      grid.appendChild(div);
    });

    // Qty controls
    this._buyQty = {};
    MATERIALS.forEach(m => { this._buyQty[m.id] = 0; });

    grid.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        const delta = e.currentTarget.dataset.action === 'plus' ? 1 : -1;
        this._buyQty[id] = Math.max(0, this._buyQty[id] + delta);
        document.getElementById(`buy-${id}`).textContent = this._buyQty[id];
      });
    });

    MATERIALS.forEach(m => {
      document.getElementById(`buybtn-${m.id}`).addEventListener('click', () => {
        const qty = this._buyQty[m.id];
        if (qty <= 0) return;
        const cost = parseFloat((m.price * qty).toFixed(2));
        if (GameState.earnings < cost) {
          document.getElementById(`buybtn-${m.id}`).textContent = '❌ Мало €';
          setTimeout(() => {
            document.getElementById(`buybtn-${m.id}`).textContent = 'Купити';
          }, 1200);
          return;
        }
        GameState.earnings -= cost;
        GameState.materials[m.id] += qty;
        this._buyQty[m.id] = 0;
        document.getElementById(`buy-${m.id}`).textContent = 0;
        document.getElementById(`inv-${m.id}`).textContent = GameState.materials[m.id];
        this.moneyText.setText(`${GameState.earnings.toFixed(2)} €`);
      });
    });

    document.getElementById('store-panel').style.display = 'block';
  }

  _leave() {
    document.getElementById('store-panel').style.display = 'none';
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => this.scene.start('HomeScene'));
  }
}
