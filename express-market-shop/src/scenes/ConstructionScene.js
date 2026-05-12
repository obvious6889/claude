import { GameState, LEVEL_CONFIG } from '../state.js';
import { UPGRADES } from '../data/upgrades.js';
import { playSound } from '../utils/sound.js';

const COLS = 10, ROWS = 8, TILE = 56;
const OX   = Math.floor((1024 - COLS * TILE) / 2); // 232
const OY   = 108;
const TRACK_Y = OY - 28;

const BUILD_TILES = [
  { id: 'foundation', name: 'Фундамент', color: 0x8A8A8A, darkColor: 0x606060 },
  { id: 'brick',      name: 'Цегла',    color: 0xCC5533, darkColor: 0x993311 },
  { id: 'beam',       name: 'Балка',    color: 0xAA8822, darkColor: 0x775500 },
];

const ORDER_POOL = [
  { name: 'Сарай',     req: { foundation: 8,  brick: 4,  beam: 1 }, pay: 26 },
  { name: 'Льох',      req: { foundation: 10, brick: 4,  beam: 0 }, pay: 28 },
  { name: 'Гараж',     req: { foundation: 12, brick: 6,  beam: 2 }, pay: 38 },
  { name: 'Альтанка',  req: { foundation: 6,  brick: 4,  beam: 3 }, pay: 29 },
  { name: 'Комора',    req: { foundation: 14, brick: 6,  beam: 2 }, pay: 42 },
  { name: 'Хатинка',   req: { foundation: 18, brick: 8,  beam: 3 }, pay: 52 },
  { name: 'Склад',     req: { foundation: 16, brick: 8,  beam: 2 }, pay: 46 },
  { name: 'Будиночок', req: { foundation: 20, brick: 10, beam: 4 }, pay: 58 },
];

const ORDERS_PER_DAY = [null, 3, 4, 5];

function drawBuildTile(g, col, row, type) {
  const x = OX + col * TILE, y = OY + row * TILE;
  switch (type) {
    case 'foundation':
      g.fillStyle(0x8A8A8A); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.fillStyle(0x606060, 0.5);
      for (let r2 = 0; r2 < 3; r2++)
        for (let c2 = 0; c2 < 3; c2++)
          g.fillRect(x+3+c2*18, y+3+r2*18, 14, 14);
      break;
    case 'brick':
      g.fillStyle(0xCC5533); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.fillStyle(0x993311);
      for (let r2 = 0; r2 < 3; r2++) {
        const off = (r2 % 2) * 12;
        for (let c2 = 0; c2 < 3; c2++)
          g.fillRect(x+2+c2*18+off, y+3+r2*16, 15, 12);
      }
      break;
    case 'beam':
      g.fillStyle(0xAA8822); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.fillStyle(0x775500);
      g.fillRect(x+3, y+15, TILE-6, 10);
      g.fillRect(x+3, y+31, TILE-6, 10);
      break;
  }
  g.lineStyle(1, 0x000000, 0.15); g.strokeRect(x+1, y+1, TILE-2, TILE-2);
}

export default class ConstructionScene extends Phaser.Scene {
  constructor() { super({ key: 'ConstructionScene' }); }

  create() {
    this.grid   = new Array(COLS * ROWS).fill(null);
    this.curCol = Math.floor(COLS / 2);
    this.curRow = Math.floor(ROWS / 2);
    this.selIdx = 0;
    this.done   = false;

    const count = ORDERS_PER_DAY[GameState.level] || 3;
    const shuffled = [...ORDER_POOL].sort(() => Math.random() - 0.5);
    this.orders   = shuffled.slice(0, count);
    this.orderIdx = 0;

    this._lunchTaken  = false;
    this._lunchReady  = false;
    this._lunchTimer  = 0;
    GameState.fedBonus = false;

    this._drawBackground();
    this._createGridGraphics();
    this._createHUD();
    this._createUpgradePanel();
    this._setupInput();
    this._redrawGrid();
    this._updateHUD();
    this.cameras.main.fadeIn(400);
    this.events.on('wake', () => {
      this.cameras.main.fadeIn(300);
      this._updateHUD();
      this._createUpgradePanel();
    });
  }

