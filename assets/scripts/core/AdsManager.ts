/**
 * AdsManager - 广告 SDK 抽象层
 * 台账编号: M08-T06（广告部分）
 * 
 * 通过抽象接口隔离具体 SDK，便于切换平台（穿山甲/优量汇/AdMob/Unity Ads）
 * 当前提供 mock 实现用于开发联调
 */

import { _decorator, Component } from 'cc';
import { EventBus } from './EventBus';
import { Player } from '../entities/Player';
import { SaveManager } from './SaveManager';

const { ccclass, property } = _decorator;

export type AdResult = 'completed' | 'cancelled' | 'failed';
export type AdRewardType = 'revive' | 'double_reward' | 'extra_chest' | 'free_skill_refresh';

export interface AdRewardCallback {
    (result: AdResult, type: AdRewardType): void;
}

@ccclass('AdsManager')
export class AdsManager extends Component {
    private static _instance: AdsManager | null = null;

    @property
    public mockMode: boolean = true; // 开发模式：模拟广告

    @property
    public mockSuccessRate: number = 0.95; // mock 模式下成功率

    private _isInitialized: boolean = false;
    private _isLoading: boolean = false;

    public static get instance(): AdsManager {
        return AdsManager._instance!;
    }

    onLoad(): void {
        if (AdsManager._instance && AdsManager._instance !== this) {
            this.node.destroy();
            return;
        }
        AdsManager._instance = this;
        this._init();

        EventBus.instance.on('show_revive_ad', () => {
            this.showRewardedAd('revive', this._onReviveResult.bind(this));
        });
    }

    private _init(): void {
        if (this.mockMode) {
            console.log('[AdsManager] Initialized in mock mode.');
            this._isInitialized = true;
            return;
        }

        // 真实SDK初始化（按平台插入对应SDK代码）
        // window.TT.shareAppMessage(...) for 抖音
        // window.uni.createRewardedVideoAd(...) for 微信小游戏
        // 等等
        this._isInitialized = true;
    }

    /**
     * 显示激励视频广告
     */
    public showRewardedAd(type: AdRewardType, callback: AdRewardCallback): void {
        if (!this._isInitialized) {
            console.warn('[AdsManager] Not initialized.');
            callback('failed', type);
            return;
        }
        if (this._isLoading) {
            EventBus.instance.emit('toast', '广告加载中，请稍候');
            return;
        }

        this._isLoading = true;

        if (this.mockMode) {
            // 模拟广告：等待2秒后回调
            this.scheduleOnce(() => {
                this._isLoading = false;
                if (Math.random() < this.mockSuccessRate) {
                    callback('completed', type);
                } else {
                    callback('failed', type);
                }
            }, 2);
            return;
        }

        // 真实SDK调用：示例（需要替换为目标平台 SDK）
        // (window as any).TT?.createRewardedVideoAd(...)
        this._isLoading = false;
        callback('failed', type); // 默认未接入时返回失败
    }

    /**
     * 复活广告回调
     */
    private _onReviveResult(result: AdResult, type: AdRewardType): void {
        if (result === 'completed') {
            // 复活玩家
            const player = Player.instance;
            if (player) {
                player.heal(player.stats.maxHp); // 满血复活
                EventBus.instance.emit('player_revived');
                EventBus.instance.emit('toast', '复活成功！');
            }
        } else {
            EventBus.instance.emit('toast', '广告未完成，无法复活');
        }
    }

    /**
     * 双倍奖励
     */
    public showDoubleRewardAd(rewardData: { gold?: number; diamond?: number }, callback?: () => void): void {
        this.showRewardedAd('double_reward', (result) => {
            if (result === 'completed') {
                if (rewardData.gold) SaveManager.instance.addGold(rewardData.gold);
                if (rewardData.diamond) SaveManager.instance.addDiamond(rewardData.diamond);
                SaveManager.instance.save();
                EventBus.instance.emit('toast', '双倍奖励已领取！');
                callback?.();
            }
        });
    }

    /**
     * 是否当前可以播放广告（无网络/CD等）
     */
    public canShowAd(): boolean {
        return this._isInitialized && !this._isLoading;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (AdsManager._instance === this) {
            AdsManager._instance = null;
        }
    }
}
