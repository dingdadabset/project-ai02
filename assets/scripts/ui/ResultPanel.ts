/**
 * ResultPanel - 关卡结算弹窗
 * 台账编号: M07-T06
 */

import { _decorator, Component, Node, Label, Button, tween, UIOpacity } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { LevelSystem, LevelResult } from '../systems/LevelSystem';
import { GameManager, GameState } from '../core/GameManager';
import { SaveManager } from '../core/SaveManager';
import { SceneLoader } from '../core/SceneLoader';

const { ccclass, property } = _decorator;

@ccclass('ResultPanel')
export class ResultPanel extends Component {
    @property(Node)
    public victoryPanel: Node | null = null;

    @property(Node)
    public failurePanel: Node | null = null;

    @property(Label)
    public titleLabel: Label | null = null;

    @property(Label)
    public timeLabel: Label | null = null;

    @property(Label)
    public killCountLabel: Label | null = null;

    @property(Label)
    public goldLabel: Label | null = null;

    @property(Label)
    public expLabel: Label | null = null;

    @property(Node)
    public firstClearBadge: Node | null = null; // 首通奖励高亮

    @property(Button)
    public continueBtn: Button | null = null;

    @property(Button)
    public retryBtn: Button | null = null;

    @property(Button)
    public homeBtn: Button | null = null;

    @property(Button)
    public reviveBtn: Button | null = null; // 复活按钮（看广告）

    private _lastResult: LevelResult | null = null;
    private _isFirstClear: boolean = false;

    start(): void {
        EventBus.instance.on(GameEvent.LEVEL_COMPLETE, this._onLevelComplete, this);
        EventBus.instance.on(GameEvent.GAME_OVER, this._onGameOver, this);

        this._bindButtons();
        this._hideAll();
    }

    private _bindButtons(): void {
        this.continueBtn?.node.on(Node.EventType.TOUCH_END, this._onContinue, this);
        this.retryBtn?.node.on(Node.EventType.TOUCH_END, this._onRetry, this);
        this.homeBtn?.node.on(Node.EventType.TOUCH_END, this._onHome, this);
        this.reviveBtn?.node.on(Node.EventType.TOUCH_END, this._onRevive, this);
    }

    private _onLevelComplete(): void {
        const level = LevelSystem.instance?.currentLevel;
        if (!level) return;

        const result: LevelResult = {
            levelId: level.id,
            success: true,
            timeTaken: LevelSystem.instance.elapsedTime,
            killCount: GameManager.instance.gameData.killCount,
            score: GameManager.instance.gameData.score,
            goldEarned: this._calcGold(level.rewards.gold),
            expEarned: level.rewards.exp,
        };

        // 检查首通
        const save = SaveManager.instance.data;
        this._isFirstClear = level.chapter > save.maxChapter ||
            (level.chapter === save.maxChapter && level.stage > save.maxStage);

        if (this._isFirstClear && level.rewards.firstClear) {
            // 首通奖励发放钻石
            SaveManager.instance.addDiamond(level.rewards.firstClear.amount);
        }

        // 写入存档
        SaveManager.instance.addGold(result.goldEarned);
        SaveManager.instance.updateProgress(level.chapter, level.stage);
        SaveManager.instance.save();

        this._lastResult = result;
        this._showVictory(result);
    }

    private _onGameOver(): void {
        const level = LevelSystem.instance?.currentLevel;
        const gameData = GameManager.instance.gameData;
        const result: LevelResult = {
            levelId: level?.id || '',
            success: false,
            timeTaken: LevelSystem.instance?.elapsedTime || 0,
            killCount: gameData.killCount,
            score: gameData.score,
            goldEarned: gameData.killCount * 2, // 失败给少量金币
            expEarned: 0,
        };

        SaveManager.instance.addGold(result.goldEarned);
        SaveManager.instance.save();

        this._lastResult = result;
        this._showFailure(result);
    }

    private _calcGold(range: [number, number]): number {
        const [min, max] = range;
        return Math.floor(min + Math.random() * (max - min));
    }

    private _showVictory(result: LevelResult): void {
        if (this.victoryPanel) this.victoryPanel.active = true;
        if (this.failurePanel) this.failurePanel.active = false;

        if (this.titleLabel) this.titleLabel.string = '胜利！';
        this._updateLabels(result);

        if (this.firstClearBadge) {
            this.firstClearBadge.active = this._isFirstClear;
        }

        this._playEnterAnim();
    }

    private _showFailure(result: LevelResult): void {
        if (this.victoryPanel) this.victoryPanel.active = false;
        if (this.failurePanel) this.failurePanel.active = true;

        if (this.titleLabel) this.titleLabel.string = '失败';
        this._updateLabels(result);

        this._playEnterAnim();
    }

    private _updateLabels(result: LevelResult): void {
        const min = Math.floor(result.timeTaken / 60);
        const sec = Math.floor(result.timeTaken % 60);
        if (this.timeLabel) {
            this.timeLabel.string = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
        if (this.killCountLabel) this.killCountLabel.string = `${result.killCount}`;

        // 滚动数字动画
        this._animateNumber(this.goldLabel, 0, result.goldEarned, 0.8);
        this._animateNumber(this.expLabel, 0, result.expEarned, 0.8);
    }

    private _animateNumber(label: Label | null, from: number, to: number, dur: number): void {
        if (!label) return;
        const obj = { val: from };
        tween(obj)
            .to(dur, { val: to }, {
                onUpdate: () => {
                    label.string = Math.floor(obj.val).toString();
                }
            })
            .start();
    }

    private _playEnterAnim(): void {
        const opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.3, { opacity: 255 }).start();
    }

    private _hideAll(): void {
        if (this.victoryPanel) this.victoryPanel.active = false;
        if (this.failurePanel) this.failurePanel.active = false;
    }

    // ---- 按钮回调 ----

    private _onContinue(): void {
        // 进入下一关
        const level = LevelSystem.instance?.currentLevel;
        if (level) {
            SceneLoader.instance?.enterBattle(level.chapter, level.stage + 1);
        }
    }

    private _onRetry(): void {
        const level = LevelSystem.instance?.currentLevel;
        if (level) {
            SceneLoader.instance?.enterBattle(level.chapter, level.stage);
        }
    }

    private _onHome(): void {
        SceneLoader.instance?.returnHome();
    }

    private _onRevive(): void {
        // 触发广告播放，由 AdsManager 处理回调
        EventBus.instance.emit('show_revive_ad');
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
