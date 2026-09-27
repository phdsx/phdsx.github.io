export const TILE = 40;
export const COLS = 17;
export const ROWS = 13;
export const BOARD_X = 53;
export const BOARD_Y = 39;

// 联众官方规则已确认：初始一弹、火力半径两格、放下约两秒爆炸、加速每件 +25%。
// 以下其余数值均为「可调暂定值」，需原版录屏进一步校准。
export const TUNING = {
  movePxPerSec: 112,
  bombFuseMs: 2000,
  flameMs: 430,
  initialBombs: 1,
  initialPower: 2,
  speedPerItem: 0.25,
  itemDropChance: 0.34,
  roundMs: 180000,
  turnAssistPx: 9,
  footRadiusPx: 9,
  aiThinkMs: 160,
  aiStepMs: 350,
} as const;

// 截图逐格转写；# 外围，S 固定石墩，B 可破坏砖墙。
// 同版截图中的人物/爆炸遮挡了极少数格，此处按可见墙体的连续性补齐。
export const BRICKS: Readonly<Record<number, readonly number[]>> = {
  1: [6, 7, 8, 9],
  2: [7],
  3: [7],
  4: [7],
  5: [2, 4, 6, 7, 8, 9, 10, 12, 14],
  6: [1, 3, 5, 7, 9, 11, 13, 15],
  7: [2, 4, 6, 7, 8, 9, 10, 12, 14],
  8: [7, 9],
  10: [7, 9, 13],
  11: [6, 7, 8, 9, 10, 12],
};
