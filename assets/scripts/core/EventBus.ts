/**
 * EventBus - 全局事件总线
 * 模块间通过事件通信，降低耦合
 */

type EventCallback = (...args: any[]) => void;

interface EventEntry {
    callback: EventCallback;
    target: any;
    once: boolean;
}

export enum GameEvent {
    // 战斗相关
    ENEMY_KILLED = "enemy_killed",
    ENEMY_DAMAGED = "enemy_damaged",
    PLAYER_DAMAGED = "player_damaged",
    PLAYER_DEAD = "player_dead",
    PLAYER_HEAL = "player_heal",

    // 升级相关
    EXP_GAINED = "exp_gained",
    PLAYER_LEVEL_UP = "player_level_up",
    SKILL_SELECTED = "skill_selected",

    // 关卡相关
    WAVE_START = "wave_start",
    WAVE_COMPLETE = "wave_complete",
    BOSS_SPAWN = "boss_spawn",
    LEVEL_COMPLETE = "level_complete",
    GAME_OVER = "game_over",

    // 掉落相关
    ITEM_DROPPED = "item_dropped",
    ITEM_PICKED = "item_picked",
    GOLD_GAINED = "gold_gained",

    // 武器相关
    WEAPON_UPGRADE = "weapon_upgrade",
    WEAPON_ACQUIRED = "weapon_acquired",

    // 系统相关
    GAME_PAUSE = "game_pause",
    GAME_RESUME = "game_resume",
    GAME_START = "game_start",
}

export class EventBus {
    private static _instance: EventBus | null = null;
    private _events: Map<string, EventEntry[]> = new Map();

    public static get instance(): EventBus {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    /**
     * 注册事件监听
     */
    public on(event: string, callback: EventCallback, target?: any): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target: target || null, once: false });
    }

    /**
     * 注册一次性事件监听
     */
    public once(event: string, callback: EventCallback, target?: any): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target: target || null, once: true });
    }

    /**
     * 取消事件监听
     */
    public off(event: string, callback: EventCallback, target?: any): void {
        const entries = this._events.get(event);
        if (!entries) return;

        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].callback === callback && entries[i].target === (target || null)) {
                entries.splice(i, 1);
            }
        }
    }

    /**
     * 移除目标对象的所有监听
     */
    public offTarget(target: any): void {
        this._events.forEach((entries, event) => {
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].target === target) {
                    entries.splice(i, 1);
                }
            }
        });
    }

    /**
     * 触发事件
     */
    public emit(event: string, ...args: any[]): void {
        const entries = this._events.get(event);
        if (!entries) return;

        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            entry.callback.apply(entry.target, args);
            if (entry.once) {
                entries.splice(i, 1);
            }
        }
    }

    /**
     * 清空所有事件
     */
    public clear(): void {
        this._events.clear();
    }
}
