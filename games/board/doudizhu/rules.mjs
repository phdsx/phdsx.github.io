export const RANK_LABELS = Object.freeze({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王' });
export const TYPE_LABELS = Object.freeze({
  single: '单张', pair: '对子', triple: '三张', tripleSingle: '三带一', triplePair: '三带一对',
  straight: '顺子', pairStraight: '连对', tripleStraight: '飞机', airplaneSingle: '飞机带单',
  airplanePair: '飞机带对', fourTwoSingles: '四带二', fourTwoPairs: '四带两对', bomb: '炸弹', rocket: '王炸'
});

export function createDeck() {
  const deck = [];
  for (let rank = 3; rank <= 15; rank++) {
    for (const suit of ['♠', '♥', '♣', '♦']) deck.push({ id: `${rank}-${suit}`, rank, suit });
  }
  deck.push({ id: 'joker-small', rank: 16, suit: '' }, { id: 'joker-big', rank: 17, suit: '' });
  return deck;
}

export function shuffle(deck, random = Math.random) {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sortCards(cards) {
  return [...cards].sort((a, b) => b.rank - a.rank || ['♠', '♥', '♣', '♦', ''].indexOf(a.suit) - ['♠', '♥', '♣', '♦', ''].indexOf(b.suit));
}

function groups(cards) {
  const map = new Map();
  for (const card of cards) map.set(card.rank, (map.get(card.rank) || 0) + 1);
  return [...map].sort((a, b) => a[0] - b[0]);
}

function consecutive(ranks) {
  return ranks.every((rank, index) => rank <= 14 && (index === 0 || rank === ranks[index - 1] + 1));
}

function sequenceCore(entries, width, length) {
  const eligible = entries.filter(([rank, count]) => rank <= 14 && count >= width).map(([rank]) => rank);
  const choices = [];
  for (let i = 0; i <= eligible.length - length; i++) {
    const candidate = eligible.slice(i, i + length);
    if (consecutive(candidate)) choices.push(candidate);
  }
  return choices;
}

export function classify(cards) {
  const n = cards.length;
  if (!n || new Set(cards.map(card => card.id)).size !== n) return null;
  const entries = groups(cards);
  const ranks = entries.map(([rank]) => rank);
  const counts = entries.map(([, count]) => count);
  const result = (type, main, length = n) => ({ type, main, length, count: n, label: TYPE_LABELS[type] });

  if (n === 1) return result('single', ranks[0]);
  if (n === 2) {
    if (ranks[0] === 16 && ranks[1] === 17) return result('rocket', 17);
    if (counts[0] === 2) return result('pair', ranks[0]);
    return null;
  }
  if (n === 3 && counts[0] === 3) return result('triple', ranks[0]);
  if (n === 4) {
    if (counts[0] === 4) return result('bomb', ranks[0]);
    if (counts.includes(3)) return result('tripleSingle', entries.find(([, count]) => count === 3)[0]);
  }
  if (n === 5 && counts.includes(3) && counts.includes(2)) return result('triplePair', entries.find(([, count]) => count === 3)[0]);
  if (n >= 5 && entries.length === n && consecutive(ranks)) return result('straight', ranks.at(-1), n);
  if (n >= 6 && n % 2 === 0 && counts.every(count => count === 2) && consecutive(ranks)) return result('pairStraight', ranks.at(-1), n / 2);
  if (n >= 6 && n % 3 === 0 && counts.every(count => count === 3) && consecutive(ranks)) return result('tripleStraight', ranks.at(-1), n / 3);

  if (n >= 8 && n % 5 === 0) {
    const length = n / 5;
    for (const core of sequenceCore(entries, 3, length).reverse()) {
      const rest = entries.filter(([rank]) => !core.includes(rank));
      if (rest.length === length && rest.every(([, count]) => count === 2)) return result('airplanePair', core.at(-1), length);
    }
  }
  if (n >= 8 && n % 4 === 0) {
    const length = n / 4;
    for (const core of sequenceCore(entries, 3, length).reverse()) {
      const rest = entries.filter(([rank]) => !core.includes(rank));
      if (rest.reduce((sum, [, count]) => sum + count, 0) === length) return result('airplaneSingle', core.at(-1), length);
    }
  }
  if (n === 6 && counts.includes(4)) return result('fourTwoSingles', entries.find(([, count]) => count === 4)[0]);
  if (n === 8 && counts.includes(4)) {
    const rest = entries.filter(([, count]) => count !== 4);
    if (rest.length === 2 && rest.every(([, count]) => count === 2)) return result('fourTwoPairs', entries.find(([, count]) => count === 4)[0]);
  }
  return null;
}

export function canBeat(play, target) {
  if (!play) return false;
  if (!target) return true;
  if (play.type === 'rocket') return target.type !== 'rocket';
  if (target.type === 'rocket') return false;
  if (play.type === 'bomb' && target.type !== 'bomb') return true;
  return play.type === target.type && play.length === target.length && play.main > target.main;
}

// Generate useful legal options for hints and the local opponents. Human-selected cards are
// validated independently by classify(), so this list does not limit the rules of play.
export function legalPlays(hand, target = null) {
  const byRank = new Map();
  for (const card of sortCards(hand)) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card);
  }
  const ranks = [...byRank.keys()].sort((a, b) => a - b);
  const candidates = new Map();
  const add = (cards) => {
    const kind = classify(cards);
    if (kind && canBeat(kind, target)) candidates.set(cards.map(card => card.id).sort().join('|'), { cards, kind });
  };
  const take = (rank, count) => byRank.get(rank).slice(0, count);
  const without = (excluded) => ranks.filter(rank => !excluded.includes(rank));
  const addSequences = (width, minimum, makeWings) => {
    for (let start = 3; start <= 14; start++) {
      for (let end = start + minimum - 1; end <= 14; end++) {
        const coreRanks = Array.from({ length: end - start + 1 }, (_, index) => start + index);
        if (!coreRanks.every(rank => byRank.get(rank)?.length >= width)) break;
        const core = coreRanks.flatMap(rank => take(rank, width));
        add(core);
        if (makeWings && width === 3) {
          const outsiders = without(coreRanks);
          const singles = outsiders.flatMap(rank => byRank.get(rank));
          if (singles.length >= coreRanks.length) {
            add([...core, ...singles.slice(0, coreRanks.length)]);
            add([...core, ...singles.slice(-coreRanks.length)]);
          }
          const pairs = outsiders.filter(rank => byRank.get(rank).length >= 2);
          if (pairs.length >= coreRanks.length) {
            add([...core, ...pairs.slice(0, coreRanks.length).flatMap(rank => take(rank, 2))]);
            add([...core, ...pairs.slice(-coreRanks.length).flatMap(rank => take(rank, 2))]);
          }
        }
      }
    }
  };

  for (const rank of ranks) {
    add(take(rank, 1));
    if (byRank.get(rank).length >= 2) add(take(rank, 2));
    if (byRank.get(rank).length >= 3) {
      const core = take(rank, 3);
      add(core);
      for (const other of without([rank])) {
        add([...core, ...take(other, 1)]);
        if (byRank.get(other).length >= 2) add([...core, ...take(other, 2)]);
      }
    }
    if (byRank.get(rank).length === 4) {
      const core = take(rank, 4);
      add(core);
      const outsiders = without([rank]);
      for (let i = 0; i < outsiders.length; i++) {
        const first = outsiders[i];
        if (byRank.get(first).length >= 2) add([...core, ...take(first, 2)]);
        for (let j = i + 1; j < outsiders.length; j++) {
          const second = outsiders[j];
          add([...core, ...take(first, 1), ...take(second, 1)]);
          if (byRank.get(first).length >= 2 && byRank.get(second).length >= 2) add([...core, ...take(first, 2), ...take(second, 2)]);
        }
      }
    }
  }
  if (byRank.has(16) && byRank.has(17)) add([take(16, 1)[0], take(17, 1)[0]]);
  addSequences(1, 5, false);
  addSequences(2, 3, false);
  addSequences(3, 2, true);
  return [...candidates.values()];
}

export function chooseAiPlay(hand, target, context = {}) {
  if (target && context.teammateLeading) return null;
  const options = legalPlays(hand, target);
  if (!options.length) return null;
  if (target && !context.opponentInDanger && hand.length > 4 && options.every(option => ['bomb', 'rocket'].includes(option.kind.type))) return null;
  const score = ({ cards, kind }) => {
    if (cards.length === hand.length) return -1000;
    let value = kind.type === 'rocket' ? 90 : kind.type === 'bomb' ? 55 : 0;
    value += kind.main * 0.55;
    value -= cards.length * (target ? 1.1 : 2.5);
    if (kind.type === 'single' && kind.main >= 15) value += 7;
    if (kind.type === 'pair' && kind.main >= 15) value += 4;
    if (context.opponentInDanger && target) value -= kind.type === 'bomb' || kind.type === 'rocket' ? 30 : 0;
    return value;
  };
  options.sort((a, b) => score(a) - score(b) || a.kind.main - b.kind.main);
  return options[0];
}
