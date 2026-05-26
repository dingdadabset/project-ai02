/**
 * Timer - 计时器工具
 * 支持倒计时、循环计时、暂停等
 */

export type TimerCallback = () => void;

export interface TimerOptions {
    duration: number;       // 持续时间（秒）
    repeat?: number;        // 重复次数（-1=无限）
    delay?: number;         // 首次延迟
    onComplete?: TimerCallback;
    onTick?: TimerCallback; // 每次循环回调
    autoStart?: boolean;
}

export class Timer {
    private _duration: number;
    private _repeat: number;
    private _delay: number;
    private _elapsed: number = 0;
    private _currentDelay: number = 0;
    private _repeatCount: number = 0;
    private _isRunning: boolean = false;
    private _isPaused: boolean = false;
    private _onComplete: TimerCallback | null;
    private _onTick: TimerCallback | null;

    constructor(options: TimerOptions) {
        this._duration = options.duration;
        this._repeat = options.repeat ?? 0;
        this._delay = options.delay ?? 0;
        this._onComplete = options.onComplete ?? null;
        this._onTick = options.onTick ?? null;
        this._currentDelay = this._delay;

        if (options.autoStart !== false) {
            this.start();
        }
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }

    public get isPaused(): boolean {
        return this._isPaused;
    }

    public get progress(): number {
        return Math.min(1, this._elapsed / this._duration);
    }

    public get remaining(): number {
        return Math.max(0, this._duration - this._elapsed);
    }

    public start(): void {
        this._isRunning = true;
        this._isPaused = false;
        this._elapsed = 0;
        this._repeatCount = 0;
        this._currentDelay = this._delay;
    }

    public stop(): void {
        this._isRunning = false;
    }

    public pause(): void {
        this._isPaused = true;
    }

    public resume(): void {
        this._isPaused = false;
    }

    public reset(): void {
        this._elapsed = 0;
        this._repeatCount = 0;
        this._currentDelay = this._delay;
    }

    /**
     * 每帧调用
     */
    public update(dt: number): void {
        if (!this._isRunning || this._isPaused) return;

        // 延迟阶段
        if (this._currentDelay > 0) {
            this._currentDelay -= dt;
            return;
        }

        this._elapsed += dt;

        if (this._elapsed >= this._duration) {
            this._elapsed -= this._duration;
            this._repeatCount++;

            if (this._onTick) {
                this._onTick();
            }

            // 检查是否结束
            if (this._repeat >= 0 && this._repeatCount > this._repeat) {
                this._isRunning = false;
                if (this._onComplete) {
                    this._onComplete();
                }
            }
        }
    }
}

/**
 * TimerManager - 统一管理所有 Timer
 */
export class TimerManager {
    private static _instance: TimerManager | null = null;
    private _timers: Timer[] = [];

    public static get instance(): TimerManager {
        if (!TimerManager._instance) {
            TimerManager._instance = new TimerManager();
        }
        return TimerManager._instance;
    }

    public add(timer: Timer): Timer {
        this._timers.push(timer);
        return timer;
    }

    public remove(timer: Timer): void {
        const idx = this._timers.indexOf(timer);
        if (idx !== -1) {
            this._timers.splice(idx, 1);
        }
    }

    public update(dt: number): void {
        for (let i = this._timers.length - 1; i >= 0; i--) {
            const timer = this._timers[i];
            timer.update(dt);
            if (!timer.isRunning) {
                this._timers.splice(i, 1);
            }
        }
    }

    public clear(): void {
        this._timers = [];
    }

    /**
     * 快捷方法：延迟执行
     */
    public delay(seconds: number, callback: TimerCallback): Timer {
        const timer = new Timer({
            duration: seconds,
            repeat: 0,
            onComplete: callback,
        });
        this.add(timer);
        return timer;
    }

    /**
     * 快捷方法：循环执行
     */
    public loop(interval: number, callback: TimerCallback, repeat: number = -1): Timer {
        const timer = new Timer({
            duration: interval,
            repeat,
            onTick: callback,
        });
        this.add(timer);
        return timer;
    }
}
