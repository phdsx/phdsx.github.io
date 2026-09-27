import { RANK_LABELS, createDeck, shuffle, sortCards, classify, canBeat, legalPlays, chooseAiPlay } from './rules.mjs';

const $ = (id) => document.getElementById(id);
const names = ['你', '阿岚', '小舟'];
const ui = Object.fromEntries(['hand', 'bottom-cards', 'played-cards', 'trick-owner', 'trick-note', 'you-role', 'you-count', 'turn-pill', 'bid-actions', 'play-actions', 'phase-title', 'message', 'bid-score', 'multiplier', 'history', 'record', 'pass', 'play', 'hint'].map(id => [id, $(id)]));
let state;
let botTimer;
let generation = 0;
let selected = new Set();
let record = { wins: 0, losses: 0 };
try { record = { ...record, ...JSON.parse(localStorage.getItem('ddz-offline-record') || '{}') }; } catch { /* Private browsing can block storage. */ }

function cardElement(card, faceDown = false, interactive = false) {
  const element = document.createElement(interactive ? 'button' : 'span');
  element.className = `card${faceDown ? ' back-card' : ''}${['♥', '♦'].includes(card?.suit) ? ' red' : ''}${card?.rank >= 16 ? ` joker${card.rank === 17 ? ' big' : ''}` : ''}${selected.has(card?.id) && interactive ? ' selected' : ''}`;
  if (interactive) {
    element.type = 'button';
    element.setAttribute('aria-pressed', selected.has(card.id) ? 'true' : 'false');
    element.setAttribute('aria-label', `${RANK_LABELS[card.rank] || card.rank}${card.suit}`);
    element.addEventListener('click', () => {
      if (state.phase !== 'play' || state.turn !== 0) return;
      selected.has(card.id) ? selected.delete(card.id) : selected.add(card.id);
      renderHand();
      renderActions();
    });
  }
  if (!faceDown) {
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = RANK_LABELS[card.rank] || String(card.rank);
    const suit = document.createElement('span');
    suit.className = 'suit';
    suit.textContent = card.suit || '★';
    element.append(rank, suit);
  }
  return element;
}

function setMessage(message) { state.message = message; renderStatus(); }

function log(message) {
  state.history.unshift(message);
  state.history = state.history.slice(0, 12);
}

function reset() {
  clearTimeout(botTimer);
  generation++;
  selected.clear();
  const deck = shuffle(createDeck());
  state = {
    phase: 'bid', hands: [deck.slice(0, 17), deck.slice(17, 34), deck.slice(34, 51)], bottom: deck.slice(51),
    turn: Math.floor(Math.random() * 3), firstBidder: 0, bidCount: 0, highestBid: 0, highestBidder: -1,
    landlord: -1, current: null, lastPlayer: -1, passCount: 0, multiplier: 1, playedCount: [0, 0, 0],
    history: [], message: '依次叫分，出价最高者成为地主。', winner: -1
  };
  state.firstBidder = state.turn;
  render();
  scheduleBot();
}

function bid(player, amount) {
  if (state.phase !== 'bid' || player !== state.turn || (amount !== 0 && amount <= state.highestBid)) return;
  state.bidCount++;
  if (amount > state.highestBid) { state.highestBid = amount; state.highestBidder = player; }
  log(`${names[player]}${amount ? `叫 ${amount} 分` : '不叫'}`);
  if (amount === 3 || state.bidCount === 3) {
    if (state.highestBidder < 0) {
      reset();
      setMessage('三人都不叫，已重新发牌。');
      return;
    }
    state.landlord = state.highestBidder;
    state.hands[state.landlord].push(...state.bottom);
    state.phase = 'play';
    state.turn = state.landlord;
    log(`${names[state.landlord]}成为地主，获得 3 张底牌`);
    state.message = `${names[state.landlord]}成为地主，先出牌。`;
  } else {
    state.turn = (state.turn + 1) % 3;
    state.message = `当前最高 ${state.highestBid || '无'} 分，轮到${names[state.turn]}叫分。`;
  }
  render();
  scheduleBot();
}

