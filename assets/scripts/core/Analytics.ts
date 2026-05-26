/**
 * Analytics - 数据埋点 + 崩溃监控
 * 台账编号: M08-T07（数据埋点部分）
 * 
 * 提供统一的事件上报接口，便于切换不同分析平台（友盟/GA/TalkingData）
 */

import { _decorator, Component, sys } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameManager } from './GameManager';
import { SaveManager } from './SaveManager';

const { ccclass, property } = _decorator;

interface AnalyticsEvent {
    name: string;
    params: Record<string, any>;
    timestamp: number;
}

@ccclass('Analytics')
export class Analytics extends Component {
    private static _instance: Analytics | null = null;

    @property
    public mockMode: boolean = true;

    @property
    public sessionId: string = '';

    @property
    public batchSize: number = 20;        // 批量上报阈值
    @property
    public flushInterval: number = 30;    // 定时上报间隔（秒）

    private _queue: AnalyticsEvent[] = [];
    private _sessionStart: number = 0;
    private _flushTimer: number = 0;

    public static get instance(): Analytics {
        return Analytics._instance!;
    }

    onLoad(): void {
        if (Analytics._instance && Analytics._instance !== this) {
            this.node.destroy();
            return;
        }
        Analytics._instance = this;
        this._init();
    }

    private _init(): void {
        this.sessionId = this._generateSessionId();
        this._sessionStart = Date.now();

        // 监听核心事件做埋点
        const bus = EventBus.instance;
        bus.on(GameEvent.GAME_START, () => this.track('game_start', this._buildContext()));
        bus.on(GameEvent.LEVEL_COMPLETE, () => this.track('level_complete', this._buildContext()));
        bus.on(GameEvent.GAME_OVER, () => this.track('game_over', this._buildContext()));
        bus.on(GameEvent.PLAYER_LEVEL_UP, (level: number) => {
            this.track('player_level_up', { level });
        });
        bus.on(GameEvent.SKILL_SELECTED, (option: any) => {
            this.track('skill_selected', { skillId: option?.config?.id, level: option?.nextLevel });
        });
        bus.on('iap_success', (data: any) => {
            this.track('iap_success', { productId: data?.product?.id, amount: data?.product?.price });
        });

        // 全局错误捕获
        if (sys.isBrowser) {
            window.addEventListener('error', (event) => {
                this.trackError('js_error', event.message, event.filename, event.lineno);
            });
            window.addEventListener('unhandledrejection', (event) => {
                this.trackError('unhandled_rejection', `${event.reason}`, '', 0);
            });
        }

        console.log(`[Analytics] Session started: ${this.sessionId}`);
    }

    /**
     * 上报事件
     */
    public track(eventName: string, params: Record<string, any> = {}): void {
        const event: AnalyticsEvent = {
            name: eventName,
            params: { ...params, sessionId: this.sessionId, ...this._buildContext() },
            timestamp: Date.now(),
        };
        this._queue.push(event);

        if (this.mockMode) {
            console.log('[Analytics]', eventName, params);
        }

        if (this._queue.length >= this.batchSize) {
            this._flush();
        }
    }

    /**
     * 上报错误
     */
    public trackError(type: string, message: string, file: string = '', line: number = 0): void {
        this.track('error', { type, message, file, line });
    }

    /**
     * 上报自定义异常
     */
    public trackException(error: Error, context: string = ''): void {
        this.track('exception', {
            message: error.message,
            stack: error.stack,
            context,
        });
    }

    /**
     * 构建上下文（用户/设备/版本）
     */
    private _buildContext(): Record<string, any> {
        const save = SaveManager.instance?.data;
        return {
            playerId: save?.playerId,
            playerLevel: GameManager.instance?.gameData?.playerLevel,
            chapter: save?.maxChapter,
            stage: save?.maxStage,
            gold: save?.gold,
            diamond: save?.diamond,
            platform: sys.platform,
            language: sys.language,
            sessionDuration: Math.floor((Date.now() - this._sessionStart) / 1000),
        };
    }

    update(dt: number): void {
        this._flushTimer += dt;
        if (this._flushTimer >= this.flushInterval) {
            this._flushTimer = 0;
            if (this._queue.length > 0) this._flush();
        }
    }

    /**
     * 上报队列到服务器
     */
    private _flush(): void {
        if (this._queue.length === 0) return;
        const events = this._queue.slice();
        this._queue = [];

        if (this.mockMode) {
            console.log(`[Analytics] Mock flush ${events.length} events.`);
            return;
        }

        // 真实上报：根据平台调用 SDK
        // window.umeng.onEvent(...) 友盟
        // gtag('event', name, params) GA
        // 或自建 API: fetch('https://api.example.com/track', {...})
    }

    private _generateSessionId(): string {
        return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }

    onDestroy(): void {
        this._flush();
        if (Analytics._instance === this) {
            Analytics._instance = null;
        }
    }
}
