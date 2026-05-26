/**
 * DamageNumber - 伤害飘字
 * 显示伤害数字并飘动消失
 */

import { _decorator, Component, Label, Vec3, tween, UIOpacity, Color } from 'cc';
import { ObjectPool } from '../core/ObjectPool';

const { ccclass, property } = _decorator;

@ccclass('DamageNumber')
export class DamageNumber extends Component {
    @property(Label)
    public label: Label | null = null;

    @property
    public floatHeight: number = 60; // 上飘高度

    @property
    public duration: number = 0.8; // 显示时长

    @property
    public fontSize: number = 28; // 基础字号

    @property
    public critFontSize: number = 40; // 暴击字号

    private _poolName: string = 'damage_number';

    /**
     * 显示伤害数字
     */
    public show(damage: number, isCrit: boolean = false, worldPos?: Vec3): void {
        if (!this.label) return;

        // 设置文字
        this.label.string = isCrit ? `${damage}!` : `${damage}`;
        this.label.fontSize = isCrit ? this.critFontSize : this.fontSize;

        // 设置颜色
        if (isCrit) {
            this.label.color = new Color(255, 60, 60, 255); // 暴击红色
        } else {
            this.label.color = new Color(255, 255, 255, 255); // 白色
        }

        // 设置位置
        if (worldPos) {
            // 加一点随机偏移避免重叠
            const offsetX = (Math.random() - 0.5) * 30;
            this.node.setWorldPosition(worldPos.x + offsetX, worldPos.y + 20, 0);
        }

        // 确保可见
        this.node.active = true;
        const opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        opacity.opacity = 255;

        // 飘动动画
        const startPos = this.node.position.clone();
        const endPos = new Vec3(startPos.x, startPos.y + this.floatHeight, 0);

        tween(this.node)
            .to(this.duration, { position: endPos })
            .start();

        tween(opacity)
            .delay(this.duration * 0.5)
            .to(this.duration * 0.5, { opacity: 0 })
            .call(() => {
                this._recycle();
            })
            .start();
    }

    /**
     * 显示治疗数字
     */
    public showHeal(amount: number, worldPos?: Vec3): void {
        if (!this.label) return;

        this.label.string = `+${amount}`;
        this.label.fontSize = this.fontSize;
        this.label.color = new Color(100, 255, 100, 255); // 绿色

        if (worldPos) {
            this.node.setWorldPosition(worldPos.x, worldPos.y + 20, 0);
        }

        this.node.active = true;
        const opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        opacity.opacity = 255;

        const startPos = this.node.position.clone();
        const endPos = new Vec3(startPos.x, startPos.y + this.floatHeight * 0.7, 0);

        tween(this.node)
            .to(this.duration, { position: endPos })
            .start();

        tween(opacity)
            .delay(this.duration * 0.5)
            .to(this.duration * 0.5, { opacity: 0 })
            .call(() => {
                this._recycle();
            })
            .start();
    }

    private _recycle(): void {
        ObjectPool.instance.put(this._poolName, this.node);
    }
}
