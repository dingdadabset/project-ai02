/**
 * ObjectPool - 通用对象池
 * 避免频繁创建/销毁节点导致 GC，支持同屏 100+ 实体
 */

import { Node, Prefab, instantiate } from 'cc';

export class ObjectPool {
    private _pools: Map<string, Node[]> = new Map();
    private _prefabs: Map<string, Prefab> = new Map();
    private _activeCount: Map<string, number> = new Map();

    private static _instance: ObjectPool | null = null;

    public static get instance(): ObjectPool {
        if (!ObjectPool._instance) {
            ObjectPool._instance = new ObjectPool();
        }
        return ObjectPool._instance;
    }

    /**
     * 注册预制体到对象池
     */
    public registerPrefab(name: string, prefab: Prefab): void {
        this._prefabs.set(name, prefab);
        if (!this._pools.has(name)) {
            this._pools.set(name, []);
            this._activeCount.set(name, 0);
        }
    }

    /**
     * 预加载指定数量的对象
     */
    public preload(name: string, count: number): void {
        const prefab = this._prefabs.get(name);
        if (!prefab) {
            console.warn(`[ObjectPool] Prefab not registered: ${name}`);
            return;
        }

        const pool = this._pools.get(name)!;
        for (let i = 0; i < count; i++) {
            const node = instantiate(prefab);
            node.active = false;
            pool.push(node);
        }
    }

    /**
     * 从池中获取一个对象
     */
    public get(name: string): Node | null {
        const pool = this._pools.get(name);
        const prefab = this._prefabs.get(name);

        if (!pool || !prefab) {
            console.warn(`[ObjectPool] Pool not found: ${name}`);
            return null;
        }

        let node: Node;
        if (pool.length > 0) {
            node = pool.pop()!;
        } else {
            // 池为空，创建新实例
            node = instantiate(prefab);
        }

        node.active = true;
        this._activeCount.set(name, (this._activeCount.get(name) || 0) + 1);
        return node;
    }

    /**
     * 归还对象到池中
     */
    public put(name: string, node: Node): void {
        const pool = this._pools.get(name);
        if (!pool) {
            node.destroy();
            return;
        }

        node.active = false;
        node.removeFromParent();
        pool.push(node);
        this._activeCount.set(name, Math.max(0, (this._activeCount.get(name) || 1) - 1));
    }

    /**
     * 获取当前活跃数量
     */
    public getActiveCount(name: string): number {
        return this._activeCount.get(name) || 0;
    }

    /**
     * 获取池中可用数量
     */
    public getAvailableCount(name: string): number {
        const pool = this._pools.get(name);
        return pool ? pool.length : 0;
    }

    /**
     * 清空指定池
     */
    public clearPool(name: string): void {
        const pool = this._pools.get(name);
        if (pool) {
            pool.forEach(node => node.destroy());
            pool.length = 0;
            this._activeCount.set(name, 0);
        }
    }

    /**
     * 清空所有池
     */
    public clearAll(): void {
        this._pools.forEach((pool, name) => {
            pool.forEach(node => node.destroy());
            pool.length = 0;
        });
        this._pools.clear();
        this._activeCount.clear();
    }
}
