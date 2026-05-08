import { GameState, LEVEL_CONFIG, resetForLevel } from '../state.js';
import { MATERIALS, MATERIALS_MAP } from '../data/materials.js';

const COLS      = 14;
const ROWS      = 10;
const TILE      = 48;
const OX        = (1024 - COLS * TILE) / 2;   // 88
const OY        = 70;
const GRID_W    = COLS * TILE;
const GRID_H    = ROWS * TILE;

// ─── Tile drawing helpers ─────────────────────────────────────────────────────

function drawTile(g, col, row, type) {
  const x = OX + col * TILE;
  const y = OY + row * TILE;

  switch (type) {
    case 'floor':
      g.fillStyle(0xC4A265); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.lineStyle(1, 0xA07840, 0.4);
      g.strokeRect(x+1, y+1, TILE-2, TILE-2);
      break;
    case 'wall':
      g.fillStyle(0x7A5230); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.fillStyle(0x9A6A3A);
      // Brick pattern
      for (let row2 = 0; row2 < 3; row2++) {
        const off = (row2 % 2) * 12;
        for (let c2 = 0; c2 < 3; c2++) {
          g.fillRect(x+3+c2*16+off, y+3+row2*14, 14, 11);
        }
      }
      break;
    case 'roof':
      g.fillStyle(0x546E7A); g.fillRect(x+1, y+1, TILE-2, TILE-2);
      g.fillStyle(0x607D8B);
      g.fillTriangle(x+TILE/2, y+4, x+4, y+TILE-4, x+TILE-4, y+TILE-4);
      break;
    case 'bed':
      g.fillStyle(0x3355AA); g.fillRect(x+2, y+2, TILE-4, TILE-4);
      g.fillStyle(0xEEDDCC); g.fillRect(x+4, y+4, TILE-8, 14);  // pillow
      g.fillStyle(0x4466CC); g.fillRect(x+4, y+20, TILE-8, TILE-24);
      break;
    case 'table':
      g.fillStyle(0x8B5E3C); g.fillRect(x+4, y+12, TILE-8, TILE-20);
      g.fillStyle(0x6B4422);
      g.fillRect(x+5, y+TILE-12, 7, 10);
      g.fillRect(x+TILE-12, y+TILE-12, 7, 10);
      break;
    case 'chair':
      g.fillStyle(0x6B4A2A); g.fillRect(x+8, y+16, TILE-16, TILE-24);
      g.fillStyle(0x5A3A1A); g.fillRect(x+8, y+8, TILE-16, 10);
      g.fillRect(x+8, y+TILE-12, 6, 10);
      g.fillRect(x+TILE-14, y+TILE-12, 6, 10);
      break;
  }
}

function countTiles(grid) {
  const counts = {};
  MATERIALS.forEach(m => { counts[m.id] = 0; });
  grid.forEach(t => { if (t && counts[t] !== undefined) counts[t]++; });
  return counts;
}

