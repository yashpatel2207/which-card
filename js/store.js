// Everything the app remembers lives in this one object, saved in the phone's browser storage.
import { STARTER_WALLET } from './cards.js';
import { isoDate } from './engine.js';

const KEY = 'whichcard:v1';

export function defaultState() {
  return {
    version: 1,
    wallet: STARTER_WALLET.map(id => ({ id, picks: {}, activated: {}, confirmedAt: null })),
    customCards: [],
    cardEdits: {},
    rotatingOverrides: {},
    overrides: [],
    dismissed: {},
    settings: {
      apiKey: '',
      bofaTier: 0,
      bofaReminder: 'quarter',
      pointValues: { chase_ur: 1, citi_ty: 1, c1_miles: 1, amex_mr: 1, wf_points: 1 },
      spendCats: ['grocery', 'dining', 'gas', 'drugstore', 'streaming', 'phone', 'internet', 'utilities', 'online'],
    },
  };
}

let memoryCopy = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch { /* storage blocked or corrupt: fall back below */ }
  return memoryCopy ? merge(memoryCopy) : defaultState();
}

export function save(state) {
  memoryCopy = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

function merge(saved) {
  const d = defaultState();
  return {
    ...d, ...saved,
    settings: { ...d.settings, ...(saved.settings || {}), pointValues: { ...d.settings.pointValues, ...(saved.settings?.pointValues || {}) } },
  };
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.wallet)) throw new Error('This file is not a Which Card backup.');
  return merge(parsed);
}

// ---------- small state helpers ----------
export function entryFor(state, id) {
  return state.wallet.find(e => e.id === id);
}

export function addToWallet(state, id) {
  if (!entryFor(state, id)) state.wallet.push({ id, picks: {}, activated: {}, confirmedAt: null });
}

export function removeFromWallet(state, id) {
  state.wallet = state.wallet.filter(e => e.id !== id);
}

export function setPicks(state, id, slotId, picks, today = new Date()) {
  const e = entryFor(state, id);
  if (!e) return;
  e.picks = { ...e.picks, [slotId]: picks };
  e.confirmedAt = isoDate(today);
}

export function confirmPicks(state, id, today = new Date()) {
  const e = entryFor(state, id);
  if (e) e.confirmedAt = isoDate(today);
}

export function setActivated(state, id, quarter, on = true) {
  const e = entryFor(state, id);
  if (e) e.activated = { ...e.activated, [quarter]: on };
}

export function dismiss(state, reminderId) {
  state.dismissed = { ...state.dismissed, [reminderId]: true };
}
