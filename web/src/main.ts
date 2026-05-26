/**
 * 游戏入口
 */
import { Game } from './engine/Game.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { SkillSelectScene } from './scenes/SkillSelectScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { SCENE_KEYS } from './utils/Constants.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    const game = new Game(canvas);
    game.addScene(new BootScene())
        .addScene(new PreloadScene())
        .addScene(new MenuScene())
        .addScene(new GameScene())
        .addScene(new HUDScene())
        .addScene(new SkillSelectScene())
        .addScene(new ResultScene());

    game.switchTo(SCENE_KEYS.BOOT);
    game.start();
});
