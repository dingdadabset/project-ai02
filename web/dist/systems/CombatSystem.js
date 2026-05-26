import { EventBus, GameEvent } from '../core/EventBus.js';
export class CombatSystem {
    constructor(player) {
        this.enemies = [];
        this.projectiles = [];
        this._grid = new Map();
        this._gridSize = 100;
        this._contactTimer = 0;
        this._contactInterval = 500;
        this._player = player;
        EventBus.instance.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
    }
    addEnemy(e) {
        this.enemies.push(e);
    }
    addProjectile(p) {
        this.projectiles.push(p);
    }
    update(dt) {
        this._updateGrid();
        this._updateProjectiles(dt);
        this._checkContactDamage(dt);
        this._cleanup();
    }
    _updateGrid() {
        this._grid.clear();
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const gx = Math.floor(e.pos.x / this._gridSize);
            const gy = Math.floor(e.pos.y / this._gridSize);
            const key = `${gx},${gy}`;
            if (!this._grid.has(key))
                this._grid.set(key, []);
            this._grid.get(key).push(e);
        }
    }
    getEnemiesNear(x, y, radius) {
        const result = [];
        const gridR = Math.ceil(radius / this._gridSize);
        const gx = Math.floor(x / this._gridSize);
        const gy = Math.floor(y / this._gridSize);
        const r2 = radius * radius;
        for (let dx = -gridR; dx <= gridR; dx++) {
            for (let dy = -gridR; dy <= gridR; dy++) {
                const cell = this._grid.get(`${gx + dx},${gy + dy}`);
                if (!cell)
                    continue;
                for (const e of cell) {
                    if (!e.alive)
                        continue;
                    const ddx = e.pos.x - x;
                    const ddy = e.pos.y - y;
                    if (ddx * ddx + ddy * ddy <= r2)
                        result.push(e);
                }
            }
        }
        return result;
    }
    getNearestEnemy(x, y, maxRange = Infinity) {
        let nearest = null;
        let minDistSq = maxRange * maxRange;
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const dx = e.pos.x - x;
            const dy = e.pos.y - y;
            const d = dx * dx + dy * dy;
            if (d < minDistSq) {
                minDistSq = d;
                nearest = e;
            }
        }
        return nearest;
    }
    calcPlayerDamage(baseDamage) {
        const stats = this._player.stats;
        const isCrit = Math.random() < stats.critRate;
        let dmg = baseDamage + stats.atk * 0.3;
        if (isCrit)
            dmg *= stats.critDamage;
        return { damage: Math.floor(dmg), isCrit };
    }
    dealDamageToEnemy(enemy, baseDamage) {
        if (!enemy.alive)
            return;
        const { damage, isCrit } = this.calcPlayerDamage(baseDamage);
        enemy.takeDamage(damage, isCrit);
    }
    dealAoeDamage(cx, cy, radius, baseDamage) {
        const targets = this.getEnemiesNear(cx, cy, radius);
        for (const e of targets) {
            this.dealDamageToEnemy(e, baseDamage);
        }
    }
    _updateProjectiles(dt) {
        for (const p of this.projectiles) {
            if (!p.alive)
                continue;
            p.update(dt);
            if (!p.alive)
                continue;
            // 玩家弹幕命中敌人
            if (p.data.ownerTag === 'player') {
                const targets = this.getEnemiesNear(p.pos.x, p.pos.y, p.data.radius + 30);
                for (const e of targets) {
                    if (!e.alive)
                        continue;
                    const d = e.distTo(p.pos);
                    if (d < e.radius + p.data.radius) {
                        if (p.hit(e)) {
                            this.dealDamageToEnemy(e, p.data.damage);
                        }
                        if (!p.alive)
                            break;
                    }
                }
            }
            else {
                // 敌人弹幕命中玩家
                const dx = this._player.pos.x - p.pos.x;
                const dy = this._player.pos.y - p.pos.y;
                if (dx * dx + dy * dy < (this._player.radius + p.data.radius) ** 2) {
                    this._player.takeDamage(p.data.damage);
                    p.alive = false;
                }
            }
        }
    }
    _checkContactDamage(dt) {
        this._contactTimer += dt;
        if (this._contactTimer < this._contactInterval)
            return;
        this._contactTimer = 0;
        if (!this._player.isAlive)
            return;
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const d = e.distTo(this._player.pos);
            if (d < e.radius + this._player.radius) {
                this._player.takeDamage(e.config.atk);
                break;
            }
        }
    }
    _cleanup() {
        this.enemies = this.enemies.filter(e => e.alive);
        this.projectiles = this.projectiles.filter(p => p.alive);
    }
    clearAll() {
        this.enemies = [];
        this.projectiles = [];
    }
    get enemyCount() {
        let count = 0;
        for (const e of this.enemies)
            if (e.alive)
                count++;
        return count;
    }
    _onEnemyKilled() {
        // cleanup happens in update
    }
    destroy() {
        EventBus.instance.offTarget(this);
    }
}
//# sourceMappingURL=CombatSystem.js.map