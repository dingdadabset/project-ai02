/**
 * GameScene - 战斗场景（核心玩法）
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS, Balance } from '../utils/Constants.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
import { SaveManager } from '../core/SaveManager.js';
import { Player } from '../entities/Player.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { DropSystem } from '../systems/DropSystem.js';
import { createWeapon } from '../weapons/Weapon.js';
export class GameScene extends Scene {
    constructor() {
        super(SCENE_KEYS.GAME);
        this.weapons = [];
        this.elapsed = 0;
        this.killCount = 0;
        this.paused = false;
        this._damageNumbers = [];
        this._shockwaves = [];
    }
    enter(data) {
        const charId = (data && data.characterId) || 'warrior';
        const config = ConfigManager.instance.getPlayer(charId);
        if (!config) {
            console.error('[GameScene] No player config:', charId);
            return;
        }
        this.player = new Player(config);
        this.combat = new CombatSystem(this.player);
        this.spawn = new SpawnSystem(this.player, this.combat);
        this.skill = new SkillSystem(this.player);
        this.drop = new DropSystem(this.player);
        // 起始武器
        const weapon = createWeapon(config.startWeapon, this.player, this.combat, this.spawn);
        if (weapon)
            this.weapons.push(weapon);
        // 加载关卡
        const level = ConfigManager.instance.getLevelByChapterStage(1, 1);
        if (level) {
            this.spawn.startLevel(level);
        }
        this.elapsed = 0;
        this.killCount = 0;
        // 监听事件
        EventBus.instance.on(GameEvent.ENEMY_KILLED, this._onKill, this);
        EventBus.instance.on(GameEvent.ENEMY_DAMAGED, this._onDamage, this);
        EventBus.instance.on('show_skill_select', this._onSkillSelect, this);
        EventBus.instance.on(GameEvent.SKILL_SELECTED, this._onSkillChosen, this);
        EventBus.instance.on(GameEvent.WEAPON_ACQUIRED, this._onWeaponAcquired, this);
        EventBus.instance.on(GameEvent.WEAPON_UPGRADE, this._onWeaponUpgrade, this);
        EventBus.instance.on(GameEvent.PLAYER_DEAD, this._onDead, this);
        EventBus.instance.on(GameEvent.LEVEL_COMPLETE, this._onComplete, this);
        EventBus.instance.on('shockwave', this._onShockwave, this);
        EventBus.instance.on(GameEvent.PLAYER_DAMAGED, this._onPlayerDmg, this);
        EventBus.instance.on(GameEvent.PLAYER_HEAL, this._onPlayerHeal, this);
        EventBus.instance.emit(GameEvent.GAME_START);
    }
    exit() {
        EventBus.instance.offTarget(this);
        this.combat?.destroy();
        this.spawn?.destroy();
        this.skill?.destroy();
        this.drop?.destroy();
        this.weapons = [];
    }
    update(dt) {
        if (this.paused)
            return;
        if (!this.player.isAlive) {
            // 死亡时仍然显示飘字动画
            this._updateDamageNumbers(dt);
            return;
        }
        this.elapsed += dt;
        // 输入
        const dir = this.input.getJoystickDirection(80);
        this.player.setMoveDirection(dir);
        // 更新各系统
        this.player.update(dt);
        // 更新敌人 AI
        for (const e of this.combat.enemies) {
            if (e.alive)
                e.update(dt, this.player);
        }
        this.combat.update(dt);
        this.spawn.update(dt);
        this.drop.update(dt);
        for (const w of this.weapons)
            w.update(dt);
        this._updateDamageNumbers(dt);
        this._updateShockwaves(dt);
        // 相机跟随
        this.renderer.setCameraTarget(this.player.pos.x, this.player.pos.y);
    }
    render() {
        const r = this.renderer;
        r.clear('#2d3a2d');
        // 世界空间渲染
        r.beginCamera();
        this._renderWorld();
        r.endCamera();
        // 屏幕空间 UI（HUD）
        this._renderHUD();
        if (!this.player.isAlive) {
            this._renderDeathOverlay();
        }
    }
    _renderWorld() {
        const r = this.renderer;
        // 网格背景
        this._renderGrid();
        // 掉落物
        this.drop.render(r);
        // 冲击波
        for (const sw of this._shockwaves) {
            r.withAlpha(sw.alpha, () => {
                r.drawCircle(sw.x, sw.y, sw.r, undefined, '#ff6644', 4);
            });
        }
        // 武器特效（底层）
        for (const w of this.weapons)
            w.render(r);
        // 敌人
        for (const e of this.combat.enemies) {
            if (e.alive && r.isInView(e.pos.x, e.pos.y, 60))
                e.render(r);
        }
        // 玩家
        this.player.render(r);
        // 投射物（顶层）
        for (const p of this.combat.projectiles) {
            if (p.alive && r.isInView(p.pos.x, p.pos.y, 30))
                p.render(r);
        }
        // 伤害飘字
        for (const d of this._damageNumbers) {
            this.renderer.ctx.save();
            this.renderer.ctx.globalAlpha = d.life;
            this.renderer.drawText(d.text, d.x, d.y, {
                size: d.size, color: d.color, bold: true, align: 'center',
                stroke: '#000', strokeWidth: 3,
            });
            this.renderer.ctx.restore();
        }
    }
    _renderGrid() {
        const r = this.renderer;
        const ctx = r.ctx;
        const gridSize = 80;
        const camX = r.cameraX;
        const camY = r.cameraY;
        const halfW = r.width / 2;
        const halfH = r.height / 2;
        // 计算可见范围内的网格线
        const startX = Math.floor((camX - halfW) / gridSize) * gridSize;
        const endX = Math.ceil((camX + halfW) / gridSize) * gridSize;
        const startY = Math.floor((camY - halfH) / gridSize) * gridSize;
        const endY = Math.ceil((camY + halfH) / gridSize) * gridSize;
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
        // 地图边界
        const half = Balance.MAP_WIDTH / 2;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 4;
        ctx.strokeRect(-half, -half, Balance.MAP_WIDTH, Balance.MAP_HEIGHT);
    }
    _renderHUD() {
        const r = this.renderer;
        const w = r.width;
        // 上方：HP/EXP
        const padX = 20;
        const barW = w - padX * 2;
        // HP 条
        r.drawRoundedRect(padX, 20, barW, 22, 4, '#000', '#fff');
        const hpPercent = this.player.stats.currentHp / this.player.stats.maxHp;
        const hpColor = hpPercent > 0.6 ? '#4caf50' : (hpPercent > 0.3 ? '#ffc107' : '#f44336');
        r.drawRoundedRect(padX + 2, 22, (barW - 4) * Math.max(0, hpPercent), 18, 3, hpColor);
        r.drawText(`HP ${Math.ceil(this.player.stats.currentHp)} / ${this.player.stats.maxHp}`, padX + barW / 2, 31, { size: 13, color: '#fff', align: 'center', baseline: 'middle', bold: true,
            stroke: '#000', strokeWidth: 2 });
        // EXP 条
        r.drawRoundedRect(padX, 50, barW, 14, 3, '#000', '#fff');
        const expPercent = this.player.exp / this.player.expToNext;
        r.drawRoundedRect(padX + 2, 52, (barW - 4) * expPercent, 10, 2, '#7afaff');
        r.drawText(`Lv.${this.player.level}`, padX + 4, 50 - 16, { size: 16, color: '#7afaff', bold: true, stroke: '#000', strokeWidth: 3 });
        // 计时器、击杀、金币
        const min = Math.floor(this.elapsed / 60000);
        const sec = Math.floor((this.elapsed % 60000) / 1000);
        const time = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        r.drawText(time, w - padX, 76, {
            size: 18, color: '#fff', bold: true, align: 'right',
            stroke: '#000', strokeWidth: 3,
        });
        r.drawText(`击杀 ${this.killCount}`, w - padX, 100, {
            size: 14, color: '#ffaa66', align: 'right',
            stroke: '#000', strokeWidth: 2,
        });
        r.drawText(`金币 ${this.drop.totalGold}`, w - padX, 120, {
            size: 14, color: '#ffd24a', align: 'right',
            stroke: '#000', strokeWidth: 2,
        });
        // 武器图标
        let iconX = padX;
        for (const wp of this.weapons) {
            r.drawRoundedRect(iconX, 80, 40, 40, 5, '#234', '#fff');
            // 简易武器图标
            const cx = iconX + 20;
            const cy = 100;
            const colors = {
                rotating_blade: '#ccc',
                fireball: '#ff6633',
                lightning_chain: '#7afaff',
                frost_nova: '#88ddff',
            };
            r.drawCircle(cx, cy, 12, colors[wp.id] || '#fff');
            r.drawText(`${wp.level}`, cx + 14, cy + 12, {
                size: 11, color: '#fff', bold: true, stroke: '#000', strokeWidth: 2,
            });
            iconX += 46;
        }
        // 摇杆显示
        if (this.input.pointerDown) {
            const start = this.input.pointerStart;
            const cur = this.input.pointerCurrent;
            r.drawCircle(start.x, start.y, 60, undefined, 'rgba(255,255,255,0.3)', 2);
            r.drawCircle(cur.x, cur.y, 30, 'rgba(255,255,255,0.4)', '#fff', 2);
        }
    }
    _renderDeathOverlay() {
        const r = this.renderer;
        r.drawRect(0, 0, r.width, r.height, 'rgba(0,0,0,0.7)');
        r.drawText('失败', r.width / 2, r.height / 2 - 40, {
            size: 80, bold: true, color: '#ff4444', align: 'center', baseline: 'middle',
            stroke: '#000', strokeWidth: 6,
        });
        r.drawText(`存活 ${Math.floor(this.elapsed / 1000)}s    击杀 ${this.killCount}`, r.width / 2, r.height / 2 + 40, {
            size: 22, color: '#fff', align: 'center', baseline: 'middle',
        });
        r.drawText('点击返回', r.width / 2, r.height / 2 + 100, {
            size: 18, color: '#aaa', align: 'center',
        });
        // 点击返回菜单
        if (this.input.pointerDown && this.elapsed % 100 < 50) {
            // 等手指松开
        }
        if (!this.input.pointerDown && this._wasClickedAfterDeath) {
            this.game.switchTo(SCENE_KEYS.MENU);
        }
        if (this.input.pointerDown) {
            this._wasClickedAfterDeath = true;
        }
    }
    _updateDamageNumbers(dt) {
        const dtSec = dt / 1000;
        for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
            const d = this._damageNumbers[i];
            d.y += d.vy * dtSec;
            d.vy *= 0.92;
            d.life -= dtSec * 1.5;
            if (d.life <= 0)
                this._damageNumbers.splice(i, 1);
        }
    }
    _updateShockwaves(dt) {
        const dtSec = dt / 1000;
        for (let i = this._shockwaves.length - 1; i >= 0; i--) {
            const sw = this._shockwaves[i];
            sw.r += sw.max * 4 * dtSec;
            sw.alpha -= dtSec * 2;
            if (sw.alpha <= 0)
                this._shockwaves.splice(i, 1);
        }
    }
    // ---- 事件回调 ----
    _onDamage(data) {
        this._damageNumbers.push({
            x: data.x + (Math.random() - 0.5) * 20,
            y: data.y - 20,
            text: data.isCrit ? `${data.damage}!` : `${data.damage}`,
            color: data.isCrit ? '#ff6644' : '#fff',
            size: data.isCrit ? 24 : 16,
            life: 1,
            vy: -60,
        });
    }
    _onPlayerDmg(damage) {
        this._damageNumbers.push({
            x: this.player.pos.x,
            y: this.player.pos.y - 20,
            text: `-${damage}`,
            color: '#ff6644', size: 22,
            life: 1, vy: -50,
        });
    }
    _onPlayerHeal(amount) {
        this._damageNumbers.push({
            x: this.player.pos.x,
            y: this.player.pos.y - 20,
            text: `+${amount}`,
            color: '#7afaff', size: 22,
            life: 1, vy: -50,
        });
    }
    _onKill() {
        this.killCount++;
    }
    _onSkillSelect(options) {
        this.paused = true;
        this.game.switchTo(SCENE_KEYS.SKILL_SELECT, { options, gameScene: this });
    }
    _onSkillChosen() {
        this.paused = false;
    }
    _onWeaponAcquired(weaponId) {
        if (this.weapons.find(w => w.id === weaponId))
            return;
        if (this.weapons.length >= Balance.MAX_WEAPONS)
            return;
        const w = createWeapon(weaponId, this.player, this.combat, this.spawn);
        if (w)
            this.weapons.push(w);
    }
    _onWeaponUpgrade(weaponId) {
        const w = this.weapons.find(w => w.id === weaponId);
        if (w)
            w.upgrade();
    }
    _onShockwave(data) {
        this._shockwaves.push({ x: data.x, y: data.y, r: 10, max: data.radius, alpha: 1 });
    }
    _onDead() {
        SaveManager.instance.addGold(this.drop.totalGold);
        SaveManager.instance.data.totalKills += this.killCount;
        SaveManager.instance.save();
    }
    _onComplete() {
        SaveManager.instance.addGold(this.drop.totalGold + 200);
        SaveManager.instance.data.totalKills += this.killCount;
        SaveManager.instance.save();
        this.game.switchTo(SCENE_KEYS.RESULT, {
            success: true, time: this.elapsed, killCount: this.killCount, gold: this.drop.totalGold + 200,
        });
    }
    resume() {
        this.paused = false;
    }
}
//# sourceMappingURL=GameScene.js.map