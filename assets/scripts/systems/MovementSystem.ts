/**
 * MovementSystem - 移动系统 / 虚拟摇杆控制器
 * 负责移动输入采集和传递给 Player
 */

import { _decorator, Component, Node, Vec2, Vec3, UITransform, EventTouch, input, Input } from 'cc';
import { Player } from '../entities/Player';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('MovementSystem')
export class MovementSystem extends Component {
    @property(Node)
    public joystickBg: Node | null = null; // 摇杆背景

    @property(Node)
    public joystickKnob: Node | null = null; // 摇杆手柄

    @property
    public maxRadius: number = 60; // 摇杆最大半径

    @property
    public deadZone: number = 10; // 死区

    private _direction: Vec2 = new Vec2(0, 0);
    private _isActive: boolean = false;
    private _startPos: Vec2 = new Vec2();
    private _knobOriginPos: Vec3 = new Vec3();

    public get direction(): Vec2 {
        return this._direction;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    onLoad(): void {
        if (this.joystickKnob) {
            this._knobOriginPos = this.joystickKnob.position.clone();
        }
    }

    onEnable(): void {
        // 全屏触摸监听
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDisable(): void {
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _onTouchStart(event: EventTouch): void {
        if (GameManager.instance && GameManager.instance.isPaused) return;

        const touch = event.getLocation();
        this._startPos.set(touch.x, touch.y);
        this._isActive = true;

        // 如果有摇杆 UI，可以移动摇杆背景到触摸位置
        if (this.joystickBg) {
            // 可选：动态定位摇杆
        }
    }

    private _onTouchMove(event: EventTouch): void {
        if (!this._isActive) return;
        if (GameManager.instance && GameManager.instance.isPaused) return;

        const touch = event.getLocation();
        const dx = touch.x - this._startPos.x;
        const dy = touch.y - this._startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.deadZone) {
            this._direction.set(0, 0);
            this._updateKnobPosition(0, 0);
            return;
        }

        // 归一化方向
        const nx = dx / dist;
        const ny = dy / dist;
        this._direction.set(nx, ny);

        // 限制摇杆位移
        const clampedDist = Math.min(dist, this.maxRadius);
        this._updateKnobPosition(nx * clampedDist, ny * clampedDist);
    }

    private _onTouchEnd(event: EventTouch): void {
        this._isActive = false;
        this._direction.set(0, 0);
        this._updateKnobPosition(0, 0);
    }

    private _updateKnobPosition(x: number, y: number): void {
        if (this.joystickKnob) {
            this.joystickKnob.setPosition(
                this._knobOriginPos.x + x,
                this._knobOriginPos.y + y,
                0
            );
        }
    }

    update(dt: number): void {
        // 将方向传递给玩家
        const player = Player.instance;
        if (player) {
            player.setMoveDirection(this._direction);
        }
    }
}
