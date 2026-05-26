/**
 * Scene - 场景基类
 */
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';

export abstract class Scene {
    public game!: Game;
    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    public get renderer(): Renderer { return this.game.renderer; }
    public get input(): Input { return this.game.input; }
    public get width(): number { return this.game.renderer.width; }
    public get height(): number { return this.game.renderer.height; }

    public abstract enter(data?: any): void | Promise<void>;
    /** 离开场景时调用 */
    public abstract exit(): void;
    /** 每帧更新（dt 毫秒） */
    public abstract update(dt: number): void;
    /** 每帧渲染 */
    public abstract render(): void;
}

// 前向引用
import { Game } from './Game.js';
