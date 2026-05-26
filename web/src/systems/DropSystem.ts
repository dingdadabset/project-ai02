/**
 * DropSystem - 掉落与拾取
 */
import { Player } from '../entities/Player.js';
import { Renderer } from '../engine/Renderer.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
import { DROP_COLORS } from '../utils/Constants.js';
import { MathUtils } from '../utils/MathUtils.js';

export interface DropItem {
    type: 'exp' | 'gold' | 'hp_potion' | 'magnet';
    value: number;
    x: number;
    y: number;
    alive: boolean;
    flying: boolean;
    spawnTime: number;
}

export class DropSystem {
    public drops: DropItem[] = [];
    private _player: Player;
    private _magnetActive: boolean = false;
    private _magnetTimer: number = 0;
    private _totalGold: number = 0;

    constructor(player: Player) {
        this._player = player;
        EventBus.instance.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
    }

    public get totalGold(): number { return this._totalGold; }

    private _onEnemyKilled(data: { x: number; y: number; exp: number; dropTable: string[] }): void {
        // 必掉经验
        this._spawn('exp', data.exp, data.x, data.y);
        // 概率掉金币
        if (Math.random() < 0.4) {
            this._spawn('gold', 5, data.x, data.y);
        }
        // 概率掉血瓶
        if (Math.random() < 0.05) {
            this._spawn('hp_potion', 20, data.x, data.y);
        }
    }

    private _spawn(type: DropItem['type'], value: number, x: number, y: number): void {
        const ox = (Math.random() - 0.5) * 30;
        const oy = (Math.random() - 0.5) * 30;
        this.drops.push({
            type, value,
            x: x + ox, y: y + oy,
            alive: true, flying: false,
            spawnTime: performance.now(),
        });
    }

    public update(dt: number): void {
        if (this._magnetActive) {
            this._magnetTimer -= dt;
            if (this._magnetTimer <= 0) this._magnetActive = false;
        }

        const dtSec = dt / 1000;
        const pickupR = this._player.stats.pickupRange;
        const pickupR2 = pickupR * pickupR;
        const pickRadius = this._player.radius + 8;
        const pickRadius2 = pickRadius * pickRadius;
        const px = this._player.pos.x;
        const py = this._player.pos.y;

        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            if (!d.alive) {
                this.drops.splice(i, 1);
                continue;
            }
            const dx = px - d.x;
            const dy = py - d.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < pickRadius2) {
                this._pickup(d);
                this.drops.splice(i, 1);
                continue;
            }

            if (distSq < pickupR2 || this._magnetActive) {
                const dist = Math.sqrt(distSq);
                const speed = this._magnetActive ? 700 : 380;
                d.flying = true;
                d.x += (dx / dist) * speed * dtSec;
                d.y += (dy / dist) * speed * dtSec;
            }
        }
    }

    private _pickup(d: DropItem): void {
        switch (d.type) {
            case 'exp':
                this._player.gainExp(d.value);
                break;
            case 'gold':
                this._totalGold += d.value;
                EventBus.instance.emit(GameEvent.GOLD_GAINED, d.value);
                break;
            case 'hp_potion':
                this._player.heal(d.value);
                break;
            case 'magnet':
                this._magnetActive = true;
                this._magnetTimer = 3000;
                break;
        }
        EventBus.instance.emit(GameEvent.ITEM_PICKED, d.type, d.value);
    }

    public render(renderer: Renderer): void {
        const now = performance.now();
        for (const d of this.drops) {
            if (!d.alive) continue;
            // 仅渲染在视野内的
            if (!renderer.isInView(d.x, d.y, 30)) continue;

            const hex = '#' + (DROP_COLORS[d.type] || 0xffffff).toString(16).padStart(6, '0');
            const r = d.type === 'exp' ? 5 : (d.type === 'gold' ? 4 : 7);
            // 浮动动画
            const t = (now - d.spawnTime) / 400;
            const offsetY = Math.sin(t * Math.PI) * 2;

            // 阴影
            renderer.drawCircle(d.x, d.y + 4, r * 0.7, 'rgba(0,0,0,0.3)');
            // 主体
            renderer.drawCircle(d.x, d.y - offsetY, r, hex, '#fff', 1);
        }
    }

    public clearAll(): void {
        this.drops = [];
    }

    public destroy(): void {
        EventBus.instance.offTarget(this);
    }
}
