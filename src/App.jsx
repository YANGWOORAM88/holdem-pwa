import React, { useMemo, useState } from "react";

const suits = [
  { key: "s", label: "♠" },
  { key: "h", label: "♥" },
  { key: "d", label: "♦" },
  { key: "c", label: "♣" },
];

const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

const rankValue = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function buildDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit: suit.key, text: `${rank}${suit.label}` });
    }
  }
  return deck;
}

function cardKey(card) {
  return `${card.rank}${card.suit}`;
}

function isRed(card) {
  return card.suit === "h" || card.suit === "d";
}

function shuffle(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function compareScore(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function evaluateFive(cards) {
  const values = cards.map((card) => rankValue[card.rank]).sort((a, b) => b - a);
  const countMap = {};

  for (const value of values) {
    countMap[value] = (countMap[value] || 0) + 1;
  }

  const groups = Object.entries(countMap)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  const straightValues = uniqueValues.includes(14) ? [...uniqueValues, 1] : uniqueValues;

  let straightHigh = null;
  for (let i = 0; i <= straightValues.length - 5; i++) {
    const slice = straightValues.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) {
      straightHigh = slice[0];
      break;
    }
  }

  if (isFlush && straightHigh) return { score: [8, straightHigh], name: "스트레이트 플러시" };
  if (groups[0]?.count === 4) return { score: [7, groups[0].value, groups[1]?.value || 0], name: "포카드" };
  if (groups[0]?.count === 3 && groups[1]?.count === 2) return { score: [6, groups[0].value, groups[1].value], name: "풀하우스" };
  if (isFlush) return { score: [5, ...values], name: "플러시" };
  if (straightHigh) return { score: [4, straightHigh], name: "스트레이트" };
  if (groups[0]?.count === 3) return { score: [3, groups[0].value, ...groups.slice(1).map((g) => g.value)], name: "트리플" };
  if (groups[0]?.count === 2 && groups[1]?.count === 2) return { score: [2, groups[0].value, groups[1].value, groups[2]?.value || 0], name: "투페어" };
  if (groups[0]?.count === 2) return { score: [1, groups[0].value, ...groups.slice(1).map((g) => g.value)], name: "원페어" };

  return { score: [0, ...values], name: "하이카드" };
}

function getCombinations(cards, size) {
  const result = [];

  function backtrack(start, combo) {
    if (combo.length === size) {
      result.push(combo);
      return;
    }

    for (let i = start; i < cards.length; i++) {
      backtrack(i + 1, [...combo, cards[i]]);
    }
  }

  backtrack(0, []);
  return result;
}

function evaluateBest(cards) {
  if (cards.length < 5) return { score: [0], name: "프리플랍" };

  const hands = getCombinations(cards, 5);
  let best = null;

  for (const hand of hands) {
    const evaluated = evaluateFive(hand);
    if (!best || compareScore(evaluated.score, best.score) > 0) {
      best = evaluated;
    }
  }

  return best || { score: [0], name: "판정불가" };
}

function estimateWinRate(hero, board, players, trials = 800) {
  if (hero.length !== 2) {
    return { win: "0.0", tie: "0.0", lose: "0.0" };
  }

  const used = new Set([...hero, ...board].map(cardKey));
  const baseDeck = buildDeck().filter((card) => !used.has(cardKey(card)));

  let wins = 0;
  let ties = 0;
  let losses = 0;

  for (let trial = 0; trial < trials; trial++) {
    const deck = shuffle(baseDeck);
    let index = 0;
    const fullBoard = [...board];

    while (fullBoard.length < 5) {
      fullBoard.push(deck[index]);
      index += 1;
    }

    const heroEval = evaluateBest([...hero, ...fullBoard]);
    let hasLost = false;
    let hasTied = false;

    for (let p = 0; p < players - 1; p++) {
      const opponent = [deck[index], deck[index + 1]];
      index += 2;

      const opponentEval = evaluateBest([...opponent, ...fullBoard]);
      const comparison = compareScore(heroEval.score, opponentEval.score);

      if (comparison < 0) {
        hasLost = true;
        break;
      }

      if (comparison === 0) {
        hasTied = true;
      }
    }

    if (hasLost) losses += 1;
    else if (hasTied) ties += 1;
    else wins += 1;
  }

  return {
    win: ((wins / trials) * 100).toFixed(1),
    tie: ((ties / trials) * 100).toFixed(1),
    lose: ((losses / trials) * 100).toFixed(1),
  };
}

function CardGroup({ title, cards, placeholder, highlight = false }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${highlight ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
      <p className={`text-sm font-bold ${highlight ? "text-slate-300" : "text-slate-500"}`}>{title}</p>
      <div className="mt-3 flex min-h-8 flex-wrap gap-2">
        {cards.length === 0 ? (
          <span className={highlight ? "text-slate-300" : "text-slate-400"}>{placeholder}</span>
        ) : (
          cards.map((card) => (
            <span
              key={cardKey(card)}
              className={`rounded-lg px-3 py-1 font-bold ${highlight ? "bg-white text-slate-900" : "bg-slate-200 text-slate-800"}`}
            >
              {card.text}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, result }) {
  const odds = result?.odds;
  const handName = result?.hand?.name || "-";

  return (
    <tr className="border-t border-slate-200">
      <td className="px-4 py-4 font-black text-slate-900">{label}</td>
      <td className="px-4 py-4 text-right font-bold text-slate-900">{odds ? `${odds.win}%` : "-"}</td>
      <td className="px-4 py-4 text-right font-bold text-slate-900">{odds ? `${odds.tie}%` : "-"}</td>
      <td className="px-4 py-4 text-right font-bold text-slate-900">{odds ? `${odds.lose}%` : "-"}</td>
      <td className="px-4 py-4 text-right font-bold text-slate-600">{handName}</td>
    </tr>
  );
}

function ResultCard({ label, result }) {
  const odds = result?.odds;
  const handName = result?.hand?.name || "-";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-black text-slate-900">{label}</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{handName}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">승률</p>
          <p className="mt-1 text-xl font-black text-slate-900">{odds ? `${odds.win}%` : "-"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">무승부</p>
          <p className="mt-1 text-xl font-black text-slate-900">{odds ? `${odds.tie}%` : "-"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">패배</p>
          <p className="mt-1 text-xl font-black text-slate-900">{odds ? `${odds.lose}%` : "-"}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const deck = useMemo(() => buildDeck(), []);
  const [hero, setHero] = useState([]);
  const [flop, setFlop] = useState([]);
  const [turn, setTurn] = useState([]);
  const [river, setRiver] = useState([]);
  const [players, setPlayers] = useState(6);
  const [results, setResults] = useState(null);

  const heroKeys = useMemo(() => new Set(hero.map(cardKey)), [hero]);

  function toggleHeroCard(card) {
    const key = cardKey(card);

    setResults(null);
    setFlop([]);
    setTurn([]);
    setRiver([]);

    if (heroKeys.has(key)) {
      setHero((prev) => prev.filter((item) => cardKey(item) !== key));
      return;
    }

    if (hero.length < 2) {
      setHero((prev) => [...prev, card]);
    }
  }

  function generateRandomBoard() {
    const used = new Set(hero.map(cardKey));
    const availableDeck = shuffle(deck.filter((card) => !used.has(cardKey(card))));

    return {
      generatedFlop: availableDeck.slice(0, 3),
      generatedTurn: [availableDeck[3]],
      generatedRiver: [availableDeck[4]],
    };
  }

  function calculate() {
    if (hero.length !== 2) return;

    const { generatedFlop, generatedTurn, generatedRiver } = generateRandomBoard();

    setFlop(generatedFlop);
    setTurn(generatedTurn);
    setRiver(generatedRiver);

    const preflopBoard = [];
    const flopBoard = generatedFlop;
    const turnBoard = [...generatedFlop, ...generatedTurn];
    const riverBoard = [...generatedFlop, ...generatedTurn, ...generatedRiver];

    setResults({
      preflop: {
        odds: estimateWinRate(hero, preflopBoard, players),
        hand: evaluateBest([...hero, ...preflopBoard]),
      },
      flop: {
        odds: estimateWinRate(hero, flopBoard, players),
        hand: evaluateBest([...hero, ...flopBoard]),
      },
      turn: {
        odds: estimateWinRate(hero, turnBoard, players),
        hand: evaluateBest([...hero, ...turnBoard]),
      },
      river: {
        odds: estimateWinRate(hero, riverBoard, players),
        hand: evaluateBest([...hero, ...riverBoard]),
      },
    });
  }

  function reset() {
    setHero([]);
    setFlop([]);
    setTurn([]);
    setRiver([]);
    setResults(null);
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28 pt-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4 px-4 md:space-y-6 md:px-0">
        <header className="space-y-3 md:flex md:items-end md:justify-between md:space-y-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900 md:text-3xl">홀덤 확률 계산기</h1>
            <p className="mt-1 text-sm text-slate-600 md:text-base">내 카드 2장을 선택하면 플랍, 턴, 리버가 자동 생성됩니다.</p>
          </div>

          <div className="hidden gap-2 md:flex">
            <button
              onClick={calculate}
              disabled={hero.length !== 2}
              className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              계산하기
            </button>
            <button onClick={reset} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700">
              초기화
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
          <CardGroup title="내 카드" cards={hero} placeholder="2장 선택" highlight={true} />
          <CardGroup title="플랍" cards={flop} placeholder="자동" />
          <CardGroup title="턴" cards={turn} placeholder="자동" />
          <CardGroup title="리버" cards={river} placeholder="자동" />

          <div className="col-span-2 rounded-2xl bg-white p-4 shadow-sm md:col-span-1 md:p-5">
            <p className="text-sm font-bold text-slate-500">참여 인원</p>
            <select
              value={players}
              onChange={(event) => {
                setPlayers(Number(event.target.value));
                setResults(null);
              }}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => (
                <option key={number} value={number}>
                  {number}명
                </option>
              ))}
            </select>
          </div>
        </section>

        {results && (
          <section className="space-y-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm md:p-4">
              <p className="text-lg font-black text-slate-900">단계별 예상 확률</p>
              <p className="mt-1 text-sm text-slate-500">모바일에서는 카드형으로, PC에서는 표로 확인할 수 있습니다.</p>
            </div>

            <div className="grid gap-3 md:hidden">
              <ResultCard label="프리플랍" result={results.preflop} />
              <ResultCard label="플랍" result={results.flop} />
              <ResultCard label="턴" result={results.turn} />
              <ResultCard label="리버" result={results.river} />
            </div>

            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">단계</th>
                      <th className="px-4 py-3 text-right">예상 승률</th>
                      <th className="px-4 py-3 text-right">무승부</th>
                      <th className="px-4 py-3 text-right">패배 확률</th>
                      <th className="px-4 py-3 text-right">현재 족보</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ResultRow label="프리플랍" result={results.preflop} />
                    <ResultRow label="플랍" result={results.flop} />
                    <ResultRow label="턴" result={results.turn} />
                    <ResultRow label="리버" result={results.river} />
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-3 shadow-sm md:p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold text-slate-800">내 카드 선택</p>
            <p className="text-sm text-slate-500">2장 선택 후 계산하세요.</p>
          </div>

          <div className="space-y-3">
            {suits.map((suit) => {
              const suitCards = ranks.map((rank) =>
                deck.find((card) => card.rank === rank && card.suit === suit.key)
              );

              return (
                <div key={suit.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 md:p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-black ${
                        suit.key === "h" || suit.key === "d"
                          ? "bg-red-100 text-red-500"
                          : "bg-slate-900 text-white"
                      }`}
                    >
                      {suit.label}
                    </div>

                    <div>
                      <p className="text-base font-black text-slate-900">
                        {suit.key === "s"
                          ? "스페이드"
                          : suit.key === "h"
                          ? "하트"
                          : suit.key === "d"
                          ? "다이아"
                          : "클로버"}
                      </p>
                      <p className="text-xs text-slate-500">A ~ 2 카드 선택</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 md:grid-cols-7 md:gap-2">
                    {suitCards.map((card) => {
                      if (!card) return null;

                      const selected = heroKeys.has(cardKey(card));

                      return (
                        <button
                          key={cardKey(card)}
                          onClick={() => toggleHeroCard(card)}
                          disabled={!selected && hero.length >= 2}
                          className={`h-12 rounded-xl border text-base font-black transition disabled:cursor-not-allowed disabled:opacity-35 md:h-11 md:text-sm ${
                            selected
                              ? "scale-105 border-slate-900 bg-slate-900 text-white shadow-lg"
                              : "border-slate-200 bg-white hover:bg-slate-100"
                          } ${
                            !selected && (suit.key === "h" || suit.key === "d")
                              ? "text-red-500"
                              : "text-slate-900"
                          }`}
                        >
                          {card.rank}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-500">
            현재 버전은 몬테카를로 시뮬레이션 방식의 추정 승률입니다.
          </p>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <button
            onClick={calculate}
            disabled={hero.length !== 2}
            className="flex-1 rounded-xl bg-slate-900 px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            계산하기
          </button>
          <button onClick={reset} className="rounded-xl border border-slate-300 bg-white px-5 py-4 text-base font-black text-slate-700">
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