function isComplete(grid) {
  const c = countTiles(grid);
  return MATERIALS.every(m => c[m.id] >= m.req);
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export default class HomeBuildScene extends Phaser.Scene {
  constructor() { super({ key: 'HomeBuildScene' }); }

  create() {
    // Ensure grid is initialized
    if (!GameState.houseGrid || GameState.houseGrid.length !== COLS * ROWS) {
      GameState.houseGrid = new Array(COLS * ROWS).fill(null);
    }
    this.grid = GameState.houseGrid;

    this.curCol = Math.floor(COLS / 2);
    this.curRow = Math.floor(ROWS / 2);
    this.selIdx = 0;
    this.sleeping = false;

    this._drawBackground();
    this._createGridGraphics();
    this._createHUD();
    this._setupInput();
    this._redrawGrid();
    this._updateHUD();
    this.cameras.main.fadeIn(400);
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _drawBackground() {
    const g = this.add.graphics();

    // Night sky
    g.fillStyle(0x0A0E1A); g.fillRect(0, 0, 1024, 700);

    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137 + 50) % 1024;
      const sy = (i * 97  + 30) % 700;
      const br = 0.4 + (i % 3) * 0.2;
      g.fillStyle(0xFFFFFF, br); g.fillCircle(sx, sy, 1 + (i % 2));
    }

    // Moon
    g.fillStyle(0xFFF8E7, 0.9); g.fillCircle(880, 90, 38);
    g.fillStyle(0x0A0E1A);      g.fillCircle(895, 80, 33);

    // Ground plot outline
    g.lineStyle(3, 0x556644, 0.6);
    g.strokeRect(OX - 10, OY - 10, GRID_W + 20, GRID_H + 20);

    // Grid dots on empty cells
    g.fillStyle(0x334433, 0.5);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = OX + c * TILE + TILE / 2;
        const y = OY + r * TILE + TILE / 2;
        g.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }

  // ─── Grid graphics ─────────────────────────────────────────────────────────

  _createGridGraphics() {
    this.tileG   = this.add.graphics().setDepth(2);
    this.cursorG = this.add.graphics().setDepth(5);
  }

  _redrawGrid() {
    this.tileG.clear();
    for (let i = 0; i < this.grid.length; i++) {
      if (!this.grid[i]) continue;
      drawTile(this.tileG, i % COLS, Math.floor(i / COLS), this.grid[i]);
    }
    this._redrawCursor();
  }

  _redrawCursor() {
    const g = this.cursorG;
    g.clear();
    const x = OX + this.curCol * TILE;
    const y = OY + this.curRow * TILE;
    const m = MATERIALS[this.selIdx];
    g.lineStyle(3, m.color, 0.9);
    g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    // Ghost tile (semi-transparent preview)
    if (GameState.materials[m.id] > 0) {
      const idx = this.curRow * COLS + this.curCol;
      if (!this.grid[idx]) {
        g.fillStyle(m.color, 0.3);
        g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _createHUD() {
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.95); bg.fillRect(0, 0, 1024, 56);

    this.add.text(14, 8, `🌅 Дача — Ранок, День ${GameState.day}`,
      { fontSize: '20px', color: '#88FFAA', fontStyle: 'bold' }).setDepth(21);

    this.moneyText = this.add.text(1010, 8, `${GameState.earnings.toFixed(2)} €`,
      { fontSize: '20px', color: '#00FF88', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(21);

    this.selText = this.add.text(512, 10, '',
      { fontSize: '16px', color: '#FFD700', fontStyle: 'bold' })
      .setOrigin(0.5, 0).setDepth(21);

    this.progressText = this.add.text(512, 29, '',
      { fontSize: '10px', color: '#aaa' })
      .setOrigin(0.5, 0).setDepth(21);

    // Bottom hint bar
    const bb = this.add.graphics().setDepth(20);
    bb.fillStyle(0x0a0a1a, 0.9); bb.fillRect(0, 660, 1024, 40);

    this.add.text(512, 670, '← → ↑ ↓  рух   |   ENTER — покласти   |   BACKSPACE — прибрати   |   Q/E — вибір   |   C — їхати на роботу',
      { fontSize: '12px', color: '#FFFF88' }).setOrigin(0.5, 0).setDepth(21);

    // Inventory sidebar (right of HUD)
    this.invTexts = {};
    MATERIALS.forEach((m, i) => {
      this.invTexts[m.id] = this.add.text(0, 0, '', { fontSize: '11px', color: '#fff' }).setDepth(21);
    });

    this.hintText = this.add.text(512, 632, '',
      { fontSize: '14px', color: '#FF8844', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 } })
      .setOrigin(0.5).setDepth(22);
  }

  _updateHUD() {
    const m = MATERIALS[this.selIdx];
    const inv = GameState.materials[m.id];
    this.selText.setText(`[ ${m.name} ]  в запасі: ${inv}`);
    this.selText.setColor(inv > 0 ? '#FFD700' : '#FF4444');

    const counts = countTiles(this.grid);
    const parts = MATERIALS.map(mat => {
      const have = counts[mat.id];
      const need = mat.req;
      return `${mat.name}: ${have}/${need}`;
    });
    this.progressText.setText(parts.join('  ·  '));

    // Inventory as small floating labels near grid
    const startX = OX - 86;
    MATERIALS.forEach((mat, i) => {
      const y = OY + i * 44 + 10;
      const inv = GameState.materials[mat.id];
      const cnt = counts[mat.id];
      const done = cnt >= mat.req;
      this.invTexts[mat.id].setPosition(startX, y);
      this.invTexts[mat.id].setText(`${done ? '✓' : '○'} ${mat.name}\n  ×${inv} (${cnt}/${mat.req})`);
      this.invTexts[mat.id].setColor(done ? '#88FF88' : '#CCCCCC');
      if (i === this.selIdx) this.invTexts[mat.id].setColor('#FFD700');
    });

    this.moneyText.setText(`${GameState.earnings.toFixed(2)} €`);

    if (isComplete(this.grid)) {
      this.hintText.setText('🏠 Дача готова! C — завершити рівень і їхати на роботу.');
    } else {
      this.hintText.setText('');
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

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

    this.input.keyboard.addKey('ENTER').on('down', () => this._placeTile());
    this.input.keyboard.addKey('BACKSPACE').on('down', () => this._removeTile());
    this.input.keyboard.addKey('Q').on('down', () => {
      this.selIdx = (this.selIdx - 1 + MATERIALS.length) % MATERIALS.length;
      this._redrawCursor(); this._updateHUD();
    });
    this.input.keyboard.addKey('E').on('down', () => {
      this.selIdx = (this.selIdx + 1) % MATERIALS.length;
      this._redrawCursor(); this._updateHUD();
    });
    this.input.keyboard.addKey('C').on('down', () => this._trySleep());
  }

  // ─── Tile actions ───────────────────────────────────────────────────────────

  _placeTile() {
    const m = MATERIALS[this.selIdx];
    if (GameState.materials[m.id] <= 0) return;
    const idx = this.curRow * COLS + this.curCol;
    if (this.grid[idx]) return; // already occupied
    this.grid[idx] = m.id;
    GameState.materials[m.id]--;
    this._redrawGrid();
    this._updateHUD();
  }

  _removeTile() {
    const idx = this.curRow * COLS + this.curCol;
    const type = this.grid[idx];
    if (!type) return;
    this.grid[idx] = null;
    GameState.materials[type]++;
    this._redrawGrid();
    this._updateHUD();
  }

  // ─── Sleep ─────────────────────────────────────────────────────────────────

  _trySleep() {
    if (this.sleeping) return;
    if (isComplete(this.grid)) {
      GameState.houseComplete = true;
      this._showWin();
    } else {
      // Go to work even if house not complete
      this._goToWork();
    }
  }

  _goToWork() {
    if (this.sleeping) return;
    this.sleeping = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => this.scene.start('CommuteScene', { destination: 'shop' }));
  }

  _showWin() {
    this.sleeping = true;
    const level  = GameState.level;
    const isLast = level >= 3;

    if (!isLast && GameState.maxUnlocked <= level) {
      GameState.maxUnlocked = level + 1;
    }

    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x000000, 0.82); g.fillRect(0, 0, 1024, 700);

    this.add.text(512, 60, '🏠', { fontSize: '80px' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 160, `Рівень ${level} пройдено!`,
      { fontSize: '44px', color: '#FFD700', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 225, `Дача побудована за ${GameState.day} ${GameState.day === 1 ? 'день' : 'днів'}!`,
      { fontSize: '22px', color: '#fff' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 265, `Заробіток: ${GameState.earnings.toFixed(2)} €`,
      { fontSize: '18px', color: '#88FFAA' }).setOrigin(0.5).setDepth(51);
    this.add.text(512, 320, '★★★★',
      { fontSize: '60px', color: '#FFD700' }).setOrigin(0.5).setDepth(51);

    if (isLast) {
      this.add.text(512, 420, '🏆 Ти пройшов всю гру! Молодець! 🏆',
        { fontSize: '26px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(51);
      this.add.text(512, 468, 'Натисни F5 щоб грати знову',
        { fontSize: '16px', color: '#aaa' }).setOrigin(0.5).setDepth(51);
    } else {
      const btn = this.add.text(512, 430, `▶ Рівень ${level + 1}`,
        { fontSize: '28px', color: '#FFD700', backgroundColor: '#1a3a6a',
          padding: { x: 24, y: 14 }, fontStyle: 'bold' })
        .setOrigin(0.5).setInteractive().setDepth(51);
      btn.on('pointerover', () => btn.setStyle({ color: '#fff', backgroundColor: '#2255AA' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#FFD700', backgroundColor: '#1a3a6a' }));
      btn.on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => this.scene.start('LevelSelectScene'));
      });

      const cont = this.add.text(512, 500, 'або продовжити будувати...',
        { fontSize: '16px', color: '#888' }).setOrigin(0.5).setInteractive().setDepth(51);
      cont.on('pointerover', () => cont.setStyle({ color: '#fff' }));
      cont.on('pointerout',  () => cont.setStyle({ color: '#888' }));
      cont.on('pointerdown', () => this._goToWork());
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this.sleeping) return;
    this._moveTimer -= delta;
    if (this._moveTimer > 0) return;

    const k = this._keys;
    let moved = false;
    if (k.left  && this.curCol > 0)          { this.curCol--; moved = true; }
    if (k.right && this.curCol < COLS - 1)   { this.curCol++; moved = true; }
    if (k.up    && this.curRow > 0)          { this.curRow--; moved = true; }
    if (k.down  && this.curRow < ROWS - 1)   { this.curRow++; moved = true; }

    if (moved) {
      this._moveTimer = 130;
      this._redrawCursor();
    }
  }
}
