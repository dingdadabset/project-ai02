/**
 * HealthBar - 通用血条组件
 * 可挂载在敌人/Boss头顶，显示血量
 */

import { _decorator, Component, Node, Sprite, Color, UITransform, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('HealthBar')
export class HealthBar extends Component {
    @property(Sprite)
    public fillSprite: Sprite | null = null; // 填充条

    @property(Sprite)
    public bgSprite: Sprite | null = null; // 背景条

    @property(Sprite)
    public delayFillSprite: Sprite | null = null; // 延迟伤害条（白色渐变）

    @property
    public width: number = 60; // 血条宽度

    @property
    public height: number = 8; // 血条高度

    @property
    public offsetY: number = 30; // Y轴偏移（头顶）

    @property
    public showDelay: boolean = true; // 是否显示延迟伤害

    @property
    public delaySpeed: number = 2.0; // 延迟条追赶速度

    private _maxHp: number = 100;
    private _currentHp: number = 100;
    private _displayPercent: number = 1.0;
    private _delayPercent: number = 1.0;
    private _isVisible: boolean = true;

    // 颜色阈值
    private _fullColor: Color = new Color(76, 175, 80, 255);    // 绿色
    private _midColor: Color = new Color(255, 193, 7, 255);     // 黄色
    private _lowColor: Color = new Color(244, 67, 54, 255);     // 红色

    /**
     * 初始化血条
     */
    public init(maxHp: number): void {
        this._maxHp = maxHp;
        this._currentHp = maxHp;
        this._displayPercent = 1.0;
        this._delayPercent = 1.0;
        this._updateDisplay();
    }

    /**
     * 设置当前血量
     */
    public setHp(currentHp: number, maxHp?: number): void {
        if (maxHp !== undefined) {
            this._maxHp = maxHp;
        }
        this._currentHp = Math.max(0, Math.min(this._maxHp, currentHp));
        this._displayPercent = this._currentHp / this._maxHp;
        this._updateDisplay();
    }

    /**
     * 受到伤害时调用
     */
    public takeDamage(damage: number): void {
        this._currentHp = Math.max(0, this._currentHp - damage);
        this._displayPercent = this._currentHp / this._maxHp;
        this._updateDisplay();
    }

    update(dt: number): void {
        // 延迟条平滑追赶
        if (this.showDelay && this._delayPercent > this._displayPercent) {
            this._delayPercent -= this.delaySpeed * dt;
            if (this._delayPercent < this._displayPercent) {
                this._delayPercent = this._displayPercent;
            }
            this._updateDelayBar();
        }
    }

    private _updateDisplay(): void {
        if (this.fillSprite) {
            // 调整填充宽度
            const transform = this.fillSprite.node.getComponent(UITransform);
            if (transform) {
                transform.width = this.width * this._displayPercent;
            }

            // 根据百分比变色
            this.fillSprite.color = this._getColorByPercent(this._displayPercent);
        }

        // 低血量时显示
        if (this._displayPercent >= 1.0 && this._isVisible) {
            // 满血可以隐藏（小怪）
        }
    }

    private _updateDelayBar(): void {
        if (this.delayFillSprite) {
            const transform = this.delayFillSprite.node.getComponent(UITransform);
            if (transform) {
                transform.width = this.width * this._delayPercent;
            }
        }
    }

    private _getColorByPercent(percent: number): Color {
        if (percent > 0.6) return this._fullColor;
        if (percent > 0.3) return this._midColor;
        return this._lowColor;
    }

    /**
     * 显示/隐藏
     */
    public setVisible(visible: boolean): void {
        this._isVisible = visible;
        this.node.active = visible;
    }
}
