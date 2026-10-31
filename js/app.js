import { CATALOG, PROGRAMS, BOFA_TIERS } from './cards.js';
import { CATEGORIES, GRID, SPEND_CHOICES, catLabel, catNoun, placeFromGridItem } from './categories.js';
import * as E from './engine.js';
import * as S from './store.js';
import { nearbyPlaces, getPosition, formatDistance } from './places.js';

// ?date=2026-12-20 lets you preview how the app behaves on another day.
const params = new URLSearchParams(location.search);
const today = () => (params.get('date') ? E.parseISODate(params.get('date')) : new Date());

let state = S.load();
const ui = {
  view: 'pay',
  places: [],
  placesStatus: 'idle',
  placesError: '',
  showAllReminders: false,
  selected: null,
  gridItem: null,
  sheet: null,
  draft: null,
  lastSearch: 0,
};

const ctx = () => ({ date: today(), state });
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function persist() {
  if (!S.save(state)) toast('Couldn’t save. This browser is blocking storage.');
}

// ---------- card colors ----------
function inkFor(hex) {
  const n = parseInt((hex || '#5B6573').slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.6 ? '#1B222B' : '#FFFFFF';
}
function cardStyle(card) {
  const color = card.color || '#5B6573';
  return `--card:${color};--card-ink:${inkFor(color)};--card-accent:${card.accent || 'transparent'}`;
}
const swatch = card => `<span class="mini" style="${cardStyle(card)}" aria-hidden="true"></span>`;

// ---------- icons ----------
const ICON = {
  pay: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/></svg>',
  cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="9" rx="2"/><rect x="3" y="8" width="18" height="12" rx="2.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  locate: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ======================================================
// Pay screen
// ======================================================
function reminderHTML(r) {
  let actions = '';
  if (r.kind === 'setup') actions = `<button class="btn small" data-act="open-card" data-id="${r.cardId}">Set picks</button>`;
  if (r.kind === 'picks') {
    actions = `<button class="btn small" data-act="rem-confirm" data-id="${r.cardId}">Still the same</button>
      <button class="btn small ghost" data-act="open-card" data-id="${r.cardId}">Update</button>`;
  }
  if (r.kind === 'activate') {
    actions = `<button class="btn small" data-act="rem-activated" data-id="${r.cardId}" data-quarter="${r.quarter}">I activated it</button>
      <button class="btn small ghost" data-act="rem-hide" data-rid="${r.id}">Hide</button>`;
  }
  if (r.kind === 'missing') {
    actions = `<button class="btn small" data-act="edit-rot" data-id="${r.cardId}" data-quarter="${r.quarter}">Add</button>
      <button class="btn small ghost" data-act="rem-hide" data-rid="${r.id}">Hide</button>`;
  }
  return `<div class="reminder" data-kind="${r.kind}"><p>${esc(r.text)}</p><div class="rem-actions">${actions}</div></div>`;
}

// A neutral card outline shown while locating, on errors, or before a key is added.
function placeholderFace(title, text, extra = '') {
  return `<article class="cardface placeholder">
      <div class="cf-top"><span class="cf-name">${esc(title)}</span></div>
      <div class="cf-bottom"><div class="cf-where"><span class="cf-at">${esc(text)}</span></div></div>
    </article>${extra}`;
}

function heroWithoutPlace() {
  if (!state.settings.apiKey) {
    return placeholderFace('Which card', 'Pick what you’re buying below.',
      '<p class="why">To see the stores around you, add your Google Maps key in Settings.</p><button class="btn small" data-act="tab" data-view="settings">Add Maps key</button>');
  }
  const s = ui.placesStatus;
  if (s === 'locating' || s === 'idle') return placeholderFace('Which card', 'Finding where you are…');
  if (s === 'searching') return placeholderFace('Which card', 'Looking up places near you…');
  if (s === 'error') {
    return placeholderFace('Which card', 'Pick what you’re buying below.',
      `<p class="why error">${esc(ui.placesError)}</p><button class="btn small" data-act="refresh">Try again</button>`);
  }
  return placeholderFace('Which card', 'No businesses found right here. Pick what you’re buying below.');
}

function placeStrip() {
  if (ui.placesStatus !== 'done' || !ui.places.length) return '';
  const chips = ui.places.map((p, i) => {
    const on = ui.selected?.source === 'gps' && ui.selected.id === p.id;
    return `<button class="pchip${on ? ' is-on' : ''}" data-act="pick-place" data-i="${i}" aria-pressed="${on}">
      <span class="pchip-name">${esc(p.name)}</span><span class="pchip-meta">${formatDistance(p.distance)}, ${esc(catLabel(p.cats[0]))}</span></button>`;
  }).join('');
  return `<div class="nearby"><h2 class="h-small">${ui.selected?.source === 'gps' ? `Not at ${esc(ui.selected.name)}? Tap where you are` : 'Places near you'}</h2>
    <div class="pstrip">${chips}</div></div>`;
}

function resultHTML(place) {
  const c = ctx();
  const { results, blocked } = E.rank(place, state.wallet, c);
  if (!results.length) {
    return { hero: placeholderFace('Which card', 'Add your cards in My cards to get a recommendation.'), rest: '' };
  }
  const top = results[0];
  const sub = E.subline(top);
  const atLine = place.source === 'gps' || place.merchant ? `at ${place.name}` : `for ${catNoun(place.cats[0])}`;
  const catLine = place.source === 'gps' ? place.cats.map(catLabel).join(', ') : '';

  const notes = [...top.notes];
  if (place.note) notes.unshift({ kind: 'info', text: place.note });
  const ties = results.slice(1).filter(r => Math.abs(r.value - top.value) < 0.001);

  const runners = results.slice(1, 4).map(r => `<li>
      ${swatch(r.card)}
      <span class="rn-text"><span class="rn-name">${esc(r.card.name)}</span><span class="rn-why">${esc(r.why)}</span></span>
      <span class="rn-rate">${E.headline(r)}</span>
    </li>`).join('');

  const hero = `<article class="cardface${top.card.accent ? ' has-accent' : ''}" style="${cardStyle(top.card)}">
      <div class="cf-top"><span class="cf-name">${esc(top.card.name)}</span><span class="cf-net">${esc(top.card.network)}</span></div>
      <div class="cf-bottom">
        <div class="cf-where"><span class="cf-at">${esc(atLine)}</span>${catLine ? `<span class="cf-cat">${esc(catLine)}</span>` : ''}</div>
        <div class="cf-rate">${E.headline(top)}</div>
      </div>
    </article>
    <p class="why">${esc(top.why)}.${sub ? ` ${esc(sub[0].toUpperCase() + sub.slice(1))}.` : ''}${ties.length ? ` Tied with ${esc(ties.map(t => t.card.name).join(', '))}.` : ''}</p>
    ${notes.length ? `<ul class="notes">${notes.map(n => `<li class="${n.kind}">${esc(n.text)}</li>`).join('')}</ul>` : ''}`;

  const rest = `${runners ? `<h3 class="h-small">Next best</h3><ol class="runners">${runners}</ol>` : ''}
    ${blocked.length ? `<p class="hint">Not accepted here: ${esc(blocked.map(b => b.card.name).join(', '))}.</p>` : ''}`;
  return { hero, rest };
}

function gridHTML() {
  return `<div class="grid"><h2 class="h-small">${ui.places.length ? 'Or pick what you\'re buying' : 'What are you buying?'}</h2>
    ${GRID.map(g => `<div class="grid-group"><h3>${esc(g.title)}</h3><div class="chips">
      ${g.items.map(item => `<button class="chip${ui.gridItem === item ? ' is-on' : ''}" data-act="pick-grid" data-item="${item}" aria-pressed="${ui.gridItem === item}">${esc(catLabel(item))}</button>`).join('')}
    </div></div>`).join('')}
  </div>`;
}

function renderPay() {
  const rems = E.reminders(state.wallet, ctx());
  const shownRems = ui.showAllReminders ? rems : rems.slice(0, 2);
  const remBlock = rems.length ? `<div class="reminders"><h2 class="h-small">To do</h2>${shownRems.map(reminderHTML).join('')}
    ${rems.length > 2 ? `<button class="link" data-act="toggle-reminders">${ui.showAllReminders ? 'Show fewer' : `Show ${rems.length - 2} more`}</button>` : ''}</div>` : '';
  const r = ui.selected ? resultHTML(ui.selected) : { hero: heroWithoutPlace(), rest: '' };
  $('#view-pay').innerHTML = `<div id="result-slot" class="result">${r.hero}</div>${placeStrip()}${r.rest}${remBlock}${gridHTML()}`;
}

async function findPlaces() {
  if (!state.settings.apiKey) { renderPay(); return; }
  ui.placesStatus = 'locating';
  ui.lastSearch = Date.now();
  renderPay();
  try {
    const pos = await getPosition();
    ui.placesStatus = 'searching';
    renderPay();
    ui.places = await nearbyPlaces(state.settings.apiKey, pos, state.overrides);
    ui.placesStatus = 'done';
    if (ui.places.length) { ui.selected = ui.places[0]; ui.gridItem = null; }
  } catch (e) {
    ui.placesStatus = 'error';
    ui.placesError = e?.message || 'Something went wrong finding places.';
  }
  renderPay();
}

// ======================================================
// My cards
// ======================================================
function renderCards() {
  const c = ctx();
  const rems = E.reminders(state.wallet, c);
  const rows = state.wallet.map(entry => {
    const card = E.getCardDef(entry.id, state);
    if (!card) return '';
    const needs = rems.some(r => r.cardId === card.id);
    return `<li><button class="wallet-row" data-act="open-card" data-id="${card.id}">
      ${swatch(card)}
      <span class="wr-text"><span class="wr-name">${esc(card.name)}${needs ? '<span class="dot" title="Needs a look"></span>' : ''}</span>
      <span class="wr-sum">${esc(E.summarize(card, entry, c))}</span></span>
    </button></li>`;
  }).join('');
  $('#view-cards').innerHTML = `<div class="section-head"><h2>My cards</h2><button class="btn" data-act="add-card">Add card</button></div>
    ${rows ? `<ul class="wallet">${rows}</ul>` : '<p class="status">No cards yet. Add the cards you carry to get recommendations.</p>'}`;
}

// ---------- card detail sheet ----------
function choiceBlocks(card, entry, c) {
  const q = E.quarterOf(c.date);
  const sugg = E.suggest(state.wallet, c)[card.id] || {};
  const period = E.reminderPeriod(card, state.settings);
  const confirmed = E.parseISODate(entry.confirmedAt);
  const stale = E.picksComplete(card, entry) && (!confirmed || confirmed < E.periodStart(c.date, period));

  let h = '';
  for (const slot of card.choice.slots) {
    const picked = entry.picks?.[slot.id] || [];
    const s = sugg[slot.id];
    const same = s && s.picks.length === picked.length && s.picks.every(p => picked.includes(p));
    const sLabels = s ? s.picks.map(id => slot.options.find(o => o.id === id)?.label) : [];
    h += `<section class="block">
      <h3>${esc(slot.label)}${slot.pick > 1 ? ` (pick ${slot.pick})` : ''}</h3>
      <p class="hint">${card.choice.auto
        ? 'Citi gives 5% to whichever of these you spend the most on each billing cycle. Choose the one you plan to use this card for.'
        : `Tap what you picked on ${card.custom ? 'your bank’s' : `the ${esc(card.issuer)}`} site. The app can't change it there for you.`}</p>
      ${s ? `<div class="suggest">
        <p class="suggest-title">Suggested for ${E.quarterLabel(q)}: <strong>${esc(sLabels.join(' and '))}</strong></p>
        <ul>${s.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        ${s.covered.length ? `<p class="hint">Skipped: ${esc(s.covered.join('; '))}.</p>` : ''}
        ${same ? '<p class="hint ok">Matches your current picks.</p>' : `<button class="btn small" data-act="use-suggestion" data-id="${card.id}" data-slot="${slot.id}">Use ${slot.pick > 1 ? 'these' : 'this'}</button>`}
      </div>` : ''}
      <div class="chips">${slot.options.map(o => `<button class="chip${picked.includes(o.id) ? ' is-on' : ''}" data-act="toggle-pick" data-id="${card.id}" data-slot="${slot.id}" data-opt="${o.id}" aria-pressed="${picked.includes(o.id)}">${esc(o.label)}</button>`).join('')}</div>
      <p class="count">${picked.length} of ${slot.pick} picked</p>
      ${slot.note ? `<p class="hint">${esc(slot.note)}</p>` : ''}
    </section>`;
  }
  if (card.capNote) h += `<p class="hint">${esc(card.capNote)}</p>`;
  if (stale) h += `<button class="btn ghost wide" data-act="rem-confirm" data-id="${card.id}">These are still my picks</button>`;
  return h;
}

function rotatingBlock(card, entry, c, qKey, isNext) {
  const rot = E.rotatingFor(card, qKey, state);
  const title = `${isNext ? 'Next quarter' : '5% this quarter'} (${E.quarterLabel(qKey)})`;
  if (!rot) {
    return `<section class="block"><h3>${title}</h3>
      <p class="hint">${isNext ? 'Not announced or not added yet.' : 'Categories for this quarter aren’t loaded yet.'}</p>
      <button class="btn small ghost" data-act="edit-rot" data-id="${card.id}" data-quarter="${qKey}">Add categories</button></section>`;
  }
  const on = !!entry.activated?.[qKey];
  return `<section class="block"><h3>${title}</h3>
    <p>${esc(rot.label)}</p>
    ${rot.note ? `<p class="hint">${esc(rot.note)}</p>` : ''}
    <label class="check"><input type="checkbox" data-setting="activated" data-id="${card.id}" data-quarter="${qKey}"${on ? ' checked' : ''}>
      <span>I activated it${rot.activateBy ? ` (deadline ${E.shortDate(rot.activateBy)})` : ''}</span></label>
    ${rot.capNote ? `<p class="hint">${esc(rot.capNote)}</p>` : ''}
    <button class="link" data-act="edit-rot" data-id="${card.id}" data-quarter="${qKey}">Edit these categories</button></section>`;
}

function earnsBlock(card) {
  const unit = E.isPoints(card) ? 'x' : '%';
  const rows = [...(card.rules || [])].sort((a, b) => b.rate - a.rate).map(r => {
    const names = [...(r.merchants || []).map(m => catLabel(`m:${m}`)), ...(r.cats || []).map(catLabel)];
    return `<li><span class="earn-rate">${E.trimNum(r.rate)}${unit}</span><span>${esc(names.join(', '))}</span></li>`;
  });
  rows.push(`<li><span class="earn-rate">${E.trimNum(card.base)}${unit}</span><span>Everything else</span></li>`);
  const boost = card.boost === 'bofa' && state.settings.bofaTier
    ? `<p class="hint">Plus your BofA Rewards boost of ${state.settings.bofaTier}%.</p>` : '';
  const pts = E.isPoints(card) ? `<p class="hint">Earns ${esc(PROGRAMS[card.currency].label)}. Point value is set in Settings.</p>` : '';
  return `<section class="block"><h3>Earns</h3><ul class="earns">${rows.join('')}</ul>${boost}${pts}
    ${(card.notes || []).map(n => `<p class="hint">${esc(n)}</p>`).join('')}</section>`;
}

function cardSheetHTML(id) {
  const c = ctx();
  const card = E.getCardDef(id, state);
  const entry = S.entryFor(state, id);
  if (!card || !entry) return '<p class="status">This card is no longer in your list.</p>';
  const q = E.quarterOf(c.date);
  const nq = E.nextQuarterKey(c.date);
  const late = c.date.getMonth() % 3 === 2 && c.date.getDate() >= 15;
  const edited = !!state.cardEdits?.[id];
  const custom = state.customCards.some(cc => cc.id === id);

  let h = `<div class="sheet-card" style="${cardStyle(card)}"><span>${esc(card.name)}</span><span>${esc(card.network)}</span></div>`;
  if (card.choice) h += choiceBlocks(card, entry, c);
  if (card.rotating) {
    h += rotatingBlock(card, entry, c, q, false);
    if (late || E.rotatingFor(card, nq, state)) h += rotatingBlock(card, entry, c, nq, true);
  }
  h += earnsBlock(card);
  h += `<div class="sheet-actions">
    <button class="btn ghost" data-act="edit-card" data-id="${id}">Edit rates</button>
    ${edited && !custom ? `<button class="btn ghost" data-act="reset-card" data-id="${id}">Undo my rate edits</button>` : ''}
    <button class="btn danger" data-act="remove-card" data-id="${id}">Remove from my cards</button>
  </div>`;
  return h;
}

// ---------- add card sheet ----------
function addSheetHTML(query = '') {
  const inWallet = new Set(state.wallet.map(e => e.id));
  const all = [...state.customCards, ...CATALOG].filter(c => !inWallet.has(c.id));
  const qq = query.trim().toLowerCase();
  const list = qq ? all.filter(c => `${c.name} ${c.issuer} ${c.network}`.toLowerCase().includes(qq)) : all;
  return `<label class="field"><span>Search cards</span>
      <input type="search" id="card-search" value="${esc(query)}" placeholder="Card name or bank" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <ul class="wallet add-list">${list.map(card => `<li><button class="wallet-row" data-act="add-from-catalog" data-id="${card.id}">
      ${swatch(card)}<span class="wr-text"><span class="wr-name">${esc(card.name)}</span><span class="wr-sum">${esc(card.issuer)}, ${esc(card.network)}</span></span>
    </button></li>`).join('') || `<li class="status">No card matches “${esc(query)}”.</li>`}</ul>
    <p class="hint">Rates for cards not already in your list weren’t re-checked recently. After adding one, use Edit rates if anything is off.</p>
    <button class="btn wide" data-act="new-custom">Add a custom card</button>`;
}

// ---------- rotating editor ----------
const ROT_CATS = Object.keys(CATEGORIES).filter(k => k !== 'other');
const ROT_MERCHANTS = ['amazon', 'paypal', 'walmart', 'target', 'costco', 'whole_foods'];

function rotSheetHTML(cardId, qKey) {
  const card = E.getCardDef(cardId, state);
  const d = ui.draft;
  return `<p class="hint">Enter the 5% categories ${esc(card.issuer)} announced for ${E.quarterLabel(qKey)}. Check the ${esc(card.issuer)} app or site.</p>
    <h3 class="h-small">Categories</h3>
    <div class="chips">${ROT_CATS.map(k => `<button class="chip${d.cats.includes(k) ? ' is-on' : ''}" data-act="rot-toggle" data-kind="cats" data-key="${k}">${esc(catLabel(k))}</button>`).join('')}</div>
    <h3 class="h-small">Specific stores</h3>
    <div class="chips">${ROT_MERCHANTS.map(k => `<button class="chip${d.merchants.includes(k) ? ' is-on' : ''}" data-act="rot-toggle" data-kind="merchants" data-key="${k}">${esc(catLabel(`m:${k}`))}</button>`).join('')}</div>
    <label class="field"><span>Activation deadline (optional)</span><input type="date" data-draft="activateBy" value="${esc(d.activateBy || '')}"></label>
    <div class="sheet-actions">
      <button class="btn" data-act="save-rot">Save</button>
      ${state.rotatingOverrides?.[card.rotating]?.[qKey] ? '<button class="btn ghost" data-act="clear-rot">Remove my edit</button>' : ''}
    </div>`;
}

// ---------- card editor ----------
const NETWORKS = ['Visa', 'Mastercard', 'Amex', 'Discover', 'Store'];
const ALL_CATS = Object.keys(CATEGORIES).filter(k => k !== 'other');

function catSelect(selected, attrs) {
  return `<select multiple size="5" ${attrs}>${ALL_CATS.map(k => `<option value="${k}"${selected.includes(k) ? ' selected' : ''}>${esc(catLabel(k))}</option>`).join('')}</select>`;
}

function editorHTML() {
  const d = ui.draft;
  const builtInChoice = d.keepChoice || d.rotating;
  return `<label class="field"><span>Card name</span><input type="text" data-draft="name" value="${esc(d.name)}" autocomplete="off"></label>
    <div class="row2">
      <label class="field"><span>Network</span><select data-draft="network">${NETWORKS.map(n => `<option${d.network === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Rewards</span><select data-draft="currency">${Object.entries(PROGRAMS).map(([k, p]) => `<option value="${k}"${d.currency === k ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label>
    </div>
    <label class="field"><span>Rate on everything else (% or points per $)</span><input type="number" inputmode="decimal" step="0.25" min="0" max="20" data-draft="base" value="${esc(d.base)}"></label>
    <h3 class="h-small">Bonus categories</h3>
    ${d.rules.map((r, i) => `<div class="rule-row">
      <label class="field rate"><span>Rate</span><input type="number" inputmode="decimal" step="0.25" min="0" max="20" data-rule="${i}" data-field="rate" value="${esc(r.rate)}"></label>
      <label class="field grow"><span>Categories</span>${catSelect(r.cats, `data-rule="${i}" data-field="cats"`)}</label>
      <button class="icon-btn" data-act="remove-rule" data-i="${i}" aria-label="Remove this bonus">${ICON.close}</button>
    </div>`).join('')}
    <button class="btn small ghost" data-act="add-rule">Add a bonus category</button>
    ${builtInChoice ? '<p class="hint">This card’s pick and rotating setup stays as it is.</p>' : `
    <label class="check"><input type="checkbox" data-draft="hasChoice"${d.hasChoice ? ' checked' : ''}><span>Lets me choose bonus categories</span></label>
    ${d.hasChoice ? `<div class="choice-box">
      <div class="row2">
        <label class="field"><span>Bonus rate</span><input type="number" inputmode="decimal" step="0.25" data-draft="choiceRate" value="${esc(d.choiceRate)}"></label>
        <label class="field"><span>How many picks</span><input type="number" inputmode="numeric" min="1" max="5" data-draft="choicePick" value="${esc(d.choicePick)}"></label>
      </div>
      <label class="field"><span>Can change picks</span><select data-draft="choicePeriod">
        <option value="quarter"${d.choicePeriod === 'quarter' ? ' selected' : ''}>Every quarter</option>
        <option value="month"${d.choicePeriod === 'month' ? ' selected' : ''}>Every month</option></select></label>
      <label class="field"><span>Categories you can pick from</span>${catSelect(d.choiceOptions, 'data-draft="choiceOptions"')}</label>
    </div>` : ''}`}
    <div class="sheet-actions"><button class="btn" data-act="save-card">Save card</button></div>`;
}

function draftFromCard(card) {
  if (!card) {
    return { id: null, name: '', network: 'Visa', currency: 'cash', base: 1, rules: [], hasChoice: false, choiceRate: 5, choicePick: 1, choicePeriod: 'quarter', choiceOptions: [] };
  }
  const isCustom = state.customCards.some(c => c.id === card.id);
  const simpleChoice = isCustom && card.choice;
  return {
    id: card.id, name: card.name, network: card.network, currency: card.currency, base: card.base,
    rules: (card.rules || []).map(r => ({ rate: r.rate, cats: [...(r.cats || [])], merchants: [...(r.merchants || [])] })),
    hasChoice: !!simpleChoice,
    choiceRate: simpleChoice ? card.choice.slots[0].rate : 5,
    choicePick: simpleChoice ? card.choice.slots[0].pick : 1,
    choicePeriod: simpleChoice ? card.choice.period : 'quarter',
    choiceOptions: simpleChoice ? card.choice.slots[0].options.map(o => o.id) : [],
    keepChoice: !isCustom && !!card.choice,
    rotating: !!card.rotating,
  };
}

function saveDraft() {
  const d = ui.draft;
  const name = String(d.name || '').trim();
  if (!name) { toast('Give the card a name.'); return; }
  const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback);
  const rules = d.rules
    .map(r => ({ rate: num(r.rate, 0), cats: r.cats, merchants: r.merchants || [] }))
    .filter(r => r.rate > 0 && (r.cats.length || r.merchants.length));

  const original = d.id ? E.getCardDef(d.id, state) : null;
  const isCustom = !d.id || state.customCards.some(c => c.id === d.id);
  const def = {
    ...(original || {}),
    id: d.id || `custom-${Date.now().toString(36)}`,
    name, network: d.network, currency: d.currency,
    base: num(d.base, 1), rules,
    issuer: original?.issuer || name.split(' ')[0],
    color: original?.color || '#56606C',
  };
  if (isCustom) {
    delete def.choice;
    if (d.hasChoice && d.choiceOptions.length) {
      def.choice = {
        period: d.choicePeriod,
        slots: [{
          id: 'picks', label: `${num(d.choiceRate, 5)}${PROGRAMS[d.currency]?.points ? 'x' : '%'} categories`,
          pick: Math.max(1, Math.min(5, Math.round(num(d.choicePick, 1)))), rate: num(d.choiceRate, 5),
          options: d.choiceOptions.map(k => ({ id: k, label: catLabel(k), cats: [k] })),
        }],
      };
    }
    def.custom = true;
    const i = state.customCards.findIndex(c => c.id === def.id);
    if (i >= 0) state.customCards[i] = def; else state.customCards.push(def);
    S.addToWallet(state, def.id);
  } else {
    state.cardEdits = { ...state.cardEdits, [def.id]: def };
  }
  persist();
  toast(`Saved ${name}.`);
  openSheet({ type: 'card', id: def.id });
  rerender();
}

// ======================================================
// Settings
// ======================================================
function renderSettings() {
  const st = state.settings;
  const programsInWallet = [...new Set(state.wallet.map(e => E.getCardDef(e.id, state)?.currency).filter(cur => PROGRAMS[cur]?.points))];
  const spend = new Set(st.spendCats || []);

  $('#view-settings').innerHTML = `<h2 class="section-title">Settings</h2>
  <section class="block">
    <h3>Google Maps key</h3>
    <p class="hint">Used only to look up the businesses around you. It stays on this phone.</p>
    <label class="field"><span>API key</span><input type="text" id="api-key" value="${esc(st.apiKey)}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your key"></label>
    <button class="btn small" data-act="save-key">Save key</button>
    <details class="howto"><summary>How to get a key</summary><ol>
      <li>Open <a href="https://console.cloud.google.com/google/maps-apis/overview" target="_blank" rel="noopener">Google Maps Platform</a>, create a project and add a billing account. Personal use normally stays inside Google’s free monthly allowance.</li>
      <li>Turn on <b>Maps JavaScript API</b> and <b>Places API (New)</b>.</li>
      <li>Create an API key. Under restrictions, allow only websites and add your app’s address, for example <code>https://yourname.github.io/*</code>.</li>
      <li>Paste the key here and tap Save key.</li>
    </ol></details>
  </section>

  <section class="block">
    <h3>Bank of America Rewards boost</h3>
    <p class="hint">Applies to both BofA cards. Pick the % shown on your BofA rewards page.</p>
    <label class="field"><span>Your boost</span><select data-setting="bofaTier">${BOFA_TIERS.map(t => `<option value="${t.value}"${Number(st.bofaTier) === t.value ? ' selected' : ''}>${esc(t.label)}</option>`).join('')}</select></label>
    <label class="field"><span>Remind me to check my BofA 3% pick</span><select data-setting="bofaReminder">
      <option value="quarter"${st.bofaReminder !== 'month' ? ' selected' : ''}>Every quarter</option>
      <option value="month"${st.bofaReminder === 'month' ? ' selected' : ''}>Every month</option></select></label>
  </section>

  ${programsInWallet.length ? `<section class="block">
    <h3>What a point is worth</h3>
    <p class="hint">Used to compare points cards with cash back. 1¢ is the plain cash value; set it higher if you transfer points to airlines or hotels.</p>
    ${programsInWallet.map(p => `<label class="field inline"><span>${esc(PROGRAMS[p].label)}</span>
      <span class="with-unit"><input type="number" inputmode="decimal" step="0.05" min="0.5" max="3" data-setting="pointValue" data-program="${p}" value="${esc(st.pointValues?.[p] ?? 1)}"><span>¢</span></span></label>`).join('')}
  </section>` : ''}

  <section class="block">
    <h3>What you spend on most</h3>
    <p class="hint">Category suggestions for Cash+, Custom Cash and BofA favor these.</p>
    <div class="chips">${SPEND_CHOICES.map(k => `<button class="chip${spend.has(k) ? ' is-on' : ''}" data-act="toggle-spend" data-key="${k}" aria-pressed="${spend.has(k)}">${esc(catLabel(k))}</button>`).join('')}</div>
  </section>

  <section class="block">
    <h3>Store fixes</h3>
    <p class="hint">If a store keeps showing the wrong category, tell the app what it is. Costco, Walmart, Target, Whole Foods and other big chains are already handled.</p>
    ${state.overrides.length ? `<ul class="fixes">${state.overrides.map((f, i) => `<li><span>“${esc(f.text)}” is ${esc(catLabel(f.cat))}</span><button class="link" data-act="remove-fix" data-i="${i}">Remove</button></li>`).join('')}</ul>` : ''}
    <div class="row2">
      <label class="field"><span>Store name contains</span><input type="text" id="fix-text" autocomplete="off" placeholder="e.g. Giant"></label>
      <label class="field"><span>Treat it as</span><select id="fix-cat">${ALL_CATS.map(k => `<option value="${k}">${esc(catLabel(k))}</option>`).join('')}</select></label>
    </div>
    <button class="btn small ghost" data-act="add-fix">Add store fix</button>
  </section>

  <section class="block">
    <h3>Backup</h3>
    <p class="hint">Your cards and picks are saved only on this phone. Save a backup before switching phones or clearing browser data.</p>
    <div class="sheet-actions">
      <button class="btn ghost" data-act="export">Save backup file</button>
      <label class="btn ghost file-btn">Restore from backup<input type="file" accept="application/json,.json" id="import-file"></label>
    </div>
  </section>

  <section class="block">
    <h3>About</h3>
    <p class="hint">Rates for your cards were checked in October 2026. Chase Freedom and Discover categories are loaded through December 2026; add later quarters from My cards when they’re announced.</p>
    <button class="btn danger small" data-act="reset-all">Start over</button>
  </section>`;
}

// ======================================================
// Sheet + routing
// ======================================================
function openSheet(sheet) {
  ui.sheet = sheet;
  renderSheet();
  const el = $('#sheet');
  if (el.hidden) {
    el.hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => el.classList.add('open'));
  }
}

function closeSheet() {
  const el = $('#sheet');
  el.classList.remove('open');
  document.body.classList.remove('sheet-open');
  ui.sheet = null;
  ui.draft = null;
  setTimeout(() => { if (!ui.sheet) el.hidden = true; }, reduceMotion() ? 0 : 220);
  rerender();
}

function renderSheet(keepScroll = true) {
  const s = ui.sheet;
  if (!s) return;
  const body = $('#sheet .sheet-body');
  const scroll = body.scrollTop;
  let title = '';
  let html = '';
  if (s.type === 'card') { title = 'Card details'; html = cardSheetHTML(s.id); }
  if (s.type === 'add') { title = 'Add a card'; html = addSheetHTML(s.query || ''); }
  if (s.type === 'rot') { title = `5% categories for ${E.quarterLabel(s.quarter)}`; html = rotSheetHTML(s.id, s.quarter); }
  if (s.type === 'edit') { title = ui.draft?.id ? 'Edit rates' : 'Add a custom card'; html = editorHTML(); }
  $('#sheet-title').textContent = title;
  body.innerHTML = html;
  if (keepScroll) body.scrollTop = scroll;
}

function setView(view) {
  ui.view = view;
  for (const v of ['pay', 'cards', 'settings']) $(`#view-${v}`).hidden = v !== view;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  $('#refresh').hidden = view !== 'pay';
  rerender();
  window.scrollTo(0, 0);
}

function rerender() {
  if (ui.view === 'pay') renderPay();
  if (ui.view === 'cards') renderCards();
  if (ui.view === 'settings') renderSettings();
}

function scrollToResult() {
  const el = $('#result-slot');
  if (el) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
}

// ======================================================
// Events
// ======================================================
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const c = ctx();

  switch (act) {
    case 'tab': setView(el.dataset.view); break;
    case 'refresh': findPlaces(); break;
    case 'toggle-reminders': ui.showAllReminders = !ui.showAllReminders; renderPay(); break;
    case 'pick-place':
      ui.selected = ui.places[Number(el.dataset.i)];
      ui.gridItem = null;
      renderPay();
      scrollToResult();
      break;
    case 'pick-grid':
      ui.gridItem = el.dataset.item;
      ui.selected = placeFromGridItem(el.dataset.item);
      renderPay();
      scrollToResult();
      break;

    case 'rem-confirm':
      S.confirmPicks(state, id, c.date); persist(); toast('Got it. Picks confirmed.');
      if (ui.sheet) renderSheet(); rerender(); break;
    case 'rem-activated':
      S.setActivated(state, id, el.dataset.quarter, true); persist(); toast('Marked as activated.'); rerender(); break;
    case 'rem-hide':
      S.dismiss(state, el.dataset.rid); persist(); rerender(); break;

    case 'add-card': openSheet({ type: 'add', query: '' }); break;
    case 'add-from-catalog': {
      S.addToWallet(state, id); persist();
      const card = E.getCardDef(id, state);
      toast(`Added ${card.name}.`);
      if (card.choice || card.rotating) openSheet({ type: 'card', id }); else renderSheet();
      rerender();
      break;
    }
    case 'new-custom': ui.draft = draftFromCard(null); openSheet({ type: 'edit' }); break;
    case 'open-card': openSheet({ type: 'card', id }); break;

    case 'toggle-pick': {
      const card = E.getCardDef(id, state);
      const slot = card.choice.slots.find(s => s.id === el.dataset.slot);
      const entry = S.entryFor(state, id);
      let picks = [...(entry.picks?.[slot.id] || [])];
      const opt = el.dataset.opt;
      if (picks.includes(opt)) picks = picks.filter(p => p !== opt);
      else { picks.push(opt); if (picks.length > slot.pick) picks = picks.slice(picks.length - slot.pick); }
      S.setPicks(state, id, slot.id, picks, c.date); persist();
      renderSheet(); rerender();
      break;
    }
    case 'use-suggestion': {
      const s = E.suggest(state.wallet, c)[id]?.[el.dataset.slot];
      if (s) {
        S.setPicks(state, id, el.dataset.slot, s.picks, c.date); persist();
        const card = E.getCardDef(id, state);
        toast(card.choice.auto ? 'Saved.' : `Saved. Make the same picks on the ${card.issuer} site.`);
        renderSheet(); rerender();
      }
      break;
    }

    case 'edit-rot': {
      const card = E.getCardDef(id, state);
      const existing = E.rotatingFor(card, el.dataset.quarter, state);
      ui.draft = { cardId: id, rotKey: card.rotating, quarter: el.dataset.quarter, cats: [...(existing?.cats || [])], merchants: [...(existing?.merchants || [])], activateBy: existing?.activateBy || '' };
      openSheet({ type: 'rot', id, quarter: el.dataset.quarter });
      break;
    }
    case 'rot-toggle': {
      const list = ui.draft[el.dataset.kind];
      const k = el.dataset.key;
      ui.draft[el.dataset.kind] = list.includes(k) ? list.filter(x => x !== k) : [...list, k];
      renderSheet();
      break;
    }
    case 'save-rot': {
      const d = ui.draft;
      if (!d.cats.length && !d.merchants.length) { toast('Pick at least one category.'); break; }
      if (d.cats.includes('dining') && !d.cats.includes('fast_food')) d.cats.push('fast_food');
      const label = [...d.cats.filter(k => k !== 'fast_food' || !d.cats.includes('dining')).map(catLabel), ...d.merchants.map(m => catLabel(`m:${m}`))].join(', ');
      state.rotatingOverrides = { ...state.rotatingOverrides, [d.rotKey]: { ...(state.rotatingOverrides?.[d.rotKey] || {}), [d.quarter]: { label, cats: d.cats, merchants: d.merchants, activateBy: d.activateBy || null } } };
      persist(); toast('Categories saved.');
      openSheet({ type: 'card', id: d.cardId }); rerender();
      break;
    }
    case 'clear-rot': {
      const d = ui.draft;
      const copy = { ...(state.rotatingOverrides?.[d.rotKey] || {}) };
      delete copy[d.quarter];
      state.rotatingOverrides = { ...state.rotatingOverrides, [d.rotKey]: copy };
      persist(); toast('Back to the built-in categories.');
      openSheet({ type: 'card', id: d.cardId }); rerender();
      break;
    }

    case 'edit-card': ui.draft = draftFromCard(E.getCardDef(id, state)); openSheet({ type: 'edit' }); break;
    case 'add-rule': ui.draft.rules.push({ rate: 3, cats: [], merchants: [] }); renderSheet(); break;
    case 'remove-rule': ui.draft.rules.splice(Number(el.dataset.i), 1); renderSheet(); break;
    case 'save-card': saveDraft(); break;
    case 'reset-card': {
      const copy = { ...state.cardEdits }; delete copy[id]; state.cardEdits = copy;
      persist(); toast('Back to the built-in rates.'); renderSheet(); rerender();
      break;
    }
    case 'remove-card': {
      const card = E.getCardDef(id, state);
      if (confirm(`Remove ${card.name} from your cards?`)) {
        S.removeFromWallet(state, id); persist(); toast(`Removed ${card.name}.`); closeSheet();
      }
      break;
    }
    case 'close-sheet': closeSheet(); break;

    case 'save-key': {
      const key = $('#api-key').value.trim();
      const changed = key !== state.settings.apiKey;
      state.settings.apiKey = key; persist();
      toast(key ? 'Key saved.' : 'Key removed.');
      if (changed && key) {
        if (window.google?.maps) { toast('Key saved. Close and reopen the app to use it.'); break; }
        setView('pay'); findPlaces();
      }
      break;
    }
    case 'toggle-spend': {
      const k = el.dataset.key;
      const set = new Set(state.settings.spendCats || []);
      set.has(k) ? set.delete(k) : set.add(k);
      state.settings.spendCats = [...set]; persist(); renderSettings();
      break;
    }
    case 'add-fix': {
      const text = $('#fix-text').value.trim();
      if (!text) { toast('Type part of the store’s name.'); break; }
      state.overrides.push({ text, cat: $('#fix-cat').value }); persist();
      toast('Store fix added. It applies next time places load.'); renderSettings();
      break;
    }
    case 'remove-fix': state.overrides.splice(Number(el.dataset.i), 1); persist(); renderSettings(); break;
    case 'export': {
      const blob = new Blob([S.exportJSON(state)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `which-card-backup-${E.isoDate(new Date())}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      break;
    }
    case 'reset-all':
      if (confirm('Start over? This removes your picks, edits and settings on this phone.')) {
        state = S.defaultState(); persist(); toast('Started over.'); setView('pay');
      }
      break;
    default: break;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'import-file' && el.files?.[0]) {
    el.files[0].text().then(text => {
      try { state = S.importJSON(text); persist(); toast('Backup restored.'); rerender(); } catch (err) { toast(err.message || 'That file couldn’t be read.'); }
    });
    return;
  }
  const setting = el.dataset.setting;
  if (setting === 'activated') {
    S.setActivated(state, el.dataset.id, el.dataset.quarter, el.checked); persist(); rerender();
    return;
  }
  if (setting === 'bofaTier') { state.settings.bofaTier = Number(el.value); persist(); return; }
  if (setting === 'bofaReminder') { state.settings.bofaReminder = el.value; persist(); return; }
  if (setting === 'pointValue') {
    const v = Number(el.value);
    if (v > 0) { state.settings.pointValues = { ...state.settings.pointValues, [el.dataset.program]: v }; persist(); }
    return;
  }
  if (ui.draft && (el.dataset.draft || el.dataset.rule !== undefined)) {
    readDraftField(el);
    if (el.dataset.draft === 'hasChoice') renderSheet();
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'card-search' && ui.sheet?.type === 'add') {
    ui.sheet.query = el.value;
    const pos = el.selectionStart;
    renderSheet();
    const again = $('#card-search');
    again.focus();
    try { again.setSelectionRange(pos, pos); } catch { /* search inputs may not support it */ }
    return;
  }
  if (ui.draft && (el.dataset.draft || el.dataset.rule !== undefined) && el.type !== 'checkbox' && !el.multiple) readDraftField(el);
});

function readDraftField(el) {
  const d = ui.draft;
  const value = el.type === 'checkbox' ? el.checked : el.multiple ? [...el.selectedOptions].map(o => o.value) : el.value;
  if (el.dataset.rule !== undefined) d.rules[Number(el.dataset.rule)][el.dataset.field] = value;
  else d[el.dataset.draft] = value;
}

$('#sheet').addEventListener('click', e => { if (e.target.classList.contains('sheet-backdrop')) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });

// Re-check location when the app comes back to the front (e.g. you open it at a store).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.settings.apiKey && Date.now() - ui.lastSearch > 60000) {
    ui.gridItem = null;
    if (ui.view === 'pay') findPlaces();
  }
});

// ---------- start ----------
function init() {
  document.querySelectorAll('.tabs button').forEach(b => { b.insertAdjacentHTML('afterbegin', ICON[b.dataset.view]); });
  $('#refresh').innerHTML = ICON.locate;
  $('#sheet-close').innerHTML = ICON.close;
  persist();
  setView('pay');
  findPlaces();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
init();
