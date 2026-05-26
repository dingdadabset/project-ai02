/**
 * SkillSystem - 技能选择
 */
import { ConfigManager } from '../core/ConfigManager.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
export class SkillSystem {
    constructor(player) {
        this.acquired = new Map(); // id → level
        this.currentOptions = [];
        this._optionCount = 3;
        this._player = player;
        EventBus.instance.on(GameEvent.PLAYER_LEVEL_UP, this._onLevelUp, this);
    }
    _onLevelUp(level) {
        this.currentOptions = this._generateOptions();
        EventBus.instance.emit('show_skill_select', this.currentOptions);
    }
    _generateOptions() {
        const all = ConfigManager.instance.getAllSkills();
        const candidates = [];
        for (const cfg of all) {
            const cur = this.acquired.get(cfg.id) || 0;
            if (cur >= cfg.maxLevel)
                continue;
            candidates.push({ config: cfg, nextLevel: cur + 1 });
        }
        // 加权随机
        const result = [];
        const rarityWeight = { common: 60, rare: 25, epic: 12, legendary: 3 };
        const pool = [...candidates];
        for (let i = 0; i < this._optionCount && pool.length > 0; i++) {
            const weights = pool.map(o => rarityWeight[o.config.rarity] || 10);
            let total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            let pickedIdx = 0;
            for (let j = 0; j < pool.length; j++) {
                r -= weights[j];
                if (r <= 0) {
                    pickedIdx = j;
                    break;
                }
            }
            result.push(pool[pickedIdx]);
            pool.splice(pickedIdx, 1);
        }
        return result;
    }
    selectSkill(idx) {
        if (idx < 0 || idx >= this.currentOptions.length)
            return null;
        const opt = this.currentOptions[idx];
        this._applyEffect(opt);
        this.currentOptions = [];
        EventBus.instance.emit(GameEvent.SKILL_SELECTED, opt);
        return opt;
    }
    _applyEffect(opt) {
        this.acquired.set(opt.config.id, opt.nextLevel);
        for (const eff of opt.config.effects) {
            if (eff.type === 'flat') {
                this._player.addStat(eff.attribute, eff.value);
            }
            else {
                this._player.addStatPercent(eff.attribute, eff.value);
            }
        }
        if (opt.config.type === 'weapon_new') {
            EventBus.instance.emit(GameEvent.WEAPON_ACQUIRED, opt.config.id);
        }
        else if (opt.config.type === 'weapon_upgrade') {
            EventBus.instance.emit(GameEvent.WEAPON_UPGRADE, opt.config.id, opt.nextLevel);
        }
    }
    destroy() {
        EventBus.instance.offTarget(this);
    }
}
//# sourceMappingURL=SkillSystem.js.map