import JobSelectScene from './scenes/JobSelectScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import IntroScene from './scenes/IntroScene.js';
import CommuteScene from './scenes/CommuteScene.js';
import ShopScene from './scenes/ShopScene.js';
import BackRoomScene from './scenes/BackRoomScene.js';
import HomeScene from './scenes/HomeScene.js';
import MaterialsStoreScene from './scenes/MaterialsStoreScene.js';
import HomeBuildScene from './scenes/HomeBuildScene.js';
import ConstructionScene from './scenes/ConstructionScene.js';
import RestaurantScene from './scenes/RestaurantScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 700,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [JobSelectScene, LevelSelectScene, IntroScene, CommuteScene, ShopScene,
          BackRoomScene, HomeScene, MaterialsStoreScene, HomeBuildScene,
          ConstructionScene, RestaurantScene],
};

new Phaser.Game(config);
