/**
 * BootScene - 启动场景
 */
import { Scene } from '../engine/Scene.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { SCENE_KEYS } from '../utils/Constants.js';
export class BootScene extends Scene {
    constructor() { super(SCENE_KEYS.BOOT); }
    async enter() {
        await ConfigManager.instance.load();
        SaveManager.instance.load();
        // 直接进菜单
        this.game.switchTo(SCENE_KEYS.MENU);
    }
    exit() { }
    update() { }
    render() { }
}
//# sourceMappingURL=BootScene.js.map