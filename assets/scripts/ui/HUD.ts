/**
 * HUD - 战斗界面（Head-Up Display）
 * 显示血条、经验条、计时器、击杀数等
 */

import { _decorator, Component, Node, Label, ProgressBar, Sprite, Color } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { Player } from '../entities/Player';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('HUD')
export class HUD extends Component {
    @property(ProgressBar)
    public hpBar: ProgressBar | null = null;

    @property(ProgressBar)
    public expBar: ProgressBar | null = null;

    @property(Label)
    public levelLabel: Label | null = null;

    @property(Label)
    public timerLabel: Label | null = null;

    @property(Label)
    public killCountLabel: Label | null = null;

    @property(Label)
    public goldLabel: Label | null = null;

    @property(Node)
    public pauseBtn: Node | null = null;

    start(): void {
        this._registerEvents();
    }

    private _registerEvents(): void {
        const bus = EventBus.instance;
        bus.on(GameEvent.PLAYER_DAMAGED, this._updateHpBar, this);
        bus.on(GameEvent.PLAYER_HEAL, this._updateHpBar, this);
        bus.on(GameEvent.EXP_GAINED, this._updateExpBar, this);
        bus.on(GameEvent.PLAYER_LEVEL_UP, this._onLevelUp, this);
        bus.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
        bus.on(GameEvent.GOLD_GAINED, this._onGoldGained, this);
    }

    update(dt: number): void {
        this._updateTimer();
        this._updateHpDisplay();
    }

    private _updateHpDisplay(): void {
        const player = Player.instance;
        if (!player || !this.hpBar) return;

        const percent = player.stats.currentHp / player.stats.maxHp;
        this.hpBar.progress = Math.max(0, Math.min(1, percent));
    }

    private _updateHpBar(): void {
        // 已由 update 持续刷新
    }

    private _updateExpBar(currentExp?: number, expToNext?: number): void {
        const player = Player.instance;
        if (!player || !this.expBar) return;

        const percent = player.exp / player.expToNext;
        this.expBar.progress = Math.max(0, Math.min(1, percent));
    }

    private _onLevelUp(level: number): void {
        if (this.levelLabel) {
            this.levelLabel.string = `Lv.${level}`;
        }
    }

    private _updateTimer(): void {
        if (!this.timerLabel || !GameManager.instance) return;

        const elapsed = GameManager.instance.gameData.elapsedTime;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        this.timerLabel.string = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    private _onEnemyKilled(): void {
        if (!this.killCountLabel || !GameManager.instance) return;
        this.killCountLabel.string = `${GameManager.instance.gameData.killCount}`;
    }

    private _totalGold: number = 0;
    private _onGoldGained(amount: number): void {
        this._totalGold += amount;
        if (this.goldLabel) {
            this.goldLabel.string = `${this._totalGold}`;
        }
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
