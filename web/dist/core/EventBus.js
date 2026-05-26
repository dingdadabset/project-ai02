/**
 * EventBus - 全局事件总线
 */
export var GameEvent;
(function (GameEvent) {
    GameEvent["ENEMY_KILLED"] = "enemy_killed";
    GameEvent["ENEMY_DAMAGED"] = "enemy_damaged";
    GameEvent["PLAYER_DAMAGED"] = "player_damaged";
    GameEvent["PLAYER_DEAD"] = "player_dead";
    GameEvent["PLAYER_HEAL"] = "player_heal";
    GameEvent["EXP_GAINED"] = "exp_gained";
    GameEvent["PLAYER_LEVEL_UP"] = "player_level_up";
    GameEvent["SKILL_SELECTED"] = "skill_selected";
    GameEvent["WAVE_START"] = "wave_start";
    GameEvent["BOSS_SPAWN"] = "boss_spawn";
    GameEvent["LEVEL_COMPLETE"] = "level_complete";
    GameEvent["GAME_OVER"] = "game_over";
    GameEvent["ITEM_PICKED"] = "item_picked";
    GameEvent["GOLD_GAINED"] = "gold_gained";
    GameEvent["WEAPON_UPGRADE"] = "weapon_upgrade";
    GameEvent["WEAPON_ACQUIRED"] = "weapon_acquired";
    GameEvent["GAME_PAUSE"] = "game_pause";
    GameEvent["GAME_RESUME"] = "game_resume";
    GameEvent["GAME_START"] = "game_start";
})(GameEvent || (GameEvent = {}));
export class EventBus {
    constructor() {
        this._events = new Map();
    }
    static get instance() {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }
    on(event, callback, target) {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event).push({ callback, target: target || null, once: false });
    }
    once(event, callback, target) {
        if (!this._events.has(event)) {
            this._events.set(event, []);
        }
        this._events.get(event).push({ callback, target: target || null, once: true });
    }
    off(event, callback, target) {
        const entries = this._events.get(event);
        if (!entries)
            return;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].callback === callback && entries[i].target === (target || null)) {
                entries.splice(i, 1);
            }
        }
    }
    offTarget(target) {
        this._events.forEach((entries) => {
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].target === target) {
                    entries.splice(i, 1);
                }
            }
        });
    }
    emit(event, ...args) {
        const entries = this._events.get(event);
        if (!entries)
            return;
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            entry.callback.apply(entry.target, args);
            if (entry.once) {
                entries.splice(i, 1);
            }
        }
    }
    clear() {
        this._events.clear();
    }
}
EventBus._instance = null;
//# sourceMappingURL=EventBus.js.map