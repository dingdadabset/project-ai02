/**
 * Game - 游戏主循环 + 场景管理
 */
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Scene } from './Scene.js';

export class Game {
    public renderer: Renderer;
    public input: Input;

    private _scenes: Map<string, Scene> = new Map();
    private _currentScene: Scene | null = null;
    private _lastTime: number = 0;
    private _running: boolean = false;
    private _fps: number = 60;
    private _fpsCounter: number = 0;
    private _fpsTimer: number = 0;
    private _fpsElement: HTMLElement | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.input = new Input(canvas);
        this._fpsElement = document.getElementById('fps');
    }

    public addScene(scene: Scene): this {
        scene.game = this;
        this._scenes.set(scene.name, scene);
        return this;
    }

    public switchTo(name: string, data?: any): void {
        if (!this._scenes.has(name)) {
            console.error(`[Game] Scene not found: ${name}`);
            return;
        }
        if (this._currentScene) {
            this._currentScene.exit();
        }
        this._currentScene = this._scenes.get(name)!;
        this._currentScene.enter(data);
    }

    public start(): void {
        if (this._running) return;
        this._running = true;
        this._lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }

    public stop(): void {
        this._running = false;
    }

    public get currentScene(): Scene | null {
        return this._currentScene;
    }

    public get fps(): number {
        return this._fps;
    }

    private _loop = (now: number): void => {
        if (!this._running) return;

        let dt = now - this._lastTime;
        // 防止切换标签后 dt 暴增
        if (dt > 100) dt = 16.67;
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
}