function playCards(player, cards) {
  if (state.phase !== 'play' || state.turn !== player || !cards.length) return false;
  const hand = state.hands[player];
  const owned = new Set(hand.map(card => card.id));
  if (cards.some(card => !owned.has(card.id))) return false;
  const kind = classify(cards);
  const target = state.current?.kind || null;
  if (!kind) { setMessage('所选牌不构成有效牌型，请重新选择。'); return false; }
  if (!canBeat(kind, target)) { setMessage(`需要压过${state.current?.kind.label || '上家'}，或选择“不要”。`); return false; }
  const ids = new Set(cards.map(card => card.id));
  state.hands[player] = hand.filter(card => !ids.has(card.id));
  state.current = { cards: sortCards(cards), kind };
  state.lastPlayer = player;
  state.passCount = 0;
  state.playedCount[player]++;
  if (kind.type === 'bomb' || kind.type === 'rocket') state.multiplier *= 2;
  log(`${names[player]}出${kind.label} · ${cards.length} 张`);
  state.message = `${names[player]}出了${kind.label}。`;
  selected.clear();
  if (state.hands[player].length === 0) {
    finish(player);
  } else {
    state.turn = (player + 1) % 3;
  }
  render();
  scheduleBot();
  return true;
}

function pass(player) {
  if (state.phase !== 'play' || state.turn !== player || !state.current) return;
  log(`${names[player]}不要`);
  state.passCount++;
  state.turn = (player + 1) % 3;
  if (state.passCount === 2) {
    state.current = null;
    state.passCount = 0;
    state.message = `两人不要，${names[state.turn]}自由出牌。`;
  } else state.message = `${names[player]}不要，轮到${names[state.turn]}。`;
  selected.clear();
  render();
  scheduleBot();
}

function finish(winner) {
  state.phase = 'finished';
  state.winner = winner;
  const landlordWon = winner === state.landlord;
  const farmers = [0, 1, 2].filter(player => player !== state.landlord);
  const spring = landlordWon ? farmers.every(player => state.playedCount[player] === 0) : state.playedCount[state.landlord] === 1;
  if (spring) state.multiplier *= 2;
  const youWon = state.landlord === 0 ? winner === 0 : winner !== state.landlord;
  if (youWon) record.wins++; else record.losses++;
  try { localStorage.setItem('ddz-offline-record', JSON.stringify(record)); } catch { /* Storage is optional. */ }
  state.message = `${landlordWon ? '地主' : '农民'}获胜！${youWon ? '你赢了' : '你输了'} · ${state.highestBid * state.multiplier} 分${spring ? ' · 春天翻倍' : ''}。点击“重新发牌”再来一局。`;
  log(state.message);
}

function botBid(player) {
  const hand = state.hands[player];
  const counts = new Map();
  for (const card of hand) counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  const strength = hand.reduce((sum, card) => sum + (card.rank >= 15 ? (card.rank - 13) * 1.3 : card.rank >= 12 ? .5 : 0), 0)
    + [...counts.values()].filter(count => count === 4).length * 5;
  const desired = strength >= 15 ? 3 : strength >= 10 ? 2 : strength >= 6 ? 1 : 0;
  bid(player, desired > state.highestBid ? desired : 0);
}

function botPlay(player) {
  const teammateLeading = state.current && state.lastPlayer !== state.landlord && player !== state.landlord;
  const opponentInDanger = state.hands[state.landlord].length <= 3 || (player === state.landlord && [0, 1, 2].some(index => index !== player && state.hands[index].length <= 3));
  const teammateInDanger = teammateLeading && state.hands[state.lastPlayer].length <= 2;
  const choice = chooseAiPlay(state.hands[player], state.current?.kind || null, { teammateLeading, teammateInDanger, opponentInDanger });
  if (choice) playCards(player, choice.cards); else pass(player);
}

function scheduleBot() {
  clearTimeout(botTimer);
  if (state.phase === 'finished' || state.turn === 0) return;
  const currentGeneration = generation;
  botTimer = setTimeout(() => {
    if (currentGeneration !== generation) return;
    if (state.phase === 'bid') botBid(state.turn);
    else if (state.phase === 'play') botPlay(state.turn);
  }, 650);
}

