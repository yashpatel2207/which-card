import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { defaultState, setPicks, setActivated } from '../js/store.js';
import { categorize } from '../js/places.js';
import { placeFromGridItem } from '../js/categories.js';

const Q4 = new Date(2026, 9, 31); // Oct 31, 2026
const ctxFor = (state, date = Q4) => ({ state, date });
const best = (state, place, date) => E.rank(place, state.wallet, ctxFor(state, date)).results[0];
const grocery = { name: 'Giant Food', cats: ['grocery'], merchant: null, networks: null };

test('grocery in Q4 2026: Chase Freedom 5% wins', () => {
  const s = defaultState();
  const r = best(s, grocery);
  assert.equal(r.card.id, 'chase-freedom');
  assert.equal(r.rate, 5);
  assert.ok(r.notes.some(n => n.kind === 'warn'), 'warns to activate');
});

test('activation removes the warning', () => {
  const s = defaultState();
  setActivated(s, 'chase-freedom', '2026-Q4');
  const r = best(s, grocery);
  assert.ok(!r.notes.some(n => n.kind === 'warn'));
});

test('Freedom 5% ends after the quarter if no data', () => {
  const s = defaultState();
  const r = best(s, grocery, new Date(2027, 0, 10));
  assert.notEqual(r.card.id, 'chase-freedom');
  assert.equal(r.value, 3); // Strata Premier 3x or Amex 3%
});

test('Costco: only Visa cards count', () => {
  const s = defaultState();
  const place = { name: 'Costco', ...categorize('Costco Wholesale', ['warehouse_store']) };
  const { results, blocked } = E.rank(place, s.wallet, ctxFor(s));
  assert.ok(results.every(r => r.card.network === 'Visa'));
  assert.ok(blocked.some(b => b.card.id === 'amex-blue-cash-everyday'));
  assert.equal(results[0].card.id, 'bofa-customized-cash'); // 2% wholesale clubs
});

test('Costco gas station is gas, still Visa only', () => {
  const info = categorize('Costco Gas Station', ['gas_station']);
  assert.deepEqual(info.cats, ['gas']);
  assert.deepEqual(info.networks, ['Visa']);
});

test('BofA boost multiplies rates', () => {
  const s = defaultState();
  s.settings.bofaTier = 75;
  setPicks(s, 'bofa-customized-cash', 'three', ['online'], Q4);
  const r = best(s, placeFromGridItem('streaming'));
  assert.equal(r.card.id, 'bofa-customized-cash');
  assert.equal(Math.round(r.value * 100) / 100, 5.25);
  assert.equal(E.headline(r), '5.25%');
});

test('Cash+ picks apply at 5%', () => {
  const s = defaultState();
  setPicks(s, 'usbank-cash-plus', 'five', ['department', 'electronics'], Q4);
  const r = best(s, placeFromGridItem('department'));
  assert.equal(r.card.id, 'usbank-cash-plus');
  assert.equal(r.rate, 5);
});

test('point value changes the ranking', () => {
  const s = defaultState();
  const other = placeFromGridItem('other');
  assert.equal(best(s, other).card.id, 'c1-venture-x'); // 2x at 1c beats 1.5%
  s.settings.pointValues.c1_miles = 0.5;
  s.settings.pointValues.chase_ur = 1.5;
  assert.equal(best(s, other).card.id, 'chase-freedom-unlimited'); // 1.5x at 1.5c = 2.25%
});

test('Amazon: Amazon Visa or Amex both 3%', () => {
  const s = defaultState();
  const r = best(s, placeFromGridItem('m:amazon'));
  assert.equal(r.value, 3);
});

test('Walmart is not a grocery store for Freedom', () => {
  const s = defaultState();
  const place = { name: 'Walmart Supercenter', ...categorize('Walmart Supercenter', ['supermarket', 'department_store']) };
  assert.deepEqual(place.cats, ['superstore']);
  const r = best(s, place);
  assert.notEqual(r.card.id, 'chase-freedom');
});

test('Freedom Flex stacks rotating on top of 3% dining', () => {
  const s = defaultState();
  s.wallet.push({ id: 'chase-freedom-flex', picks: {}, activated: { '2026-Q4': true }, confirmedAt: null });
  const r = best(s, placeFromGridItem('dining'));
  assert.equal(r.card.id, 'chase-freedom-flex');
  assert.equal(r.rate, 7);
});

