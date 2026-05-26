/**
 * SpawnSystem - 刷怪系统
 */
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Projectile } from '../entities/Projectile.js';
import { ConfigManager, WaveConfig, LevelConfig } from '../core/ConfigManager.js';
import { CombatSystem } from './CombatSystem.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Vec2 } from '../engine/Vec2.js';

interface ActiveWave {
    config: WaveConfig;
    spawnTimer: number;
    elapsed: number;
    totalSpawned: number;
}

export class SpawnSystem {
    public maxOnScreen: number = 100;
    public spawnRadius: { min: number; max: number } = { min: 350, max: 500 };

    private _player: Player;
    private _combat: CombatSystem;
    private _waves: WaveConfig[] = [];
    private _activeWaves: ActiveWave[] = [];
    private _elapsed: number = 0;
    private _nextWaveIdx: number = 0;
    private _running: boolean = false;
    private _allWavesDone: boolean = false;

    private _enemyPool: Enemy[] = [];
    private _projectilePool: Projectile[] = [];

    constructor(player: Player, combat: CombatSystem) {
        this._player = player;
        this._combat = combat;
        EventBus.instance.on('enemy_shoot', this._onEnemyShoot, this);
        EventBus.instance.on('boss_ground_slam', this._onBossSlam, this);
    }

    public startLevel(level: LevelConfig): void {
        this._waves = level.waves;
        this._activeWaves = [];
        this._elapsed = 0;
        this._nextWaveIdx = 0;
        this._running = true;
        this._allWavesDone = false;
    }

    public stop(): void {
        this._running = false;
    }

    public update(dt: number): void {
        if (!this._running) return;
        this._elapsed += dt;

        // 激活到时间的波次
        while (this._nextWaveIdx < this._waves.length) {
            const w = this._waves[this._nextWaveIdx];
            if (this._elapsed / 1000 >= w.time) {
                this._activeWaves.push({ config: w, spawnTimer: 0, elapsed: 0, totalSpawned: 0 });
                if (w.enemy.includes('boss')) {
                    EventBus.instance.emit(GameEvent.BOSS_SPAWN, w.enemy);
                } else {
                    EventBus.instance.emit(GameEvent.WAVE_START, this._nextWaveIdx);
                }
                this._nextWaveIdx++;
            } else break;
        }

        // 更新波次
        for (let i = this._activeWaves.length - 1; i >= 0; i--) {
            const w = this._activeWaves[i];
            w.elapsed += dt;
            w.spawnTimer += dt;
            if (w.config.duration && w.elapsed / 1000 >= w.config.duration) {
                this._activeWaves.splice(i, 1);
                continue;
            }
            if (w.config.count && w.totalSpawned >= w.config.count) {
                this._activeWaves.splice(i, 1);
                continue;
            }
            const interval = w.config.rate > 0 ? 1000 / w.config.rate : 1000;
            if (w.spawnTimer >= interval && this._combat.enemyCount < this.maxOnScreen) {
                w.spawnTimer = 0;
                this._spawn(w.config.enemy);
                w.totalSpawned++;
            }
        }

        // 完成检测
        if (!this._allWavesDone && this._nextWaveIdx >= this._waves.length
            && this._activeWaves.length === 0 && this._combat.enemyCount === 0) {
            this._allWavesDone = true;
            this._running = false;
            EventBus.instance.emit(GameEvent.LEVEL_COMPLETE);
        }
    }

    private _spawn(enemyId: string): void {
        const config = ConfigManager.instance.getEnemy(enemyId);
        if (!config) return;

        const angle = Math.random() * Math.PI * 2;
        const r = MathUtils.randomRange(this.spawnRadius.min, this.spawnRadius.max);
        const x = this._player.pos.x + Math.cos(angle) * r;
        const y = this._player.pos.y + Math.sin(angle) * r;

        // 难度倍率（基于关卡时间）
        const timeFactor = Math.min(1, this._elapsed / 180000);
        const hpMul = 1 + timeFactor * 0.5;
        const atkMul = 1 + timeFactor * 0.3;
        const speedMul = 1 + timeFactor * 0.15;

        const enemy = this._getEnemyFromPool();
        enemy.init(config, x, y, hpMul, atkMul, speedMul);
        this._combat.addEnemy(enemy);
    }

    private _getEnemyFromPool(): Enemy {
        for (const e of this._enemyPool) {
            if (!e.alive) {
                return e;
            }
        }
        const e = new Enemy();
        this._enemyPool.push(e);
        return e;
    }

    public getProjectileFromPool(): Projectile {
        for (const p of this._projectilePool) {
            if (!p.alive) return p;
        }
        const p = new Projectile();
        this._projectilePool.push(p);
        return p;
    }

    private _onEnemyShoot(data: { x: number; y: number; targetX: number; targetY: number; damage: number }): void {
        const dx = data.targetX - data.x;
        const dy = data.targetY - data.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const p = this.getProjectileFromPool();
        p.init(data.x, data.y, {
            damage: data.damage,
            speed: 250,
            direction: new Vec2(dx / len, dy / len),
            lifetime: 3000,
            pierceCount: 0,
            radius: 6,
            color: '#ff6666',
            ownerTag: 'enemy',
            trail: true,
        });
        this._combat.addProjectile(p);
    }

    private _onBossSlam(data: { x: number; y: number; radius: number; damage: number }): void {
        // 直接对玩家做距离判定
        const dx = data.x - this._player.pos.x;
        const dy = data.y - this._player.pos.y;
        if (dx * dx + dy * dy < data.radius * data.radius) {
            this._player.takeDamage(data.damage);
        }
        // 视觉冲击波由 GameScene 渲染（后续添加）
        EventBus.instance.emit('shockwave', { x: data.x, y: data.y, radius: data.radius });
    }

    public destroy(): void {
        EventBus.instance.offTarget(this);
    }
}
