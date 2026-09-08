import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, scenarios } from './content.js';

const tileCodes = [
  ...['m', 'p', 's'].flatMap(suit => Array.from({ length: 9 }, (_, i) => `${suit}${i + 1}`)),
  'E', 'S', 'W', 'N', 'R', 'G', 'B',
];
const honors = new Set(['E', 'S', 'W', 'N', 'R', 'G', 'B']);
const dragons = new Set(['R', 'G', 'B']);
const winds = new Set(['E', 'S', 'W', 'N']);
const lessonIds = ['chicken', 'all-pungs', 'half-flush', 'full-flush', 'dragons', 'winds'];

function countsOf(tiles) {
  const counts = new Map();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  return counts;
}

function validateTiles(tiles, expectedCount) {
  assert.equal(tiles.length, expectedCount);
  for (const [tile, count] of countsOf(tiles)) {
    assert.ok(tileCodes.includes(tile), `Invalid tile: ${tile}`);
    assert.ok(count <= 4, `More than four copies of ${tile}`);
  }
}

function isPung(meld) {
  return meld.length === 3 && meld.every(tile => tile === meld[0]);
}

function isSequence(meld) {
  if (meld.length !== 3 || meld.some(tile => honors.has(tile))) return false;
  const sorted = [...meld].sort();
  return sorted.every(tile => tile[0] === sorted[0][0])
    && Number(sorted[1][1]) === Number(sorted[0][1]) + 1
    && Number(sorted[2][1]) === Number(sorted[0][1]) + 2;
}

// Enumerate decompositions rather than assuming the authored array's grouping.
function decompositions(tiles, meldCount = 4) {
  if (tiles.length !== meldCount * 3 + 2) return [];
  const counts = tileCodes.map(tile => tiles.filter(value => value === tile).length);
  const results = [];
  function collectMelds(melds, pair) {
    const index = counts.findIndex(count => count > 0);
    if (index === -1) {
      if (melds.length === meldCount) results.push({ melds, pair });
      return;
    }
    if (counts[index] >= 3) {
      counts[index] -= 3;
      collectMelds([...melds, Array(3).fill(tileCodes[index])], pair);
      counts[index] += 3;
    }
    if (index < 27 && index % 9 <= 6 && counts[index + 1] && counts[index + 2]) {
      for (const next of [index, index + 1, index + 2]) counts[next]--;
      collectMelds([...melds, tileCodes.slice(index, index + 3)], pair);
      for (const next of [index, index + 1, index + 2]) counts[next]++;
    }
  }
  for (let index = 0; index < counts.length; index++) {
    if (counts[index] < 2) continue;
    counts[index] -= 2;
    collectMelds([], [tileCodes[index], tileCodes[index]]);
    counts[index] += 2;
  }
  return results;
}

function patternsFor(melds, pair, roundWind = 'E', seatWind = 'S') {
  const tiles = [...melds.flat(), ...pair];
  const suits = new Set(tiles.filter(tile => !honors.has(tile)).map(tile => tile[0]));
  const hasHonors = tiles.some(tile => honors.has(tile));
  const allPungs = melds.every(isPung);
  const halfFlush = suits.size === 1 && hasHonors;
  const fullFlush = suits.size === 1 && !hasHonors;
  const dragonFan = melds.filter(meld => isPung(meld) && dragons.has(meld[0])).length;
  const windFan = melds.reduce((sum, meld) => sum + (isPung(meld)
    ? Number(meld[0] === roundWind) + Number(meld[0] === seatWind) : 0), 0);
  return {
    'all-pungs': allPungs,
    'half-flush': halfFlush,
    'full-flush': fullFlush,
    dragons: dragonFan > 0,
    winds: windFan > 0,
    fan: Number(allPungs) * 3 + Number(halfFlush) * 3 + Number(fullFlush) * 7 + dragonFan + windFan,
  };
}

function completionsAfterDiscard(scenario, discard) {
  const remaining = [...scenario.hand];
  remaining.splice(remaining.indexOf(discard), 1);
  const owned = countsOf([...remaining, ...scenario.exposed.flat()]);
  const completions = [];
  for (const draw of tileCodes) {
    // The discarded copy is also unavailable for a subsequent draw.
    if ((owned.get(draw) ?? 0) + Number(draw === discard) >= 4) continue;
    for (const shape of decompositions([...remaining, draw], 4 - scenario.exposed.length)) {
      const patterns = patternsFor([...scenario.exposed, ...shape.melds], shape.pair, scenario.roundWind, scenario.seatWind);
      completions.push({ draw, patterns });
    }
  }
  return completions;
}

test('six uniquely identified lessons have complete legal fourteen-tile examples', () => {
  assert.equal(lessons.length, 6);
  assert.deepEqual(lessons.map(lesson => lesson.id).sort(), [...lessonIds].sort());
  for (const lesson of lessons) {
    for (const field of ['id', 'title', 'fan', 'summary', 'detail']) {
      assert.equal(typeof lesson[field], 'string');
      assert.ok(lesson[field].trim(), `${lesson.id}: empty ${field}`);
    }
    validateTiles(lesson.example, 14);
    assert.ok(decompositions(lesson.example).length, `${lesson.id}: no legal four-set-and-pair decomposition`);
  }
});