  _drawBackground() {
    const g = this.add.graphics();

    // Sky
    g.fillStyle(0x87CEEB); g.fillRect(0, 0, 1024, 700);
    g.fillStyle(0xFFFFFF, 0.8);
    [[140,38],[430,58],[730,33]].forEach(([cx,cy]) => {
      g.fillCircle(cx,cy,26); g.fillCircle(cx+32,cy-7,32); g.fillCircle(cx+64,cy,26);
    });

    // Ground
    g.fillStyle(0xC4A86C); g.fillRect(0, 280, 1024, 420);
    g.lineStyle(1, 0xB09050, 0.3);
    for (let y = 300; y < 700; y += 28) g.strokeRect(0, y, 1024, 1);

    // Construction zone base
    g.fillStyle(0xD4B880); g.fillRect(OX-8, OY-8, COLS*TILE+16, ROWS*TILE+16);
    g.lineStyle(3, 0xAA8840); g.strokeRect(OX-8, OY-8, COLS*TILE+16, ROWS*TILE+16);

    // Grid dots
    g.fillStyle(0x886633, 0.4);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const x = OX + c*TILE + TILE/2, y = OY + r*TILE + TILE/2;
        g.fillRect(x-1, y-1, 2, 2);
      }

    // Crane track
    g.fillStyle(0x555555); g.fillRect(OX-22, TRACK_Y-6, COLS*TILE+44, 12);
    g.fillStyle(0x888888); g.fillRect(OX-22, TRACK_Y-9, COLS*TILE+44, 4);
    for (let c = 0; c <= COLS; c += 2) {
      const sx = OX + c * TILE;
      g.fillStyle(0x666666); g.fillRect(sx-3, TRACK_Y+5, 6, 22);
    }

