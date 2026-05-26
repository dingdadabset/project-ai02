/**
 * AudioManager - 音效与 BGM 管理
 * 台账编号: M08-T05
 */

import { _decorator, Component, AudioClip, AudioSource, resources, Node, director, tween } from 'cc';
import { SaveManager } from './SaveManager';
import { EventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager | null = null;

    @property(AudioSource)
    public bgmSource: AudioSource | null = null;

    @property(AudioSource)
    public sfxSource: AudioSource | null = null;

    private _bgmCache: Map<string, AudioClip> = new Map();
    private _sfxCache: Map<string, AudioClip> = new Map();
    private _currentBgm: string = '';

    public static get instance(): AudioManager {
        return AudioManager._instance!;
    }

    onLoad(): void {
        if (AudioManager._instance && AudioManager._instance !== this) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        director.addPersistRootNode(this.node);

        // 自动创建 AudioSource（如果未配置）
        if (!this.bgmSource) {
            this.bgmSource = this.node.addComponent(AudioSource);
            this.bgmSource.loop = true;
        }
        if (!this.sfxSource) {
            const sfxNode = new Node('SFX');
            this.node.addChild(sfxNode);
            this.sfxSource = sfxNode.addComponent(AudioSource);
        }

        // 应用存档音量
        this._applyVolume();

        // 监听音量变化事件
        EventBus.instance.on('audio_bgm_volume', (v: number) => {
            if (this.bgmSource) this.bgmSource.volume = v;
        });
        EventBus.instance.on('audio_sfx_volume', (v: number) => {
            if (this.sfxSource) this.sfxSource.volume = v;
        });

        // 后台暂停时静音
        director.on(director.EVENT_BEFORE_SCENE_LAUNCH, this._stopOnSceneChange, this);
    }

    private _applyVolume(): void {
        const settings = SaveManager.instance.data.settings;
        if (this.bgmSource) this.bgmSource.volume = settings.bgmVolume;
        if (this.sfxSource) this.sfxSource.volume = settings.sfxVolume;
    }

    /**
     * 播放 BGM（自动循环 + 平滑过渡）
     */
    public playBGM(name: string): void {
        if (this._currentBgm === name && this.bgmSource?.playing) return;

        this._currentBgm = name;
        this._loadAudio(`audio/bgm/${name}`, this._bgmCache, (clip) => {
            if (!this.bgmSource) return;

            // 淡出旧 BGM 后切换
            if (this.bgmSource.playing) {
                const fromVol = this.bgmSource.volume;
                tween(this.bgmSource)
                    .to(0.3, { volume: 0 })
                    .call(() => {
                        if (this.bgmSource) {
                            this.bgmSource.stop();
                            this.bgmSource.clip = clip;
                            this.bgmSource.loop = true;
                            this.bgmSource.play();
                            tween(this.bgmSource).to(0.3, { volume: fromVol }).start();
                        }
                    })
                    .start();
            } else {
                this.bgmSource.clip = clip;
                this.bgmSource.loop = true;
                this.bgmSource.play();
            }
        });
    }

    /**
     * 播放音效
     */
    public playSFX(name: string): void {
        this._loadAudio(`audio/sfx/${name}`, this._sfxCache, (clip) => {
            if (this.sfxSource && clip) {
                this.sfxSource.playOneShot(clip, this.sfxSource.volume);
            }
        });
    }

    /**
     * 停止 BGM
     */
    public stopBGM(): void {
        if (this.bgmSource?.playing) {
            this.bgmSource.stop();
        }
        this._currentBgm = '';
    }

    /**
     * 设置音量
     */
    public setVolume(type: 'bgm' | 'sfx', value: number): void {
        const v = Math.max(0, Math.min(1, value));
        if (type === 'bgm' && this.bgmSource) {
            this.bgmSource.volume = v;
            SaveManager.instance.data.settings.bgmVolume = v;
        } else if (type === 'sfx' && this.sfxSource) {
            this.sfxSource.volume = v;
            SaveManager.instance.data.settings.sfxVolume = v;
        }
        SaveManager.instance.markDirty();
    }

    /**
     * 静音/取消静音
     */
    public muteAll(mute: boolean): void {
        if (this.bgmSource) this.bgmSource.volume = mute ? 0 : SaveManager.instance.data.settings.bgmVolume;
        if (this.sfxSource) this.sfxSource.volume = mute ? 0 : SaveManager.instance.data.settings.sfxVolume;
    }

    /**
     * 加载音频文件并缓存
     */
    private _loadAudio(path: string, cache: Map<string, AudioClip>, callback: (clip: AudioClip) => void): void {
        const cached = cache.get(path);
        if (cached) {
            callback(cached);
            return;
        }

        resources.load(path, AudioClip, (err, clip) => {
            if (err) {
                console.warn(`[AudioManager] Failed to load: ${path}`, err);
                return;
            }
            cache.set(path, clip);
            callback(clip);
        });
    }

    private _stopOnSceneChange(): void {
        // 切换场景时清理SFX，但保留BGM缓存
    }

    /**
     * 预加载常用音效（战斗场景前调用）
     */
    public async preloadBattleSounds(): Promise<void> {
        const sfxList = ['hit', 'crit', 'levelup', 'pickup', 'enemy_die', 'boss_roar', 'player_hurt'];
        for (const name of sfxList) {
            await this._preloadOne(`audio/sfx/${name}`, this._sfxCache);
        }
    }

    private _preloadOne(path: string, cache: Map<string, AudioClip>): Promise<void> {
        return new Promise((resolve) => {
            resources.load(path, AudioClip, (err, clip) => {
                if (!err && clip) cache.set(path, clip);
                resolve();
            });
        });
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }
}
