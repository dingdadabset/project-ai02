/**
 * PauseMenu - 暂停菜单
 * 台账编号: M07-T07
 */

import { _decorator, Component, Node, Button, Slider, Toggle, Label, Sprite, Color } from 'cc';
import { GameManager, GameState } from '../core/GameManager';
import { SaveManager } from '../core/SaveManager';
import { SceneLoader } from '../core/SceneLoader';
import { EventBus, GameEvent } from '../core/EventBus';

const { ccclass, property } = _decorator;

@ccclass('PauseMenu')
export class PauseMenu extends Component {
    @property(Node)
    public panel: Node | null = null;

    @property(Node)
    public dimMask: Node | null = null; // 半透明背景

    @property(Button)
    public pauseBtn: Button | null = null;     // HUD 上的暂停按钮

    @property(Button)
    public resumeBtn: Button | null = null;
    @property(Button)
    public exitBtn: Button | null = null;
    @property(Button)
    public exitConfirmBtn: Button | null = null; // 确认退出
    @property(Button)
    public exitCancelBtn: Button | null = null;

    @property(Node)
    public exitConfirmDialog: Node | null = null;

    // 设置控件
    @property(Slider)
    public bgmSlider: Slider | null = null;
    @property(Slider)
    public sfxSlider: Slider | null = null;
    @property(Toggle)
    public vibrationToggle: Toggle | null = null;

    @property(Label)
    public bgmValueLabel: Label | null = null;
    @property(Label)
    public sfxValueLabel: Label | null = null;

    private _isPaused: boolean = false;

    start(): void {
        this._bindEvents();
        this._loadSettings();
        this._hide();
    }

    private _bindEvents(): void {
        this.pauseBtn?.node.on(Node.EventType.TOUCH_END, this._onPause, this);
        this.resumeBtn?.node.on(Node.EventType.TOUCH_END, this._onResume, this);
        this.exitBtn?.node.on(Node.EventType.TOUCH_END, this._onExitClick, this);
        this.exitConfirmBtn?.node.on(Node.EventType.TOUCH_END, this._onExitConfirm, this);
        this.exitCancelBtn?.node.on(Node.EventType.TOUCH_END, this._onExitCancel, this);

        this.bgmSlider?.node.on('slide', this._onBgmChange, this);
        this.sfxSlider?.node.on('slide', this._onSfxChange, this);
        this.vibrationToggle?.node.on('toggle', this._onVibrationToggle, this);
    }

    private _loadSettings(): void {
        const settings = SaveManager.instance.data.settings;
        if (this.bgmSlider) this.bgmSlider.progress = settings.bgmVolume;
        if (this.sfxSlider) this.sfxSlider.progress = settings.sfxVolume;
        if (this.vibrationToggle) this.vibrationToggle.isChecked = settings.vibration;
        this._updateValueLabels();
    }

    private _onPause(): void {
        if (this._isPaused) return;
        this._isPaused = true;
        GameManager.instance?.pauseGame();
        this._show();
    }

    private _onResume(): void {
        this._isPaused = false;
        GameManager.instance?.resumeGame();
        this._hide();
    }

    private _show(): void {
        if (this.panel) this.panel.active = true;
        if (this.dimMask) this.dimMask.active = true;
        if (this.exitConfirmDialog) this.exitConfirmDialog.active = false;
    }

    private _hide(): void {
        if (this.panel) this.panel.active = false;
        if (this.dimMask) this.dimMask.active = false;
        if (this.exitConfirmDialog) this.exitConfirmDialog.active = false;
    }

    private _onExitClick(): void {
        if (this.exitConfirmDialog) this.exitConfirmDialog.active = true;
    }

    private _onExitCancel(): void {
        if (this.exitConfirmDialog) this.exitConfirmDialog.active = false;
    }

    private _onExitConfirm(): void {
        this._isPaused = false;
        SaveManager.instance.save();
        SceneLoader.instance?.returnHome();
    }

    // ---- 设置回调 ----

    private _onBgmChange(slider: Slider): void {
        const v = slider.progress;
        SaveManager.instance.data.settings.bgmVolume = v;
        SaveManager.instance.markDirty();
        EventBus.instance.emit('audio_bgm_volume', v);
        this._updateValueLabels();
    }

    private _onSfxChange(slider: Slider): void {
        const v = slider.progress;
        SaveManager.instance.data.settings.sfxVolume = v;
        SaveManager.instance.markDirty();
        EventBus.instance.emit('audio_sfx_volume', v);
        this._updateValueLabels();
    }

    private _onVibrationToggle(toggle: Toggle): void {
        SaveManager.instance.data.settings.vibration = toggle.isChecked;
        SaveManager.instance.markDirty();
    }

    private _updateValueLabels(): void {
        const settings = SaveManager.instance.data.settings;
        if (this.bgmValueLabel) {
            this.bgmValueLabel.string = `${Math.floor(settings.bgmVolume * 100)}%`;
        }
        if (this.sfxValueLabel) {
            this.sfxValueLabel.string = `${Math.floor(settings.sfxVolume * 100)}%`;
        }
    }
}
