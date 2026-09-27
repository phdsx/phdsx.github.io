import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle, classify, canBeat, legalPlays, chooseAiPlay } from './rules.mjs';

const deck = createDeck();
function cards(spec) {
  const used = new Map();
  return spec.flatMap(([rank, count]) => {
    const found = deck.filter(card => card.rank === rank).slice(used.get(rank) || 0, (used.get(rank) || 0) + count);
    used.set(rank, (used.get(rank) || 0) + count);
    return found;
  });
}
function type(spec) { return classify(cards(spec))?.type; }

test('deck has exactly 54 unique cards and shuffle preserves them', () => {
  assert.equal(deck.length, 54);
  assert.equal(new Set(deck.map(card => card.id)).size, 54);
  assert.deepEqual(new Set(shuffle(deck).map(card => card.id)), new Set(deck.map(card => card.id)));
});

test('recognizes ordinary and special combinations', () => {
  assert.equal(type([[3, 1]]), 'single');
  assert.equal(type([[3, 2]]), 'pair');
  assert.equal(type([[3, 3]]), 'triple');
  assert.equal(type([[3, 3], [4, 1]]), 'tripleSingle');
  assert.equal(type([[3, 3], [4, 2]]), 'triplePair');
  assert.equal(type([[3, 1], [4, 1], [5, 1], [6, 1], [7, 1]]), 'straight');
  assert.equal(type([[3, 2], [4, 2], [5, 2]]), 'pairStraight');
  assert.equal(type([[3, 3], [4, 3]]), 'tripleStraight');
  assert.equal(type([[3, 3], [4, 3], [7, 1], [8, 1]]), 'airplaneSingle');
  assert.equal(type([[3, 3], [4, 3], [7, 2], [8, 2]]), 'airplanePair');
  assert.equal(type([[5, 4], [7, 1], [8, 1]]), 'fourTwoSingles');
  assert.equal(type([[5, 4], [7, 2], [8, 2]]), 'fourTwoPairs');
  assert.equal(type([[5, 4]]), 'bomb');
  assert.equal(type([[16, 1], [17, 1]]), 'rocket');
});

test('rejects invalid sequences and duplicate selections', () => {
  assert.equal(type([[10, 1], [11, 1], [12, 1], [13, 1], [15, 1]]), undefined);
  assert.equal(type([[3, 2], [4, 2], [15, 2]]), undefined);
  assert.equal(type([[3, 3], [4, 3], [7, 2], [8, 1], [9, 1]]), undefined);
  const single = cards([[3, 1]])[0];
  assert.equal(classify([single, single]), null);
});

test('compares same shapes, bombs and rocket', () => {
  assert.equal(canBeat(classify(cards([[4, 2]])), classify(cards([[3, 2]]))), true);
  assert.equal(canBeat(classify(cards([[4, 1]])), classify(cards([[3, 2]]))), false);
  assert.equal(canBeat(classify(cards([[5, 4]])), classify(cards([[14, 1]]))), true);
  assert.equal(canBeat(classify(cards([[16, 1], [17, 1]])), classify(cards([[15, 4]]))), true);
  assert.equal(canBeat(classify(cards([[5, 4]])), classify(cards([[16, 1], [17, 1]]))), false);
  assert.equal(canBeat(classify(cards([[6, 1], [7, 1], [8, 1], [9, 1], [10, 1]])), classify(cards([[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1]]))), false);
});

test('hints and bots only return legal cards from the hand', () => {
  const hand = cards([[3, 3], [4, 3], [7, 2], [8, 2], [10, 1], [11, 1], [16, 1], [17, 1]]);
  const target = classify(cards([[5, 1]]));
  const options = legalPlays(hand, target);
  assert.ok(options.length > 0);
  for (const option of options) {
    assert.ok(canBeat(classify(option.cards), target));
    assert.ok(option.cards.every(card => hand.includes(card)));
  }
  const choice = chooseAiPlay(hand, target);
  assert.ok(choice && canBeat(choice.kind, target));
  assert.equal(chooseAiPlay(hand, target, { teammateLeading: true }), null);
});

test('computer choices can complete random three-player deals', () => {
  for (let round = 0; round < 20; round++) {
    const dealt = shuffle(deck);
    const hands = [dealt.slice(0, 20), dealt.slice(20, 37), dealt.slice(37)];
    let turn = 0;
    let target = null;
    let leader = -1;
    let passes = 0;
    let finished = false;
    for (let step = 0; step < 500; step++) {
      const teammateLeading = target && turn !== 0 && leader !== 0;
      const opponentInDanger = turn === 0 ? Math.min(hands[1].length, hands[2].length) <= 3 : hands[0].length <= 3;
      const choice = chooseAiPlay(hands[turn], target, { teammateLeading, opponentInDanger });
      if (choice) {
        assert.ok(canBeat(classify(choice.cards), target));
        const before = hands[turn].length;
        const ids = new Set(choice.cards.map(card => card.id));
        hands[turn] = hands[turn].filter(card => !ids.has(card.id));
        assert.equal(hands[turn].length + choice.cards.length, before);
        if (!hands[turn].length) { finished = true; break; }
        target = choice.kind; leader = turn; passes = 0;
      } else {
        assert.ok(target, 'a player must lead a new trick');
        passes++;
        if (passes === 2) { target = null; passes = 0; }
      }
      turn = (turn + 1) % 3;
    }
    assert.ok(finished, `deal ${round + 1} should finish`);
  }
});