test('suggestions avoid categories already at 5% this quarter', () => {
  const s = defaultState();
  s.settings.spendCats = ['grocery', 'dining', 'fast_food', 'utilities', 'phone', 'internet', 'streaming', 'drugstore', 'department', 'gas'];
  const sug = E.suggest(s.wallet, ctxFor(s));
  const five = sug['usbank-cash-plus'].five.picks;
  assert.equal(five.length, 2);
  assert.ok(!five.includes('utilities'), 'Discover already pays 5% on utilities');
  assert.ok(!five.includes('fast_food'), 'Freedom and Discover already pay 5% on restaurants');
  assert.ok(five.includes('department'));
  const cc = sug['citi-custom-cash'].top.picks;
  assert.equal(cc.length, 1);
  assert.notEqual(cc[0], 'dining');
  assert.notEqual(cc[0], 'grocery');
  const bofa = sug['bofa-customized-cash'].three.picks;
  assert.equal(bofa.length, 1);
  console.log('Cash+ 5%:', five, 'Cash+ 2%:', sug['usbank-cash-plus'].two.picks, 'Custom Cash:', cc, 'BofA:', bofa);
  console.log(sug['usbank-cash-plus'].five.reasons, sug['usbank-cash-plus'].five.covered);
});

test('reminders: first run asks for picks and activation', () => {
  const s = defaultState();
  const r = E.reminders(s.wallet, ctxFor(s));
  const kinds = r.map(x => `${x.kind}:${x.cardId}`);
  assert.ok(kinds.includes('setup:usbank-cash-plus'));
  assert.ok(kinds.includes('setup:bofa-customized-cash'));
  assert.ok(kinds.includes('setup:citi-custom-cash'));
  assert.ok(kinds.includes('activate:chase-freedom'));
  assert.ok(kinds.includes('activate:discover-it'));
});

test('reminders: quarterly check appears once a new quarter starts, then clears', () => {
  const s = defaultState();
  setPicks(s, 'usbank-cash-plus', 'five', ['department', 'tv'], Q4);
  setPicks(s, 'usbank-cash-plus', 'two', ['gas'], Q4);
  const ids = d => E.reminders(s.wallet, ctxFor(s, d)).filter(r => r.cardId === 'usbank-cash-plus').map(r => r.kind);
  assert.deepEqual(ids(new Date(2026, 10, 20)), []);           // same quarter: nothing
  assert.deepEqual(ids(new Date(2027, 0, 3)), ['picks']);       // new quarter: one check
  s.wallet.find(e => e.id === 'usbank-cash-plus').confirmedAt = '2027-01-03';
  assert.deepEqual(ids(new Date(2027, 0, 20)), []);             // confirmed: gone
});

test('reminders: BofA monthly setting', () => {
  const s = defaultState();
  setPicks(s, 'bofa-customized-cash', 'three', ['online'], Q4);
  const has = d => E.reminders(s.wallet, ctxFor(s, d)).some(r => r.cardId === 'bofa-customized-cash');
  assert.equal(has(new Date(2026, 11, 2)), false); // Dec, same quarter
  s.settings.bofaReminder = 'month';
  assert.equal(has(new Date(2026, 11, 2)), true);  // Dec is a new month
});

test('reminders: late in quarter asks to add next quarter', () => {
  const s = defaultState();
  setActivated(s, 'chase-freedom', '2026-Q4');
  const r = E.reminders(s.wallet, ctxFor(s, new Date(2026, 11, 18))).filter(x => x.cardId === 'chase-freedom');
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'missing');
  assert.equal(r[0].quarter, '2027-Q1');
});

test('user-entered quarter works', () => {
  const s = defaultState();
  s.rotatingOverrides = { 'chase-freedom': { '2027-Q1': { label: 'Gas', cats: ['gas'], merchants: [] } } };
  const r = best(s, placeFromGridItem('gas'), new Date(2027, 1, 1));
  assert.equal(r.card.id, 'chase-freedom');
  assert.equal(r.rate, 5);
});

test('categorize maps Google types', () => {
  assert.deepEqual(categorize('Chipotle Mexican Grill', ['mexican_restaurant', 'restaurant']).cats, ['fast_food']);
  assert.deepEqual(categorize('Joe\'s Thai', ['thai_restaurant', 'restaurant']).cats, ['dining']);
  assert.deepEqual(categorize('Shell', ['gas_station', 'convenience_store']).cats, ['gas']);
  assert.deepEqual(categorize('Random Shop', ['store']).cats, ['other']);
  assert.deepEqual(categorize('Giant Food', ['supermarket'], [{ text: 'giant', cat: 'drugstore' }]).cats, ['drugstore']);
});

test('summaries read cleanly', () => {
  const s = defaultState();
  for (const e of s.wallet) {
    const card = E.getCardDef(e.id, s);
    const text = E.summarize(card, e, ctxFor(s));
    assert.ok(text.length > 10);
  }
  console.log(E.summarize(E.getCardDef('chase-sapphire-preferred', s), s.wallet[2], ctxFor(s)));
});
