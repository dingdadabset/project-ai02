/**
 * EnemyAnimator - 敌人动画状态机
 * 台账编号: M03-T05
 * 
 * 提供动画状态切换、受击闪白、死亡粒子的统一抽象
 * 后期接入 Spine/DragonBones 时只需扩展 _playAnimation 方法
 */

import { _decorator, Component, Sprite, Color, Animation, tween, Vec3, ParticleSystem2D } from 'cc';
import { Enemy, EnemyState } from './Enemy';

const { ccclass, property } = _decorator;

export enum AnimState {
    IDLE = 'idle',
    RUN = 'run',
    HURT = 'hurt',
    DIE = 'die',
    ATTACK = 'attack',
}

@ccclass('EnemyAnimator')
export class EnemyAnimator extends Component {
    @property(Sprite)
    public sprite: Sprite | null = null; // 主体精灵

    @property(Animation)
    public animation: Animation | null = null; // 帧动画组件（可选）

    @property(ParticleSystem2D)
    public deathParticle: ParticleSystem2D | null = null;

    @property
    public hurtFlashDuration: number = 0.1;

    @property
    public deathDuration: number = 0.4;

    private _enemy: Enemy | null = null;
    private _currentState: AnimState = AnimState.IDLE;
    private _originalColor: Color = new Color(255, 255, 255, 255);
    private _isFlashing: boolean = false;
    private _lastEnemyState: EnemyState = EnemyState.IDLE;

    onLoad(): void {
        this._enemy = this.getComponent(Enemy);
        if (this.sprite) {
            this._originalColor = this.sprite.color.clone();
        }
    }

    update(dt: number): void {
        if (!this._enemy) return;
        this._syncFromEnemyState();
    }

    /**
     * 根据 Enemy 当前状态自动切换动画
     */
    private _syncFromEnemyState(): void {
        const state = this._enemy!.state;
        if (state === this._lastEnemyState) return;

        this._lastEnemyState = state;

        switch (state) {
            case EnemyState.IDLE:
                this.play(AnimState.IDLE);
                break;
            case EnemyState.CHASING:
                this.play(AnimState.RUN);
                break;
            case EnemyState.ATTACKING:
                this.play(AnimState.ATTACK);
                break;
            case EnemyState.HURT:
                this._flashWhite();
                break;
            case EnemyState.DEAD:
                this.play(AnimState.DIE);
                this._playDeathEffect();
                break;
        }
    }

    /**
     * 播放指定状态动画
     */
    public play(state: AnimState): void {
        if (this._currentState === state) return;
        this._currentState = state;

        // 优先使用 Cocos Animation 组件
        if (this.animation) {
            const clip = this.animation.clips?.find(c => c?.name === state);
            if (clip) {
                this.animation.play(state);
                return;
            }
        }

        // 后备：可以在此实现 Spine/DragonBones 动画切换
        // if (this.spineSkeleton) this.spineSkeleton.setAnimation(0, state, true);
    }

    /**
     * 受击闪白效果
     */
    private _flashWhite(): void {
        if (!this.sprite || this._isFlashing) return;
        this._isFlashing = true;

        // 白色染色
        this.sprite.color = new Color(255, 255, 255, 255);
        this.sprite.color = new Color(255, 240, 240, 255);

        // 恢复原色
        const orig = this._originalColor;
        this.scheduleOnce(() => {
            if (this.sprite) {
                this.sprite.color = orig.clone();
            }
            this._isFlashing = false;
        }, this.hurtFlashDuration);
    }

    /**
     * 死亡特效
     */
    private _playDeathEffect(): void {
        // 播放粒子
        if (this.deathParticle) {
            this.deathParticle.resetSystem();
        }

        // 缩放消失动画
        if (this.sprite) {
            const node = this.sprite.node;
            tween(node)
                .to(this.deathDuration, { scale: new Vec3(0.1, 0.1, 1) })
                .start();
        }
    }

    /**
     * 重置动画状态（从对象池取出时调用）
     */
    public reset(): void {
        this._currentState = AnimState.IDLE;
        this._lastEnemyState = EnemyState.IDLE;
        this._isFlashing = false;
        if (this.sprite) {
            this.sprite.color = this._originalColor.clone();
            this.sprite.node.setScale(1, 1, 1);
        }
        this.play(AnimState.IDLE);
    }
}