    // Crane control booth
    g.fillStyle(0xCC8800); g.fillRect(26, 290, 110, 90);
    g.fillStyle(0xEEAA00); g.fillRect(30, 294, 102, 46);
    g.fillStyle(0x88CCFF, 0.6); g.fillRect(34, 297, 40, 38);
    g.fillStyle(0xAA6600); g.fillRect(76, 334, 60, 46);
    g.lineStyle(2, 0x885500); g.strokeRect(26, 290, 110, 90);
    this.add.text(80, 398, '🏗 Кабіна', { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Material depot (right side)
    g.fillStyle(0xB8986A); g.fillRect(852, 190, 152, 430);
    g.lineStyle(2, 0xAA8840); g.strokeRect(852, 190, 152, 430);
    this.add.text(928, 206, '📦 МАТЕРІАЛИ', { fontSize: '11px', color: '#553311', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Depot stacks visual
    [{ color: 0x8A8A8A, y: 255 }, { color: 0xCC5533, y: 365 }, { color: 0xAA8822, y: 475 }].forEach(({ color, y: dy }) => {
      for (let col = 0; col < 4; col++)
        for (let row = 0; row < 3; row++) {
          g.fillStyle(color); g.fillRect(862+col*24, dy+row*13, 20, 10);
          g.lineStyle(1, 0x000000, 0.2); g.strokeRect(862+col*24, dy+row*13, 20, 10);
        }
    });
  }

  _createGridGraphics() {
    this.tileG   = this.add.graphics().setDepth(2);
    this.cursorG = this.add.graphics().setDepth(5);
    this.craneG  = this.add.graphics().setDepth(6);

    // Static crane operator figure at booth
    const pg = this.add.graphics().setDepth(3);
    pg.fillStyle(0x3355AA); pg.fillRect(-12, -16, 24, 30);
    pg.fillStyle(0xFFCC99); pg.fillCircle(0, -24, 11);
    pg.fillStyle(0xFFAA00); pg.fillRect(-13, -38, 26, 14);
    pg.fillStyle(0x2244AA); pg.fillRect(-10, 14, 8, 20); pg.fillRect(2, 14, 8, 20);
    pg.fillStyle(0x111111); pg.fillRect(-12, 32, 8, 7); pg.fillRect(4, 32, 8, 7);
    this.add.container(82, 358, [pg]);
  }

  _redrawGrid() {
    this.tileG.clear();
    for (let i = 0; i < this.grid.length; i++) {
      if (!this.grid[i]) continue;
      drawBuildTile(this.tileG, i % COLS, Math.floor(i / COLS), this.grid[i]);
    }
    this._redrawCrane();
  }

  _redrawCrane() {
    this.cursorG.clear();
    this.craneG.clear();

    const x   = OX + this.curCol * TILE;
    const y   = OY + this.curRow * TILE;
    const tile = BUILD_TILES[this.selIdx];
    const cx  = x + TILE / 2, cy = y + TILE / 2;

    // Cursor outline
    this.cursorG.lineStyle(3, tile.color, 0.9);
    this.cursorG.strokeRect(x+1, y+1, TILE-2, TILE-2);
    const idx = this.curRow * COLS + this.curCol;
    if (!this.grid[idx]) {
      this.cursorG.fillStyle(tile.color, 0.22);
      this.cursorG.fillRect(x+2, y+2, TILE-4, TILE-4);
    }

    // Crane trolley on track
    this.craneG.fillStyle(0x333333); this.craneG.fillRect(cx-13, TRACK_Y-8, 26, 14);
    this.craneG.fillStyle(0x555555); this.craneG.fillRect(cx-9,  TRACK_Y-5, 18, 8);
    // Rope
    this.craneG.lineStyle(2, 0x999999, 0.85);
    this.craneG.beginPath();
    this.craneG.moveTo(cx, TRACK_Y+6);
    this.craneG.lineTo(cx, cy-5);
    this.craneG.strokePath();
    // Hook
    this.craneG.fillStyle(0x777777); this.craneG.fillCircle(cx, cy-4, 6);
  }

  _countPlaced() {
    const done = { foundation: 0, brick: 0, beam: 0 };
    this.grid.forEach(t => { if (t && done[t] !== undefined) done[t]++; });
    return done;
  }

  _orderAllDone(order) {
    const placed = this._countPlaced();
    return BUILD_TILES.every(t => placed[t.id] >= (order.req[t.id] || 0));
  }

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.95); bg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, `🏗 Будівництво — День ${GameState.day}`,
      { fontSize: '20px', color: '#FFCC44', fontStyle: 'bold' }).setDepth(21);

    this.moneyText = this.add.text(1008, 8, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '20px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    const goal = LEVEL_CONFIG[GameState.level].goal;
    this.add.text(1008, 32, `Ціль: ${goal} €`,
      { fontSize: '12px', color: '#88BBFF' }).setOrigin(1, 0).setDepth(21);

    this.orderTitleText = this.add.text(512, 8, '',
      { fontSize: '16px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(21);
    this.progressText = this.add.text(512, 30, '',
      { fontSize: '11px', color: '#AADDFF' }).setOrigin(0.5, 0).setDepth(21);

    const hb = this.add.graphics().setDepth(20);
    hb.fillStyle(0x0a0a1a, 0.9); hb.fillRect(0, 660, 1024, 40);
    this.add.text(512, 670,
      '← → ↑ ↓  кран   |   ENTER — покласти / завершити   |   BACKSPACE — прибрати   |   Q/E — матеріал   |   C — додому',
      { fontSize: '12px', color: '#FFFF88' }).setOrigin(0.5, 0).setDepth(21);

    this.hintText = this.add.text(512, 632, '',
      { fontSize: '14px', color: '#FF8844', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 } })
      .setOrigin(0.5).setDepth(22);

    this.orderBoard = this.add.text(16, 65, '',
      { fontSize: '12px', color: '#FFCC88', lineSpacing: 5,
        backgroundColor: '#00000088', padding: { x: 8, y: 8 } })
      .setDepth(21);

    this.matLabels = {};
    BUILD_TILES.forEach((t, i) => {
      this.matLabels[t.id] = this.add.text(858, 228 + i * 110, '',
        { fontSize: '12px', color: '#fff', lineSpacing: 3 }).setDepth(21);
    });
  }

  _updateHUD() {
    this.moneyText.setText(`${GameState.earnings.toFixed(2)} €`);

    if (this.orderIdx >= this.orders.length) {
      this.orderTitleText.setText('✓ Всі замовлення виконані!');
      this.progressText.setText('');
      this.hintText.setText('C — кінець зміни, їхати додому');
      this.orderBoard.setText('Робочий день\nзавершено!\n\nC — їхати додому');
      BUILD_TILES.forEach(t => this.matLabels[t.id].setText(''));
      return;
    }

    const order = this.orders[this.orderIdx];
    const placed = this._countPlaced();
    const allDone = this._orderAllDone(order);

    const parts = BUILD_TILES
      .filter(t => (order.req[t.id] || 0) > 0)
      .map(t => {
        const ok = placed[t.id] >= order.req[t.id];
        return `${ok ? '✓' : '○'} ${t.name}: ${placed[t.id]}/${order.req[t.id]}`;
      });

    this.orderTitleText.setText(allDone
      ? `✓ ${order.name} — ENTER щоб здати (${order.pay}€)`
      : `Замовлення ${this.orderIdx+1}/${this.orders.length}: ${order.name}`);

    this.progressText.setText(
      BUILD_TILES.filter(t => (order.req[t.id]||0) > 0)
        .map(t => `${t.name}: ${placed[t.id]}/${order.req[t.id]}`).join('  ·  ')
    );

    this.orderBoard.setText(
      `📋 Замовлення ${this.orderIdx+1}/${this.orders.length}\n` +
      `📌 ${order.name}\n` +
      `💰 Оплата: ${order.pay}€\n\n` +
      parts.join('\n')
    );

    const sel = BUILD_TILES[this.selIdx];
    BUILD_TILES.forEach((t, i) => {
      const need = Math.max(0, (order.req[t.id]||0) - placed[t.id]);
      const isActive = t.id === sel.id;
      this.matLabels[t.id].setColor(isActive ? '#FFD700' : (need > 0 ? '#FFFFFF' : '#88FF88'));
      this.matLabels[t.id].setText(`${isActive ? '►' : ' '} ${t.name}\n   ще ${need} шт`);
    });

    const lunchHint = this._lunchReady && !this._lunchTaken ? '  |  L — обід 🍽' : '';
    this.hintText.setText(allDone
      ? `✓ ${order.name} готово! ENTER — здати та отримати ${order.pay}€${lunchHint}`
      : lunchHint);
  }

  _createUpgradePanel() {
    if (this._upgBtns) this._upgBtns.forEach(b => b.destroy());
    this._upgBtns = [];
    const ups = GameState.upgrades.construction;
    let x = 14;
    UPGRADES.construction.forEach(upg => {
      const bought = ups[upg.id];
      const canAfford = GameState.earnings >= upg.cost;
      const label = bought ? `✓ ${upg.label}` : `⬆ ${upg.label} ${upg.cost}€`;
      const color = bought ? '#88FF88' : (canAfford ? '#FFDD44' : '#888888');
      const bg    = bought ? '#002200' : (canAfford ? '#221100' : '#111111');
      const btn = this.add.text(x, 36, label, {
        fontSize: '11px', color, backgroundColor: bg, padding: { x: 5, y: 2 },
      }).setDepth(21);
      if (!bought) {
        btn.setInteractive();
        btn.on('pointerdown', () => {
          if (GameState.upgrades.construction[upg.id] || GameState.earnings < upg.cost) return;
          GameState.earnings = parseFloat((GameState.earnings - upg.cost).toFixed(2));
          GameState.upgrades.construction[upg.id] = true;
          if (upg.id === 'bonusMaterials') this._applyBonusMaterials();
          this._updateHUD();
          this._createUpgradePanel();
          playSound('upgrade');
        });
      }
      this._upgBtns.push(btn);
      x += btn.width + 8;
    });
  }

  _applyBonusMaterials() {
    if (this.orderIdx >= this.orders.length) return;
    let placed = 0;
    const max = 5;
    while (placed < max) {
      const i = Math.floor(Math.random() * (COLS * ROWS));
      if (!this.grid[i]) { this.grid[i] = 'foundation'; placed++; }
    }
    this._redrawGrid();
    this._updateHUD();
  }

  _setupInput() {
    this._keys = { up: false, down: false, left: false, right: false };
    const onKD = (e) => {
      if (e.code === 'ArrowUp')    { this._keys.up    = true; e.preventDefault(); }
      if (e.code === 'ArrowDown')  { this._keys.down  = true; e.preventDefault(); }
      if (e.code === 'ArrowLeft')  { this._keys.left  = true; e.preventDefault(); }
      if (e.code === 'ArrowRight') { this._keys.right = true; e.preventDefault(); }
    };
    const onKU = (e) => {
      if (e.code === 'ArrowUp')    this._keys.up    = false;
      if (e.code === 'ArrowDown')  this._keys.down  = false;
      if (e.code === 'ArrowLeft')  this._keys.left  = false;
      if (e.code === 'ArrowRight') this._keys.right = false;
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup',   onKU);
    this.events.once('destroy', () => {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup',   onKU);
    });
    this._moveTimer = 0;

    this.input.keyboard.addKey('ENTER').on('down', () => this._handleEnter());
    this.input.keyboard.addKey('BACKSPACE').on('down', () => this._removeTile());
    this.input.keyboard.addKey('Q').on('down', () => {
      this.selIdx = (this.selIdx - 1 + BUILD_TILES.length) % BUILD_TILES.length;
      this._redrawCrane(); this._updateHUD();
    });
    this.input.keyboard.addKey('E').on('down', () => {
      this.selIdx = (this.selIdx + 1) % BUILD_TILES.length;
      this._redrawCrane(); this._updateHUD();
    });
    this.input.keyboard.addKey('C').on('down', () => this._goHome());
    this.input.keyboard.addKey('L').on('down', () => this._goToLunch());
  }

  _goToLunch() {
    if (this._lunchTaken || !this._lunchReady || this.done) return;
    this._lunchTaken = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(350, () => {
      this.scene.sleep('ConstructionScene');
      this.scene.run('LunchScene', { returnTo: 'ConstructionScene' });
    });
  }

  _handleEnter() {
    if (this.done) return;
    if (this.orderIdx >= this.orders.length) { this._goHome(); return; }

    const order = this.orders[this.orderIdx];
    if (this._orderAllDone(order)) {
      playSound('cash');
      const pay = parseFloat((order.pay * (GameState.fedBonus ? 1.1 : 1)).toFixed(2));
      GameState.earnings = parseFloat((GameState.earnings + pay).toFixed(2));
      this.grid.fill(null);
      this.orderIdx++;
      this._redrawGrid();
      this._updateHUD();
      const flash = this.add.text(512, 350, `+${pay.toFixed(2)} €${GameState.fedBonus ? ' 😋' : ''}`, {
        fontSize: '38px', color: '#00FF88', fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: flash, y: 260, alpha: 0, duration: 1200, onComplete: () => flash.destroy() });
    } else {
      this._placeTile();
    }
  }

  _placeTile() {
    const idx = this.curRow * COLS + this.curCol;
    if (this.grid[idx]) return;
    this.grid[idx] = BUILD_TILES[this.selIdx].id;
    playSound('place');
    this._redrawGrid();
    this._updateHUD();
  }

  _removeTile() {
    const idx = this.curRow * COLS + this.curCol;
    if (!this.grid[idx]) return;
    this.grid[idx] = null;
    this._redrawGrid();
    this._updateHUD();
  }

  _goHome() {
    if (this.done) return;
    this.done = true;
    GameState.day++;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start('CommuteScene', { destination: 'home' }));
  }

  update(_, delta) {
    if (this.done) return;

    // Lunch becomes available after 20 seconds
    if (!this._lunchReady) {
      this._lunchTimer += delta;
      if (this._lunchTimer >= 20000) {
        this._lunchReady = true;
        this._updateHUD();
      }
    }

    this._moveTimer -= delta;
    if (this._moveTimer > 0) return;

    const k = this._keys;
    let moved = false;
    if (k.left  && this.curCol > 0)        { this.curCol--; moved = true; }
    if (k.right && this.curCol < COLS - 1) { this.curCol++; moved = true; }
    if (k.up    && this.curRow > 0)        { this.curRow--; moved = true; }
    if (k.down  && this.curRow < ROWS - 1) { this.curRow++; moved = true; }

    if (moved) {
      this._moveTimer = GameState.upgrades.construction.turboCrane ? 55 : 100;
      this._redrawCrane();
    }
  }
}
