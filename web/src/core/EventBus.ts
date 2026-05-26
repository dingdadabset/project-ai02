/**
 * EventBus - 全局事件总线
 */

type EventCallback = (...args: any[]) => void;

interface EventEntry {
    callback: EventCallback;
    target: any;
    once: boolean;
}

export enum GameEvent {
    ENEMY_KILLED = 'enemy_killed',
    ENEMY_DAMAGED = 'enemy_damaged',
    PLAYER_DAMAGED = 'player_damaged',
    PLAYER_DEAD = 'player_dead',
    PLAYER_HEAL = 'player_heal',
    EXP_GAINED = 'exp_gained',
    PLAYER_LEVEL_UP = 'player_level_up',
    SKILL_SELECTED = 'skill_selected',
    WAVE_START = 'wave_start',
    BOSS_SPAWN = 'boss_spawn',
    LEVEL_COMPLETE = 'level_complete',
    GAME_OVER = 'game_over',
    ITEM_PICKED = 'item_picked',
    GOLD_GAINED = 'gold_gained',
    WEAPON_UPGRADE = 'weapon_upgrade',
    WEAPON_ACQUIRED = 'weapon_acquired',
    GAME_PAUSE = 'game_pause',
    GAME_RESUME = 'game_resume',
    GAME_START = 'game_start',
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

    public on(event: string, callback: EventCallback, target?: any): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target: target || null, once: false });
    }

    public once(event: string, callback: EventCallback, target?: any): void {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event)!.push({ callback, target: target || null, once: true });
    }

    public off(event: string, callback: EventCallback, target?: any): void {
        const entries = this._events.get(event);
        if (!entries) return;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].callback === callback && entries[i].target === (target || null)) {
                entries.splice(i, 1);
            }
        }
    }

    public offTarget(target: any): void {
        this._events.forEach((entries) => {
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].target === target) {
                    entries.splice(i, 1);
                }
            }
        });
    }

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

    public clear(): void {
        this._events.clear();
    }
}