function renderPlayers() {
  for (const player of [1, 2]) {
    const holder = $(`player-${player}`);
    holder.classList.toggle('active', state.turn === player && state.phase !== 'finished');
    holder.replaceChildren();
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = player === 1 ? '岚' : '舟';
    const details = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = names[player];
    const small = document.createElement('small'); small.textContent = `${state.hands[player].length} 张手牌`;
    const role = document.createElement('span'); role.className = 'role'; role.textContent = state.landlord < 0 ? '等待叫分' : player === state.landlord ? '地主' : '农民';
    details.append(strong, small, role); holder.append(avatar, details);
  }
  ui['you-role'].textContent = state.landlord < 0 ? '你的手牌' : state.landlord === 0 ? '你 · 地主' : '你 · 农民';
  ui['you-count'].textContent = `${state.hands[0].length} 张`;
  ui['turn-pill'].hidden = state.turn !== 0 || state.phase === 'finished';
  document.querySelector('.you-bar').classList.toggle('active', state.turn === 0 && state.phase !== 'finished');
}

function renderHand() {
  ui.hand.replaceChildren(...sortCards(state.hands[0]).map(card => cardElement(card, false, true)));
}

function renderTable() {
  ui['bottom-cards'].replaceChildren(...state.bottom.map(card => cardElement(card, state.landlord < 0)));
  ui['played-cards'].replaceChildren(...(state.current?.cards || []).map(card => cardElement(card)));
  ui['trick-owner'].textContent = state.current ? `${names[state.lastPlayer]} · ${state.current.kind.label}` : state.phase === 'bid' ? '等待叫地主' : state.phase === 'finished' ? '本局结束' : `${names[state.turn]}领出`;
  ui['trick-note'].textContent = state.current ? `需出同牌型更大的牌；炸弹和王炸可压普通牌` : state.phase === 'bid' ? '三人各得 17 张，剩余 3 张为地主底牌' : state.phase === 'finished' ? '点击右上角重新发牌' : '自由选择任意有效牌型';
}

function renderStatus() {
  ui['phase-title'].textContent = state.phase === 'bid' ? '叫地主' : state.phase === 'finished' ? '对局结束' : state.turn === 0 ? '轮到你出牌' : `等待${names[state.turn]}出牌`;
  ui.message.textContent = state.message;
  ui['bid-score'].textContent = state.highestBid || '—';
  ui.multiplier.textContent = `×${state.multiplier}`;
  ui.record.textContent = `本机战绩：${record.wins} 胜 · ${record.losses} 负`;
  ui.history.replaceChildren(...state.history.map(entry => { const item = document.createElement('li'); item.textContent = entry; return item; }));
}

function renderActions() {
  ui['bid-actions'].hidden = state.phase !== 'bid' || state.turn !== 0;
  ui['play-actions'].hidden = state.phase !== 'play' || state.turn !== 0;
  if (state.phase === 'bid') {
    document.querySelectorAll('[data-bid]').forEach(button => { button.disabled = Number(button.dataset.bid) !== 0 && Number(button.dataset.bid) <= state.highestBid; });
  }
  if (state.phase === 'play') {
    ui['pass'].disabled = !state.current;
    const cards = state.hands[0].filter(card => selected.has(card.id));
    ui.play.disabled = !canBeat(classify(cards), state.current?.kind || null);
    ui.hint.disabled = !legalPlays(state.hands[0], state.current?.kind || null).length;
  }
}

function render() { renderPlayers(); renderHand(); renderTable(); renderStatus(); renderActions(); }

document.querySelectorAll('[data-bid]').forEach(button => button.addEventListener('click', () => bid(0, Number(button.dataset.bid))));
ui.play.addEventListener('click', () => playCards(0, state.hands[0].filter(card => selected.has(card.id))));
ui['pass'].addEventListener('click', () => pass(0));
ui.hint.addEventListener('click', () => {
  const choice = chooseAiPlay(state.hands[0], state.current?.kind || null) || legalPlays(state.hands[0], state.current?.kind || null)[0];
  if (!choice) { setMessage('当前没有可压过的牌，可以选择“不要”。'); return; }
  selected = new Set(choice.cards.map(card => card.id));
  setMessage(`已选中${choice.kind.label}，点击“出牌”确认。`);
  renderHand(); renderActions();
});
$('new-game').addEventListener('click', reset);
reset();
