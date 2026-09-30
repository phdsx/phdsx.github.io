# 弧线任意球

直接打开 `index.html`，或使用任意静态服务器。所有资源在仓库内；生成的普通脚本支持 `file://` 打开。

## 操作

- 点击球面选择触球点；偏左触球向右弯，偏右触球向左弯，下沿增加仰角及回旋，上沿压低并增加前旋。
- 角度范围 ±18°，可用方向键微调；力度改变总出球速度。
- 空格射门；射门结束后空格进入下一球。每球更新侧风。
- 关闭“训练辅助”可隐藏轨迹与落点提示。参考轨迹包含人墙起跳和门框碰撞，不包含门将的反应与扑救。

## 模型与判定

物理量使用米、秒、弧度。足球半径 0.11 m、质量 0.43 kg；球门内宽 7.32 m、内高 2.44 m；距球门 23 m，人墙距球 9.15 m。重力为 9.81 m/s²，飞行由相对空气速度的平方阻力、随旋转变化的 Magnus 力共同积分。下落后可以弹跳或滚动，门框反弹后可以继续入网。

模拟以 240 Hz 更新；球与球员身体、手套、圆柱门框使用连续扫掠碰撞。球员可见身体与碰撞使用相同胶囊体数据；整球越过球门线后才计分，进球后仍继续运动至球网吸收动量。门将有反应延迟、移动速度限制，起扑后保持已选方向。

这是可玩的近似模拟。空气阻力与升力系数、草地摩擦、恢复系数及门将动作是游戏参数，没有针对某款真实足球做实验拟合；球网使用视觉形变与边界阻尼。

参考：[IFAB 足球规格](https://www.theifab.com/laws/latest/the-ball/)、[球场与球门](https://www.theifab.com/laws/latest/the-field-of-play/)、[进球规则](https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/)、[NASA 足球受力](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/forces-on-a-soccer-ball/)。

## 构建与验证

在仓库根目录运行：

```sh
node scripts/build-free-kick.mjs
node --test games/sports/free-kick/physics.test.mjs games/sports/free-kick/file-entry.test.mjs
```

修改 `game.mjs` 或 `physics.mjs` 后重新生成 `game.bundle.js`。构建将物理模块放在独立作用域内，避免与 Three.js 内部函数重名。
