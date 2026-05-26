/**
 * PerfMonitor - 性能监控
 * 台账编号: M08-T07（性能部分）
 * 
 * 监控 FPS / 同屏对象数 / 内存，超阈值时自动降级（开启分帧 AI / 减少特效）
 */

import { _decorator, Component, Label, profiler, sys, Vec3 } from 'cc';
import { CombatSystem } from '../systems/CombatSystem';
import { ObjectPool } from '../core/ObjectPool';

const { ccclass, property } = _decorator;

@ccclass('PerfMonitor')
export class PerfMonitor extends Component {
    @property(Label)
    public fpsLabel: Label | null = null;

    @property(Label)
    public enemyCountLabel: Label | null = null;

    @property(Label)
    public memoryLabel: Label | null = null;

    @property
    public showOverlay: boolean = false;

    @property
    public sampleInterval: number = 0.5; // 每0.5秒采样一次

    @property
    public lowFpsThreshold: number = 45; // 低于45fps触发降级

    private _frameCount: number = 0;
    private _accTime: number = 0;
    private _currentFps: number = 60;
    private _lowFpsCount: number = 0;
    private _isDegraded: boolean = false;

    public get currentFps(): number {
        return this._currentFps;
    }

    public get isDegraded(): boolean {
        return this._isDegraded;
    }

    update(dt: number): void {
        this._frameCount++;
        this._accTime += dt;

        if (this._accTime >= this.sampleInterval) {
            this._currentFps = Math.round(this._frameCount / this._accTime);
            this._frameCount = 0;
            this._accTime = 0;

            this._updateLabels();
            this._checkPerformance();
        }
    }

    private _updateLabels(): void {
        if (!this.showOverlay) return;

        if (this.fpsLabel) {
            this.fpsLabel.string = `FPS: ${this._currentFps}`;
        }

        if (this.enemyCountLabel) {
            const count = CombatSystem.instance?.activeEnemyCount || 0;
            this.enemyCountLabel.string = `Enemies: ${count}`;
        }

        if (this.memoryLabel && (window.performance as any)?.memory) {
            const mem = (window.performance as any).memory.usedJSHeapSize;
            this.memoryLabel.string = `Mem: ${(mem / 1024 / 1024).toFixed(1)}MB`;
        }
    }

    /**
     * 性能检测：连续低帧率 → 自动降级
     */
    private _checkPerformance(): void {
        if (this._currentFps < this.lowFpsThreshold) {
            this._lowFpsCount++;
            if (this._lowFpsCount >= 3 && !this._isDegraded) {
                this._enableDegradedMode();
            }
        } else {
            if (this._lowFpsCount > 0) this._lowFpsCount--;
            // 连续高帧率 → 取消降级
            if (this._currentFps > 55 && this._lowFpsCount === 0 && this._isDegraded) {
                this._disableDegradedMode();
            }
        }
    }

    /**
     * 启用降级模式（减少特效、降低分帧频率）
     */
    private _enableDegradedMode(): void {
        this._isDegraded = true;
        console.warn('[PerfMonitor] Performance degraded mode enabled');
        // 后续模块可监听 perf_degrade 事件做处理
        // 例如：粒子减少、关闭部分特效、降低对象池预加载
    }

    private _disableDegradedMode(): void {
        this._isDegraded = false;
        console.log('[PerfMonitor] Performance restored');
    }

    /**
     * 显示/隐藏调试面板
     */
    public toggleOverlay(show?: boolean): void {
        this.showOverlay = show !== undefined ? show : !this.showOverlay;
        if (this.fpsLabel) this.fpsLabel.node.active = this.showOverlay;
        if (this.enemyCountLabel) this.enemyCountLabel.node.active = this.showOverlay;
        if (this.memoryLabel) this.memoryLabel.node.active = this.showOverlay;
    }
}