test('lesson examples demonstrate the declared teaching values without inventing a minimum-fan win', () => {
  const expectedFan = { chicken: 0, 'all-pungs': 3, 'half-flush': 3, 'full-flush': 7, dragons: 1, winds: 2 };
  for (const lesson of lessons) {
    const scores = decompositions(lesson.example).map(shape => patternsFor(shape.melds, shape.pair));
    assert.equal(Math.max(...scores.map(score => score.fan)), expectedFan[lesson.id], lesson.id);
    if (lesson.id !== 'chicken') assert.ok(scores.some(score => score[lesson.id]), lesson.id);
  }
  assert.match(lessons.find(lesson => lesson.id === 'chicken').detail, /cannot win/i);
  assert.match(lessons.find(lesson => lesson.id === 'dragons').detail, /below.*minimum/i);
  assert.match(lessons.find(lesson => lesson.id === 'winds').detail, /cannot win/i);
});

test('twelve unique scenarios have valid drawn-turn hands, fixed melds, and complete decision metadata', () => {
  assert.equal(scenarios.length, 12);
  assert.equal(new Set(scenarios.map(scenario => scenario.id)).size, scenarios.length);
  assert.equal(new Set(scenarios.map(scenario => scenario.title)).size, scenarios.length);
  for (const scenario of scenarios) {
    for (const field of ['id', 'title', 'stage', 'bestPattern', 'explanation', 'tradeoff', 'targetFan']) {
      assert.equal(typeof scenario[field], 'string');
      assert.ok(scenario[field].trim(), `${scenario.id}: empty ${field}`);
    }
    assert.ok(['Beginner', 'Intermediate'].includes(scenario.difficulty));
    assert.ok(winds.has(scenario.roundWind));
    assert.ok(winds.has(scenario.seatWind));
    assert.match(scenario.stage, /drawn turn/i);
    assert.match(scenario.stage, /three-fan minimum/i);
    assert.ok(Array.isArray(scenario.hand));
    assert.ok(Array.isArray(scenario.exposed));
    assert.ok(scenario.exposed.length <= 4);
    validateTiles([...scenario.hand, ...scenario.exposed.flat()], 14);
    assert.equal(scenario.hand.length, 14 - scenario.exposed.length * 3);
    for (const meld of scenario.exposed) {
      assert.ok(isPung(meld) || isSequence(meld), `${scenario.id}: invalid exposed meld`);
    }
    assert.ok(scenario.options.length >= 3);
    assert.equal(new Set(scenario.options.map(option => option.id)).size, scenario.options.length);
    for (const option of scenario.options) {
      assert.ok(lessonIds.includes(option.id));
      assert.equal(typeof option.label, 'string');
      assert.ok(option.label.trim());
    }
    assert.equal(scenario.options.filter(option => option.id === scenario.bestPattern).length, 1);
    assert.notEqual(scenario.bestPattern, 'chicken');
    assert.ok(scenario.discards.length > 0);
    assert.equal(new Set(scenario.discards).size, scenario.discards.length);
    for (const discard of scenario.discards) assert.ok(scenario.hand.includes(discard), scenario.id);
  }
});

test('each accepted discard retains a one-draw-away route to its target and at least three fan', () => {
  for (const scenario of scenarios) {
    for (const discard of scenario.discards) {
      const completions = completionsAfterDiscard(scenario, discard);
      const qualifying = completions.filter(({ patterns }) => patterns[scenario.bestPattern] && patterns.fan >= 3);
      assert.ok(qualifying.length > 0, `${scenario.id}: ${discard} has no qualifying completion`);
      assert.ok(new Set(qualifying.map(({ draw }) => draw)).size >= 2, `${scenario.id}: retain both useful pairs`);
      if (['dragons', 'winds'].includes(scenario.bestPattern)) {
        assert.ok(qualifying.every(({ patterns }) => patterns['all-pungs'] || patterns['half-flush']),
          `${scenario.id}: value sets need a qualifying foundation`);
      }
      assert.ok(completions.every(({ patterns }) => !(patterns['half-flush'] && patterns['full-flush'])));
    }
  }
});

test('curriculum includes both difficulties, exposed and concealed play, and additive honor targets', () => {
  assert.deepEqual(new Set(scenarios.map(scenario => scenario.difficulty)), new Set(['Beginner', 'Intermediate']));
  for (const id of lessonIds.filter(id => id !== 'chicken')) {
    assert.ok(scenarios.some(scenario => scenario.bestPattern === id), `Missing target: ${id}`);
  }
  assert.ok(scenarios.some(scenario => scenario.options.some(option => option.id === 'chicken')));
  assert.ok(scenarios.some(scenario => scenario.exposed.length === 0));
  assert.ok(scenarios.some(scenario => scenario.exposed.length > 0));
  const doubleWind = scenarios.find(scenario => scenario.roundWind === scenario.seatWind);
  assert.ok(doubleWind);
  const completions = completionsAfterDiscard(doubleWind, doubleWind.discards[0]);
  assert.ok(completions.some(({ patterns }) => patterns.winds && patterns['all-pungs'] && patterns.fan === 5));
  assert.ok(completions.some(({ patterns }) => patterns.winds && patterns.dragons && patterns.fan === 6));
});
