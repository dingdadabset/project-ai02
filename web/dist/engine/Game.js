/**
 * Game - 游戏主循环 + 场景管理
 */
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
export class Game {
    constructor(canvas) {
        this._scenes = new Map();
        this._currentScene = null;
        this._lastTime = 0;
        this._running = false;
        this._fps = 60;
        this._fpsCounter = 0;
        this._fpsTimer = 0;
        this._fpsElement = null;
        this._loop = (now) => {
            if (!this._running)
                return;
            let dt = now - this._lastTime;
            // 防止切换标签后 dt 暴增
            if (dt > 100)
                dt = 16.67;
            this._lastTime = now;
            // FPS 计算
            this._fpsCounter++;
            this._fpsTimer += dt;
            if (this._fpsTimer >= 500) {
                this._fps = Math.round((this._fpsCounter * 1000) / this._fpsTimer);
                if (this._fpsElement) {
                    this._fpsElement.textContent = `FPS: ${this._fps}`;
                }
                this._fpsCounter = 0;
                this._fpsTimer = 0;
            }
            if (this._currentScene) {
                this._currentScene.update(dt);
                this._currentScene.render();
            }
            requestAnimationFrame(this._loop);
        };
        this.renderer = new Renderer(canvas);
        this.input = new Input(canvas);
        this._fpsElement = document.getElementById('fps');
    }
    addScene(scene) {
        scene.game = this;
        this._scenes.set(scene.name, scene);
        return this;
    }
    switchTo(name, data) {
        if (!this._scenes.has(name)) {
            console.error(`[Game] Scene not found: ${name}`);
            return;
        }
        if (this._currentScene) {
            this._currentScene.exit();
        }
        this._currentScene = this._scenes.get(name);
        this._currentScene.enter(data);
    }
    start() {
        if (this._running)
            return;
        this._running = true;
        this._lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }
    stop() {
        this._running = false;
    }
    get currentScene() {
        return this._currentScene;
    }
    get fps() {
        return this._fps;
    }
}
//# sourceMappingURL=Game.js.map