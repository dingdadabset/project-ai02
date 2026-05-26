/**
 * ConfigManager - 配置管理（运行时 fetch 加载）
 */
export class ConfigManager {
    constructor() {
        this._enemies = new Map();
        this._weapons = new Map();
        this._skills = new Map();
        this._levels = new Map();
        this._players = new Map();
        this._isLoaded = false;
    }
    static get instance() {
        if (!ConfigManager._instance)
            ConfigManager._instance = new ConfigManager();
        return ConfigManager._instance;
    }
    get isLoaded() { return this._isLoaded; }
    /** 异步加载所有配置 */
    async load() {
        const base = './src/configs/';
        const [enemy, weapon, skill, level, player] = await Promise.all([
            fetch(base + 'enemy_config.json').then(r => r.json()),
            fetch(base + 'weapon_config.json').then(r => r.json()),
            fetch(base + 'skill_config.json').then(r => r.json()),
            fetch(base + 'level_config.json').then(r => r.json()),
            fetch(base + 'player_config.json').then(r => r.json()),
        ]);
        enemy.enemies.forEach(e => this._enemies.set(e.id, e));
        weapon.weapons.forEach(w => this._weapons.set(w.id, w));
        skill.skills.forEach(s => this._skills.set(s.id, s));
        level.levels.forEach(l => this._levels.set(l.id, l));
        player.players.forEach(p => this._players.set(p.id, p));
        this._isLoaded = true;
        console.log(`[ConfigManager] Loaded: ${this._enemies.size} enemies, ${this._weapons.size} weapons, ${this._skills.size} skills, ${this._levels.size} levels, ${this._players.size} players.`);
    }
    getEnemy(id) { return this._enemies.get(id); }
    getWeapon(id) { return this._weapons.get(id); }
    getSkill(id) { return this._skills.get(id); }
    getLevel(id) { return this._levels.get(id); }
    getLevelByChapterStage(c, s) {
        return Array.from(this._levels.values()).find(l => l.chapter === c && l.stage === s);
    }
    getPlayer(id) { return this._players.get(id); }
    getAllPlayers() { return Array.from(this._players.values()); }
    getAllSkills() { return Array.from(this._skills.values()); }
    getAllEnemies() { return Array.from(this._enemies.values()); }
}
ConfigManager._instance = null;
//# sourceMappingURL=ConfigManager.js.map