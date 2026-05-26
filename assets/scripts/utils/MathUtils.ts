/**
 * MathUtils - 数学工具类
 */

import { Vec2, Vec3 } from 'cc';

export class MathUtils {
    /**
     * 两点之间的距离
     */
    public static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 两点之间的距离平方（避免开方）
     */
    public static distanceSqr(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Vec3 两点距离
     */
    public static distanceVec3(a: Vec3, b: Vec3): number {
        return MathUtils.distance(a.x, a.y, b.x, b.y);
    }

    /**
     * 归一化方向向量
     */
    public static normalize(x: number, y: number): Vec2 {
        const len = Math.sqrt(x * x + y * y);
        if (len < 0.0001) return new Vec2(0, 0);
        return new Vec2(x / len, y / len);
    }

    /**
     * 方向向量（从 a 指向 b）
     */
    public static directionTo(from: Vec3, to: Vec3): Vec2 {
        return MathUtils.normalize(to.x - from.x, to.y - from.y);
    }

    /**
     * 随机范围 [min, max)
     */
    public static randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    /**
     * 随机整数 [min, max]
     */
    public static randomInt(min: number, max: number): number {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    /**
     * 随机圆上的点
     */
    public static randomOnCircle(centerX: number, centerY: number, radius: number): Vec2 {
        const angle = Math.random() * Math.PI * 2;
        return new Vec2(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
        );
    }

    /**
     * 随机圆内的点
     */
    public static randomInCircle(centerX: number, centerY: number, radius: number): Vec2 {
        const r = radius * Math.sqrt(Math.random());
        const angle = Math.random() * Math.PI * 2;
        return new Vec2(
            centerX + Math.cos(angle) * r,
            centerY + Math.sin(angle) * r
        );
    }

    /**
     * 角度转弧度
     */
    public static degToRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    /**
     * 弧度转角度
     */
    public static radToDeg(rad: number): number {
        return rad * (180 / Math.PI);
    }

    /**
     * 限制值在范围内
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 线性插值
     */
    public static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * MathUtils.clamp(t, 0, 1);
    }

    /**
     * 平滑阻尼（用于相机跟随等）
     */
    public static smoothDamp(current: number, target: number, velocity: { value: number }, smoothTime: number, dt: number): number {
        const omega = 2 / smoothTime;
        const x = omega * dt;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = current - target;
        const temp = (velocity.value + omega * change) * dt;
        velocity.value = (velocity.value - omega * temp) * exp;
        return target + (change + temp) * exp;
    }

    /**
     * 加权随机选择索引
     */
    public static weightedRandom(weights: number[]): number {
        const total = weights.reduce((sum, w) => sum + w, 0);
        let rand = Math.random() * total;

        for (let i = 0; i < weights.length; i++) {
            rand -= weights[i];
            if (rand <= 0) return i;
        }
        return weights.length - 1;
    }

    /**
     * 打乱数组（Fisher-Yates）
     */
    public static shuffle<T>(arr: T[]): T[] {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
