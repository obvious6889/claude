import IntroScene from './scenes/IntroScene.js';
import CommuteScene from './scenes/CommuteScene.js';
import ShopScene from './scenes/ShopScene.js';
import HomeScene from './scenes/HomeScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 700,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [IntroScene, CommuteScene, ShopScene, HomeScene],
};

new Phaser.Game(config);
