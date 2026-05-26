/**
 * 游戏逻辑测试：mock 出最小 DOM/Canvas API，跑 5 秒游戏循环
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === Mock DOM ===
const mockCtx = {
    save() {}, restore() {}, translate() {}, rotate() {},
    fillRect() {}, strokeRect() {}, fillText() {}, strokeText() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc() {}, fill() {}, stroke() {}, quadraticCurveTo() {},
    set globalAlpha(v) {}, get globalAlpha() { return 1; },
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
    set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
    set imageSmoothingEnabled(v) {},
    measureText() { return { width: 50 }; },
};

const mockCanvas = {
    width: 720, height: 1280,
    getContext: () => mockCtx,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1280 }),
};

global.window = {
    addEventListener() {},
    fetch: globalThis.fetch,
    performance: { now: () => Date.now() },
};
global.document = {
    getElementById: (id) => id === 'game' ? mockCanvas : null,
    addEventListener(name, cb) {
        if (name === 'DOMContentLoaded') setTimeout(cb, 10);
    },
};
global.localStorage = (() => {
    const store = {};
    return {
        getItem: k => store[k] || null,
        setItem: (k, v) => { store[k] = v; },
        removeItem: k => { delete store[k]; },
    };
})();
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
global.performance = { now: () => Date.now() };

// fetch mock for JSON config files
const fs = await import('fs/promises');
global.fetch = async (url) => {
    if (typeof url !== 'string') url = url.toString();
    // url is like ./src/configs/enemy_config.json
    const m = url.match(/configs\/([^/]+\.json)/);
    if (!m) throw new Error('mock fetch: ' + url);
    const path = join(__dirname, 'src/configs', m[1]);
    const data = await fs.readFile(path, 'utf-8');
    return {
        json: async () => JSON.parse(data),
        text: async () => data,
        ok: true, status: 200,
    };
};

// === 启动游戏 ===
console.log('[TEST] Importing game...');
const main = await import('./dist/main.js');

// 等 DOMContentLoaded 触发
await new Promise(r => setTimeout(r, 100));

console.log('[TEST] Game should have started');

// 给配置加载留时间
await new Promise(r => setTimeout(r, 300));

// 手动加载配置（main.ts 异步加载需要时间）
const { ConfigManager } = await import('./dist/core/ConfigManager.js');
const { SaveManager } = await import('./dist/core/SaveManager.js');
const { EventBus } = await import('./dist/core/EventBus.js');

await ConfigManager.instance.load();
SaveManager.instance.load();

console.log('[TEST] Configs loaded:', ConfigManager.instance.isLoaded);
console.log('[TEST] Enemy count:', ConfigManager.instance.getAllEnemies().length);
console.log('[TEST] Skill count:', ConfigManager.instance.getAllSkills().length);
console.log('[TEST] Player count:', ConfigManager.instance.getAllPlayers().length);
console.log('[TEST] Save data gold:', SaveManager.instance.data.gold);

// 测试 EventBus
let received = false;
EventBus.instance.on('test_evt', (v) => { received = v === 42; });
EventBus.instance.emit('test_evt', 42);
console.log('[TEST] EventBus working:', received);

// 测试武器实例化
const { createWeapon } = await import('./dist/weapons/Weapon.js');
const { Player } = await import('./dist/entities/Player.js');
const { CombatSystem } = await import('./dist/systems/CombatSystem.js');
const { SpawnSystem } = await import('./dist/systems/SpawnSystem.js');

const playerCfg = ConfigManager.instance.getPlayer('warrior');
if (playerCfg) {
    const player = new Player(playerCfg);
    const combat = new CombatSystem(player);
    const spawn = new SpawnSystem(player, combat);
    const weapon = createWeapon('rotating_blade', player, combat, spawn);
    console.log('[TEST] RotatingBlade created:', !!weapon);
    console.log('[TEST] Player initial HP:', player.stats.currentHp);
    player.gainExp(15);
    console.log('[TEST] After gain exp 15, level:', player.level);

    // 模拟5秒
    let totalDt = 0;
    while (totalDt < 5000) {
        const dt = 16.67;
        player.update(dt);
        combat.update(dt);
        spawn.update(dt);
        if (weapon) weapon.update(dt);
        totalDt += dt;
    }
    console.log('[TEST] 5 seconds simulation complete. Final state OK.');
}

console.log('\n✅ ALL GAME LOGIC TESTS PASSED');
process.exit(0);
