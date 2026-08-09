import { createLevel } from './sand-sort-levels.mjs';
import { applyPour, isSolved, planPour, suggestMove } from './sand-sort-rules.mjs';

function cloneTubes(tubes) {
  return tubes.map((tube) => [...tube]);
}

export function createSession(levelIndex = 0, variation = 0) {
  const level = createLevel(levelIndex, variation);
  return {
    levelIndex,
    variation,
    level,
    tubes: cloneTubes(level.tubes),
    selected: null,
    pendingMove: null,
    history: [],
    extraTube: false,
    solved: false,
    message: '选择一个瓶子',
  };
}

export function selectTube(session, index) {
  if (!session.tubes[index] || session.pendingMove || session.solved) return session;

  if (session.selected === null) {
    if (!session.tubes[index].length) return { ...session, message: '这个瓶子是空的' };
    return { ...session, selected: index, message: '选择目标瓶子' };
  }

  if (session.selected === index) return { ...session, selected: null, message: '已取消选择' };

  const pendingMove = planPour(session.tubes, session.selected, index, session.level.capacity);
  return pendingMove
    ? { ...session, pendingMove, message: '正在倒沙' }
    : { ...session, selected: null, message: '只能倒入空瓶或同色沙层' };
}

export function commitPendingMove(session) {
  if (!session.pendingMove) return session;

  const previous = cloneTubes(session.tubes);
  const tubes = applyPour(session.tubes, session.pendingMove);
  const solved = isSolved(tubes, session.level.capacity);
  return {
    ...session,
    tubes,
    history: [...session.history, previous],
    selected: null,
    pendingMove: null,
    solved,
    message: solved ? '分类完成' : '继续整理沙子',
  };
}

export function undo(session) {
  if (!session.history.length) return { ...session, message: '还没有可以撤销的步骤' };

  const tubes = cloneTubes(session.history.at(-1));
  return {
    ...session,
    tubes,
    history: session.history.slice(0, -1),
    selected: null,
    pendingMove: null,
    solved: false,
    message: '已撤销一步',
  };
}

export function restart(session) {
  return createSession(session.levelIndex, session.variation);
}

export function reshuffle(session) {
  return createSession(session.levelIndex, session.variation + 1);
}

export function addExtraTube(session) {
  if (session.extraTube) return { ...session, message: '已经增加了一个空瓶' };

  return {
    ...session,
    tubes: [...cloneTubes(session.tubes), []],
    extraTube: true,
    message: '已免费增加空瓶',
  };
}

export function getHint(session) {
  return suggestMove(session.tubes, session.level.capacity);
}
