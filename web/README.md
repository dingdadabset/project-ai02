# 草原风暴 - Web 版本（零依赖 Canvas 2D）

割草游戏的浏览器版本，使用纯 TypeScript + Canvas 2D API 实现，**无任何 npm 依赖**。

## 特点

- 完整玩法：移动、自动攻击、升级、3选1技能、刷怪、Boss战、结算
- 4 种武器：旋转刀刃、火球术、闪电链、冰霜新星
- 7 种敌人：含远程、精英、Boss 多阶段 AI
- 触屏 + 键盘双控（手机和桌面通用）
- 程序化绘制（不依赖任何美术资源即可运行）

## 运行

只需要 Python 3 或任意静态 HTTP 服务器：

```bash
# 1. 编译 TypeScript（首次运行或代码改动后）
npx tsc

# 2. 启动 HTTP 服务器
python3 -m http.server 9000

# 3. 浏览器打开
# http://localhost:9000
```

也可以用 Node 自带的 http-server：

```bash
npx -y http-server -p 9000
```

## 开发

```bash
# 监听编译（代码改动自动重编）
npx tsc --watch
```

## 操作

- **桌面**：WASD / 方向键 移动
- **手机**：触屏拖动模拟摇杆
- **升级**：点击 3 选 1 技能卡片

## 测试

```bash
# 静态资源可达性测试
python3 test_smoke.py

# 游戏逻辑测试（mock DOM 跑 5s 模拟）
node test_game_logic.mjs
```

## 项目结构

```
src/
├── engine/          # 自研引擎（Game, Scene, Renderer, Input, Vec2）
├── core/            # 核心服务（EventBus, ConfigManager, SaveManager）
├── entities/        # 实体（Player, Enemy, Projectile）
├── systems/         # 系统（Combat, Spawn, Skill, Drop）
├── weapons/         # 武器实现
├── scenes/          # 场景（Boot, Menu, Game, SkillSelect, Result）
├── utils/           # 工具（Constants, MathUtils）
├── configs/         # JSON 配置表
└── main.ts          # 入口
```

## 后续素材接入

当前使用程序化绘制（彩色圆形+矩形）。要接入美术：

1. 把 PNG 放在 `public/assets/` 下
2. 在 `Renderer.ts` 添加 `drawSprite(image, x, y, ...)` 方法
3. 在各 `render()` 方法中替换对应的 `drawCircle` 为 `drawSprite`

音频接入类似：用 `new Audio(url).play()`，参考已有的 `core/AudioManager.ts` 模式。
