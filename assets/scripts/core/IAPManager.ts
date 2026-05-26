/**
 * IAPManager - 内购支付管理
 * 台账编号: M08-T06（IAP部分）
 */

import { _decorator, Component } from 'cc';
import { SaveManager } from './SaveManager';
import { EventBus } from './EventBus';

const { ccclass, property } = _decorator;

export interface IAPProduct {
    id: string;
    name: string;
    description: string;
    price: number;        // 单位：分
    diamond: number;      // 获得钻石
    bonus?: number;       // 赠送钻石
    isFirst?: boolean;    // 首充翻倍标识
}

export type IAPCallback = (success: boolean, productId: string) => void;

@ccclass('IAPManager')
export class IAPManager extends Component {
    private static _instance: IAPManager | null = null;

    @property
    public mockMode: boolean = true; // 沙箱模式

    private _products: IAPProduct[] = [
        { id: 'iap_60', name: '60钻石', description: '基础礼包', price: 600, diamond: 60 },
        { id: 'iap_300', name: '300钻石', description: '热销礼包', price: 3000, diamond: 300, bonus: 30 },
        { id: 'iap_980', name: '980钻石', description: '超值礼包', price: 9800, diamond: 980, bonus: 200 },
        { id: 'iap_1980', name: '1980钻石', description: '土豪礼包', price: 19800, diamond: 1980, bonus: 600 },
        { id: 'iap_first', name: '首充礼包', description: '首充翻倍', price: 600, diamond: 60, bonus: 60, isFirst: true },
    ];

    public static get instance(): IAPManager {
        return IAPManager._instance!;
    }

    onLoad(): void {
        if (IAPManager._instance && IAPManager._instance !== this) {
            this.node.destroy();
            return;
        }
        IAPManager._instance = this;
        this._init();
    }

    private _init(): void {
        if (this.mockMode) {
            console.log('[IAPManager] Initialized in mock mode.');
            return;
        }
        // 真实平台SDK初始化
        // iOS: SKPaymentQueue.default()
        // Android: BillingClient
        // 微信: wx.requestMidasPayment
    }

    public getAllProducts(): IAPProduct[] {
        const save = SaveManager.instance.data as any;
        const purchasedFirst = !!save.purchasedFirstPack;
        return this._products.filter(p => !p.isFirst || !purchasedFirst);
    }

    public getProduct(id: string): IAPProduct | undefined {
        return this._products.find(p => p.id === id);
    }

    /**
     * 购买商品
     */
    public purchaseItem(productId: string, callback?: IAPCallback): void {
        const product = this.getProduct(productId);
        if (!product) {
            callback?.(false, productId);
            return;
        }

        if (this.mockMode) {
            // 沙箱模式：直接成功
            this.scheduleOnce(() => {
                this._onPurchaseSuccess(product);
                callback?.(true, productId);
            }, 1);
            return;
        }

        // 真实支付流程
        // const platform = this._detectPlatform();
        // platform.pay(product, ...)
        callback?.(false, productId);
    }

    /**
     * 购买成功后发放钻石
     */
    private _onPurchaseSuccess(product: IAPProduct): void {
        const totalDiamond = product.diamond + (product.bonus || 0);
        SaveManager.instance.addDiamond(totalDiamond);

        if (product.isFirst) {
            const save = SaveManager.instance.data as any;
            save.purchasedFirstPack = true;
        }

        SaveManager.instance.save();

        EventBus.instance.emit('iap_success', { product, totalDiamond });
        EventBus.instance.emit('toast', `购买成功！获得 ${totalDiamond} 钻石`);
    }

    /**
     * 恢复购买（iOS必备）
     */
    public restorePurchases(callback?: () => void): void {
        if (this.mockMode) {
            console.log('[IAPManager] Mock restore.');
            callback?.();
            return;
        }
        // 真实平台调用 restoreCompletedTransactions / queryPurchases
    }

    /**
     * 价格格式化（分→元）
     */
    public formatPrice(priceInCents: number): string {
        return `¥${(priceInCents / 100).toFixed(2)}`;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (IAPManager._instance === this) {
            IAPManager._instance = null;
        }
    }
}
