/**
 * DropSystem - 掉落系统
 * 管理敌人死亡掉落、物品拾取逻辑
 */

import { _decorator, Component, Node, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { ObjectPool } from '../core/ObjectPool';
import { Player } from '../entities/Player';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface DropItem {
    type: 'exp' | 'gold' | 'hp_potion' | 'magnet' | 'bomb';
    value: number;
    node: Node;
}

@ccclass('DropSystem')
export class DropSystem extends Component {
    private static _instance: DropSystem | null = null;

    @property(Node)
    public dropContainer: Node | null = null;

    @property
    public magnetSpeed: number = 800; // 被磁铁吸引时的速度

    @property
    public expMergeRadius: number = 30; // 经验球合并半径（性能优化）

    // 活跃掉落物
    private _activeDrops: DropItem[] = [];

    // 掉落概率表
    private _dropTable: Map<string, { type: string; weight: number; value: number }[]> = new Map();

    // 是否全屏吸引
    private _isMagnetActive: boolean = false;
    private _magnetTimer: number = 0;

    public static get instance(): DropSystem {
        return DropSystem._instance!;
    }

    onLoad(): void {
        DropSystem._instance = this;
        this._initDropTable();
    }

    start(): void {
        EventBus.instance.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
    }

    private _initDropTable(): void {
        // 默认掉落表（后续从配置读取）
        this._dropTable.set('default', [
            { type: 'exp', weight: 80, value: 1 },
            { type: 'gold', weight: 30, value: 5 },
            { type: 'hp_potion', weight: 5, value: 20 },
        ]);
    }

    update(dt: number): void {
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        // 磁铁计时
        if (this._isMagnetActive) {
            this._magnetTimer -= dt;
            if (this._magnetTimer <= 0) {
                this._isMagnetActive = false;
            }
        }

        // 更新掉落物（拾取检测）
        this._updateDrops(dt);
    }

    /**
     * 敌人死亡时生成掉落
     */
    private _onEnemyKilled(data: { position: Vec3; exp: number; dropTable: string[] }): void {
        const { position, exp, dropTable } = data;

        // 必定掉落经验
        this._spawnDrop('exp', exp, position);

        // 概率掉落其他物品
        const table = this._dropTable.get('default') || [];
        for (const entry of table) {
            if (entry.type === 'exp') continue; // 经验已单独处理
            const roll = Math.random() * 100;
            if (roll < entry.weight) {
                this._spawnDrop(entry.type as any, entry.value, position);
            }
        }
    }

    /**
     * 生成掉落物
     */
    private _spawnDrop(type: DropItem['type'], value: number, position: Vec3): void {
        const poolName = `drop_${type}`;
        const node = ObjectPool.instance.get(poolName);

        if (!node) {
            // 如果没有对象池，可以暂时跳过（MVP 阶段）
            // 后续需要注册掉落物 prefab
            return;
        }

        // 轻微随机偏移
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        node.setWorldPosition(position.x + offsetX, position.y + offsetY, 0);

        if (this.dropContainer) {
            this.dropContainer.addChild(node);
        }

        this._activeDrops.push({ type, value, node });
    }

    /**
     * 更新掉落物（拾取&磁铁）
     */
    private _updateDrops(dt: number): void {
        const player = Player.instance;
        if (!player || !player.isAlive) return;

        const playerPos = player.node.worldPosition;
        const pickupRange = player.stats.pickupRange;
        const pickupRangeSq = pickupRange * pickupRange;

        for (let i = this._activeDrops.length - 1; i >= 0; i--) {
            const drop = this._activeDrops[i];
            if (!drop.node || !drop.node.isValid) {
                this._activeDrops.splice(i, 1);
                continue;
            }

            const dropPos = drop.node.worldPosition;
            const dx = playerPos.x - dropPos.x;
            const dy = playerPos.y - dropPos.y;
            const distSq = dx * dx + dy * dy;

            // 拾取判定
            if (distSq < 400) { // 20px 半径内
                this._pickUp(drop);
                this._activeDrops.splice(i, 1);
                continue;
            }

            // 在拾取范围内或磁铁激活 → 向玩家飞行
            if (distSq < pickupRangeSq || this._isMagnetActive) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const speed = this._isMagnetActive ? this.magnetSpeed : 400;

                drop.node.setWorldPosition(
                    dropPos.x + nx * speed * dt,
                    dropPos.y + ny * speed * dt,
                    0
                );
            }
        }
    }

    /**
     * 拾取物品
     */
    private _pickUp(drop: DropItem): void {
        const player = Player.instance;
        if (!player) return;

        switch (drop.type) {
            case 'exp':
                player.gainExp(drop.value);
                break;
            case 'gold':
                EventBus.instance.emit(GameEvent.GOLD_GAINED, drop.value);
                break;
            case 'hp_potion':
                player.heal(drop.value);
                break;
            case 'magnet':
                this.activateMagnet(3); // 3秒磁铁
                break;
            case 'bomb':
                this._triggerBomb();
                break;
        }

        EventBus.instance.emit(GameEvent.ITEM_PICKED, drop.type, drop.value);

        // 回收到对象池
        const poolName = `drop_${drop.type}`;
        ObjectPool.instance.put(poolName, drop.node);
    }

    /**
     * 激活磁铁效果
     */
    public activateMagnet(duration: number): void {
        this._isMagnetActive = true;
        this._magnetTimer = duration;
    }

    /**
     * 炸弹效果：清屏
     */
    private _triggerBomb(): void {
        // 由 CombatSystem 处理全屏伤害
        const { CombatSystem } = require('./CombatSystem');
        if (CombatSystem.instance) {
            const enemies = CombatSystem.instance.activeEnemies;
            for (const enemy of [...enemies]) {
                if (enemy.isAlive) {
                    enemy.takeDamage(9999);
                }
            }
        }
    }

    /**
     * 清空所有掉落物
     */
    public clearAll(): void {
        for (const drop of this._activeDrops) {
            if (drop.node && drop.node.isValid) {
                const poolName = `drop_${drop.type}`;
                ObjectPool.instance.put(poolName, drop.node);
            }
        }
        this._activeDrops = [];
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (DropSystem._instance === this) {
            DropSystem._instance = null;
        }
    }
}
