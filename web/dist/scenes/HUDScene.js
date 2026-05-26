/**
 * HUDScene - 占位（HUD 已直接在 GameScene 渲染）
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS } from '../utils/Constants.js';
export class HUDScene extends Scene {
    constructor() { super(SCENE_KEYS.HUD); }
    enter() { }
    exit() { }
    update() { }
    render() { }
}
//# sourceMappingURL=HUDScene.js.map