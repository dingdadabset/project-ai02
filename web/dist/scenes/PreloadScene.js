/**
 * PreloadScene - 占位（无需 asset 预加载，保留扩展位）
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS } from '../utils/Constants.js';
export class PreloadScene extends Scene {
    constructor() { super(SCENE_KEYS.PRELOAD); }
    enter() { this.game.switchTo(SCENE_KEYS.MENU); }
    exit() { }
    update() { }
    render() { }
}
//# sourceMappingURL=PreloadScene.js.map